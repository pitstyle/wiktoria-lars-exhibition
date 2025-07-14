#!/bin/bash

# Raspberry Pi Setup Script for Wiktoria-Lars Exhibition
# This script automates the setup process on a fresh Raspberry Pi

set -e

echo "🥧 Starting Raspberry Pi Setup for Wiktoria-Lars Exhibition..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Check if running on Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo; then
    print_warning "This script is optimized for Raspberry Pi. Proceed with caution on other systems."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
print_status "Installing system dependencies..."
sudo apt install -y \
    git \
    curl \
    build-essential \
    libasound2-dev \
    nginx \
    htop \
    chromium-browser

# Install Node.js 20.x
print_status "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
print_status "Installing pnpm..."
sudo npm install -g pnpm@9.12.3

# Configure audio
print_status "Configuring audio settings..."
if [ -e /dev/snd/controlC1 ]; then
    # USB audio detected
    print_status "USB audio device detected, configuring as default..."
    sudo tee /etc/asound.conf > /dev/null <<EOF
pcm.!default {
    type hw
    card 1
}
ctl.!default {
    type hw
    card 1
}
EOF
fi

# Increase GPU memory split
print_status "Optimizing GPU memory split..."
if ! grep -q "gpu_mem=" /boot/config.txt; then
    echo "gpu_mem=256" | sudo tee -a /boot/config.txt > /dev/null
else
    sudo sed -i 's/gpu_mem=.*/gpu_mem=256/' /boot/config.txt
fi

# Configure swap
print_status "Configuring swap file..."
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon

# Disable unnecessary services
print_status "Disabling unnecessary services..."
sudo systemctl disable bluetooth || true
sudo systemctl disable cups || true
sudo systemctl disable avahi-daemon || true

# Create exhibition user if it doesn't exist
if ! id -u exhibition >/dev/null 2>&1; then
    print_status "Creating exhibition user..."
    sudo useradd -m -s /bin/bash exhibition
    sudo usermod -aG audio,video exhibition
fi

# Setup project directory
print_status "Setting up project directory..."
sudo -u exhibition mkdir -p /home/exhibition/wiktoria-lars-app

# Create systemd service
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/wiktoria-lars.service > /dev/null <<EOF
[Unit]
Description=Wiktoria Lars Exhibition App
After=network.target

[Service]
Type=simple
User=exhibition
WorkingDirectory=/home/exhibition/wiktoria-lars-app
Environment="NODE_ENV=production"
Environment="NODE_OPTIONS=--max-old-space-size=2048"
Environment="NEXT_PUBLIC_IS_RASPBERRY_PI=true"
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create kiosk mode autostart
print_status "Setting up kiosk mode..."
sudo -u exhibition mkdir -p /home/exhibition/.config/autostart
sudo -u exhibition tee /home/exhibition/.config/autostart/exhibition-kiosk.desktop > /dev/null <<EOF
[Desktop Entry]
Type=Application
Name=Exhibition Kiosk
Exec=/usr/bin/chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --incognito \
    --check-for-update-interval=604800 \
    --disable-gpu-sandbox \
    --disable-software-rasterizer \
    --disable-dev-shm-usage \
    --no-sandbox \
    --disable-setuid-sandbox \
    --disable-gpu-compositing \
    --use-fake-ui-for-media-stream \
    --autoplay-policy=no-user-gesture-required \
    http://localhost:3000?exhibition=true
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

# Create monitoring script
print_status "Creating monitoring script..."
sudo tee /usr/local/bin/exhibition-monitor > /dev/null <<'EOF'
#!/bin/bash
while true; do
    clear
    echo "=== Wiktoria Lars Exhibition Monitor ==="
    echo "Time: $(date)"
    echo "CPU Temp: $(vcgencmd measure_temp)"
    echo "Memory: $(free -h | grep Mem | awk '{print $3 " / " $2}')"
    echo "Swap: $(free -h | grep Swap | awk '{print $3 " / " $2}')"
    echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
    echo "Service: $(systemctl is-active wiktoria-lars)"
    echo ""
    echo "Disk Usage:"
    df -h / | tail -n 1
    echo ""
    echo "Network:"
    ip -4 addr show | grep inet | grep -v 127.0.0.1
    echo ""
    echo "Press Ctrl+C to exit"
    sleep 5
done
EOF
sudo chmod +x /usr/local/bin/exhibition-monitor

# Create deployment helper script
print_status "Creating deployment helper..."
sudo tee /usr/local/bin/exhibition-deploy > /dev/null <<'EOF'
#!/bin/bash
set -e

cd /home/exhibition/wiktoria-lars-app

echo "Pulling latest changes..."
git pull

echo "Installing dependencies..."
NODE_OPTIONS="--max-old-space-size=2048" pnpm install

echo "Building application..."
cp next.config.rpi.mjs next.config.mjs
NODE_OPTIONS="--max-old-space-size=2048" pnpm build

echo "Restarting service..."
sudo systemctl restart wiktoria-lars

echo "Deployment complete!"
EOF
sudo chmod +x /usr/local/bin/exhibition-deploy

# Create backup script
print_status "Creating backup script..."
sudo tee /usr/local/bin/exhibition-backup > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/home/exhibition/backups"
mkdir -p "$BACKUP_DIR"

cd /home/exhibition/wiktoria-lars-app
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/exhibition_backup_$TIMESTAMP.tar.gz"

tar -czf "$BACKUP_FILE" \
    .env.local \
    next.config.mjs \
    .next/standalone \
    public

echo "Backup created: $BACKUP_FILE"

# Keep only last 5 backups
cd "$BACKUP_DIR"
ls -t exhibition_backup_*.tar.gz | tail -n +6 | xargs -r rm

echo "Old backups cleaned up"
EOF
sudo chmod +x /usr/local/bin/exhibition-backup

# Final instructions
print_status "Setup complete!"
echo
echo "📋 Next steps:"
echo "1. Clone your repository to /home/exhibition/wiktoria-lars-app"
echo "2. Copy and configure .env.local with your API keys"
echo "3. Run: exhibition-deploy"
echo "4. Enable service: sudo systemctl enable wiktoria-lars"
echo "5. Start service: sudo systemctl start wiktoria-lars"
echo "6. Reboot to enable all optimizations"
echo
echo "🛠️ Useful commands:"
echo "- Monitor system: exhibition-monitor"
echo "- Deploy updates: exhibition-deploy"
echo "- Create backup: exhibition-backup"
echo "- View logs: sudo journalctl -u wiktoria-lars -f"
echo
print_warning "Remember to reboot for all changes to take effect!"