# Raspberry Pi Exhibition Deployment Guide

## Overview
This guide deploys the Wiktoria-Lars voice installation on Raspberry Pi for exhibition use.

**✅ CONFIRMED WORKING SOLUTION (Jan 12, 2025):**
- Next.js app + Chromium browser (WebRTC required for audio)
- Bluetooth headphones in headset mode OR USB audio adapter  
- SSH as primary deployment method (fastest and most reliable)
- All agent tools properly registered with Ultravox
- Wiktoria's full theatrical responses working

**🚨 CRITICAL FIXES INCLUDED:**
- API authentication: `X-API-Key` format
- Tool registration: Debug logging in ultravox route
- Wiktoria response: Full theatrical `toolResultText`
- Audio setup: Bluetooth headset profile support

## ⚠️ CRITICAL ARM COMPATIBILITY REQUIREMENTS

**IMPORTANT**: Raspberry Pi uses ARM architecture which has compatibility issues with:
- **Next.js 14+**: Poor ARM support, causes SWC binary errors
- **SWC Compiler**: No ARM binaries available
- **Solution**: Use Next.js 13.5.6 (included in Pi deployment) + Babel fallback

## Hardware Requirements
- Raspberry Pi 4 (4GB or 8GB recommended)
- 32GB+ SD card 
- **USB Audio Adapter with TRRS/4-pole support** (REQUIRED - Pi's 3.5mm jack is output-only)
- Handset with 4-conductor 3.5mm plug
- Ethernet connection (more reliable than WiFi)
- HDMI display (for monitoring only)

## Recommended USB Audio Adapters
- UGREEN USB to 3.5mm TRRS Audio Adapter
- Sabrent USB External Sound Card with TRRS
- Any adapter marked "4-pole" or "headset compatible"

## 🚀 PRIMARY METHOD: SSH Deployment (FASTEST)

### 1. Enable SSH on Pi (One Time Setup)
```bash
# On Pi console (one time only)  
sudo systemctl enable ssh
sudo systemctl start ssh

# Find Pi IP address
ip addr show | grep inet
```

### 2. Deploy from Mac via SSH (RECOMMENDED)

```bash
# From Mac - deploy this ENTIRE Pi directory with all fixes
cd /Users/peterstyle/Developer/wiktoria-lars-ultra/ultravox_implementation/wiktoria-lars-app

# Deploy complete working system (includes all today's critical fixes)
scp -r Pi/ pitstyle@<PI_IP>:/home/pitstyle/exhibition/Pi-Deploy/
```

### 3. Complete Setup via SSH

```bash
# SSH into Pi from Mac (much faster than Pi keyboard)
ssh pitstyle@<PI_IP>

# Navigate to deployment 
cd /home/pitstyle/exhibition/Pi-Deploy

# Install dependencies with ARM compatibility
npm install next@13.5.6 eslint-config-next@13.5.6 --save
npm install --legacy-peer-deps

# Build application
npm run build

# Start the app
npm start
```

### 4. Test Voice System via SSH

```bash
# In separate terminal, monitor logs
ssh pitstyle@<PI_IP>
tail -f /home/pitstyle/exhibition/Pi-Deploy/.next/trace

# Start browser on Pi (via SSH)
DISPLAY=:0 chromium-browser http://localhost:3000?exhibition=true &
```

## 🔄 RESTART PROCESS (Important!)

### When updating files or restarting app:

```bash
# Via SSH from Mac (fastest)
ssh pitstyle@<PI_IP>

# Stop any running processes
pkill -f "next"
pkill -f "npm"

# Restart the app
cd /home/pitstyle/exhibition/Pi-Deploy
npm start

# In separate SSH terminal, restart browser
DISPLAY=:0 pkill chromium
DISPLAY=:0 chromium-browser http://localhost:3000?exhibition=true &
```

## 🔧 MANUAL DEPLOYMENT (Only if SSH unavailable)

### 1. Prepare on Your Mac (if not using SSH)

```bash
# Only use this if SSH method above fails
cd /path/to/wiktoria-lars-app

# Create Pi deployment folder
mkdir -p Pi-Deploy

# Copy essential files with today's fixes
cp -r app lib public Pi-Deploy/
cp package.json package-lock.json tsconfig.json Pi-Deploy/
cp .env.local next.config.mjs Pi-Deploy/
cp next.config.rpi.mjs RASPBERRY_PI_DEPLOYMENT.md Pi-Deploy/

# Add .babelrc to force Babel over SWC
echo '{"presets": ["next/babel"]}' > Pi-Deploy/.babelrc

# Rename Pi config to be the main config
cd Pi-Deploy
mv next.config.mjs next.config.original.mjs
mv next.config.rpi.mjs next.config.mjs
```

### 2. Transfer to Pi
Use FileZilla or SCP to copy the `Pi-Deploy` folder to `/home/pitstyle/exhibition/`

### 3. Initial Pi Setup (One Time Only)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install dependencies
sudo apt install -y chromium-browser unclutter

# Set GPU memory split
echo "gpu_mem=256" | sudo tee -a /boot/config.txt

# Create exhibition directory
mkdir -p /home/pitstyle/exhibition
cd /home/pitstyle/exhibition

# After copying files from Mac
cd /home/pitstyle/exhibition/Pi-Deploy

# CRITICAL: Downgrade Next.js for ARM compatibility
npm install next@13.5.6 eslint-config-next@13.5.6

# Install other dependencies
npm install --legacy-peer-deps

# Create .babelrc for Babel fallback (if needed)
echo '{"presets": ["next/babel"]}' > .babelrc

# Build the application
npm run build
```

### 4. Configure USB Audio

```bash
# Plug in USB audio adapter, then:
aplay -l  # Note the card number
arecord -l  # Verify mic is detected

# Create audio config
cat > ~/.asoundrc << 'EOF'
pcm.!default {
    type hw
    card 1  # Change to your USB card number
}
ctl.!default {
    type hw
    card 1
}
EOF

# Test audio
speaker-test -t sine -f 440 -c 2 -s 1 -D default
arecord -d 5 -D default test.wav && aplay test.wav
```

### 5. Create Auto-Start Service

```bash
# Create service file
sudo tee /etc/systemd/system/exhibition.service << 'EOF'
[Unit]
Description=Wiktoria Lars Exhibition
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pitstyle
WorkingDirectory=/home/pitstyle/exhibition/Pi-Deploy
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable service
sudo systemctl enable exhibition
sudo systemctl start exhibition
```

### 6. Configure Kiosk Mode

```bash
# Create autostart directory
mkdir -p /home/pitstyle/.config/autostart

# Create kiosk launcher
cat > /home/pitstyle/.config/autostart/exhibition-kiosk.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Exhibition Kiosk
Exec=/bin/bash /home/pitstyle/start-kiosk.sh
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

# Create kiosk script
cat > /home/pitstyle/start-kiosk.sh << 'EOF'
#!/bin/bash
# Wait for network
sleep 10

# Hide cursor
unclutter -idle 0 &

# Wait for Node.js service
sleep 5

# Start Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=604800 \
  --autoplay-policy=no-user-gesture-required \
  --use-fake-ui-for-media-stream \
  --enable-features=OverlayScrollbar \
  http://localhost:3000?exhibition=true
EOF

chmod +x /home/pitstyle/start-kiosk.sh
```

### 7. Voice-First Configuration

The app automatically:
- Starts with VAD (Voice Activity Detection) enabled
- Initiates calls when voice is detected
- Requires no button interaction
- Handles handset pickup via voice detection

### 8. Configure Boot Settings

```bash
# Auto-login to desktop
sudo raspi-config
# Select: System Options > Boot/Auto Login > Desktop Autologin

# Disable screen blanking
sudo tee -a /etc/lightdm/lightdm.conf << 'EOF'
[Seat:*]
xserver-command=X -s 0 -dpms
EOF

# Disable WiFi power management (if using WiFi)
echo "options 8192cu rtw_power_mgnt=0" | sudo tee /etc/modprobe.d/8192cu.conf
```

### 9. Final Setup

```bash
# Set volume to 85%
amixer -c 1 set PCM 85%

# Reboot to test
sudo reboot
```

## Exhibition Checklist

- [ ] USB audio adapter connected
- [ ] Handset plugged into adapter
- [ ] Ethernet cable connected
- [ ] Display connected (for monitoring)
- [ ] System boots directly to app
- [ ] Voice detection works automatically
- [ ] No keyboard/mouse needed

## Troubleshooting

### Critical: SWC Binary Errors (ARM Compatibility)

**Problem**: `Failed to load SWC binary for linux/arm`

**Root Cause**: Next.js 14+ has poor ARM architecture support. SWC (Speedy Web Compiler) doesn't have ARM binaries.

**Solutions** (in order of preference):

1. **Downgrade to Next.js 13 (Recommended)**:
```bash
cd /home/pitstyle/exhibition/Pi-Deploy
npm install next@13.5.6 eslint-config-next@13.5.6
rm -rf .next
npm run build
```

2. **Force Babel Usage**:
```bash
echo '{"presets": ["next/babel"]}' > .babelrc
npm install --save-dev @babel/core @babel/preset-env
rm -rf .next
npm run build
```

3. **Environment Variable Override**:
```bash
export NEXT_DISABLE_SWC=1
npm run build
```

### Audio Issues
```bash
# Check USB audio is detected
aplay -l
arecord -l

# Test audio directly
speaker-test -D plughw:1,0  # Use your card number
arecord -D plughw:1,0 -d 5 test.wav
```

### Service Issues
```bash
# Check service status
sudo systemctl status exhibition

# View logs
sudo journalctl -u exhibition -f

# Restart service
sudo systemctl restart exhibition
```

### Browser Issues
```bash
# Check if app is running
curl http://localhost:3000

# Kill and restart kiosk
pkill chromium
/home/pitstyle/start-kiosk.sh
```

### Build Issues
```bash
# Memory issues during build
NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Clear all caches
npm cache clean --force
rm -rf node_modules .next
npm install --legacy-peer-deps
```

## Quick Update Process

When updating the app:

1. Build on Mac:
```bash
cd /path/to/wiktoria-lars-app
# Make your changes
# Copy to Pi-Deploy folder as before
```

2. On Pi:
```bash
sudo systemctl stop exhibition
cd /home/pitstyle/exhibition/Pi-Deploy
# Copy new files via FileZilla
npm install --legacy-peer-deps  # Only if package.json changed
npm run build
sudo systemctl start exhibition
```

## Exhibition Mode Features

- Auto-starts on boot
- No keyboard/mouse required  
- Voice-activated conversations
- Automatic error recovery
- Runs indefinitely
- Minimal CPU/memory usage with Pi optimizations

## Important Notes

1. **Always use USB audio adapter** - Pi's 3.5mm jack won't work with microphones
2. **Test handset before exhibition** - Ensure both mic and speaker work
3. **Use Ethernet if possible** - More reliable than WiFi
4. **Monitor remotely** - SSH access for troubleshooting