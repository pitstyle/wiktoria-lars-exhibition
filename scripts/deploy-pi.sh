#!/bin/bash

# Pi Deployment Script - Deploy to Raspberry Pi
# Usage: ./scripts/deploy-pi.sh [PI_IP] [optional: PI_USER]

set -e  # Exit on any error

# Configuration
PI_IP=${1:-"192.168.1.100"}  # Default Pi IP
PI_USER=${2:-"pitstyle"}      # Default Pi user
PI_PATH="/home/$PI_USER/exhibition"
CURRENT_DIR=$(pwd)
PROJECT_NAME="wiktoria-lars-pi"

echo "🚀 Deploying to Raspberry Pi..."
echo "   Target: $PI_USER@$PI_IP:$PI_PATH"
echo "   Source: $CURRENT_DIR"

# Check if Pi is reachable
echo "🔍 Checking Pi connectivity..."
if ! ping -c 1 -W 1 $PI_IP > /dev/null 2>&1; then
    echo "❌ Error: Cannot reach Pi at $PI_IP"
    echo "   Check IP address and network connection"
    exit 1
fi

# Check SSH access
echo "🔐 Testing SSH connection..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes $PI_USER@$PI_IP exit 2>/dev/null; then
    echo "❌ Error: Cannot SSH to $PI_USER@$PI_IP"
    echo "   Check SSH keys and user permissions"
    exit 1
fi

# Check if build exists
if [ ! -d ".next" ]; then
    echo "❌ Error: No build found (.next directory missing)"
    echo "   Run: ./scripts/build-pi.sh first"
    exit 1
fi

# Create backup on Pi
echo "💾 Creating backup on Pi..."
ssh $PI_USER@$PI_IP "
    if [ -d '$PI_PATH' ]; then
        sudo mv '$PI_PATH' '${PI_PATH}-backup-$(date +%Y%m%d-%H%M%S)' || true
    fi
    mkdir -p '$PI_PATH'
"

# Deploy files to Pi
echo "📤 Deploying files to Pi..."
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.next/cache' \
    --exclude='*.log' \
    --exclude='.env.local' \
    ./ $PI_USER@$PI_IP:$PI_PATH/

# Copy Pi-specific configs
echo "🔧 Installing Pi-specific configurations..."
ssh $PI_USER@$PI_IP "
    cd '$PI_PATH'
    
    # Use Pi configs
    cp package.pi.json package.json
    cp next.config.pi.mjs next.config.mjs
    
    # Install dependencies
    echo '📥 Installing dependencies on Pi...'
    npm install --production
    
    # Set permissions
    chmod +x scripts/*.sh
"

# Setup systemd service (optional)
echo "🔧 Setting up systemd service..."
ssh $PI_USER@$PI_IP "
    sudo tee /etc/systemd/system/exhibition.service > /dev/null <<EOF
[Unit]
Description=Wiktoria Lars Exhibition
After=network.target

[Service]
Type=simple
User=$PI_USER
WorkingDirectory=$PI_PATH
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start service
    sudo systemctl daemon-reload
    sudo systemctl enable exhibition
    sudo systemctl start exhibition
"

# Check deployment status
echo "🎯 Checking deployment status..."
sleep 5
if ssh $PI_USER@$PI_IP "curl -s http://localhost:3000 > /dev/null"; then
    echo "✅ Deployment successful!"
    echo "🌐 Exhibition running at: http://$PI_IP:3000"
    echo "🎭 Exhibition mode: http://$PI_IP:3000?exhibition=true"
else
    echo "⚠️  Deployment completed but service may not be running"
    echo "   Check with: ssh $PI_USER@$PI_IP 'sudo systemctl status exhibition'"
fi

echo "🏁 Pi deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test audio: Connect USB adapter and handset"
echo "   2. Test conversation: Visit http://$PI_IP:3000?exhibition=true"
echo "   3. Monitor logs: ssh $PI_USER@$PI_IP 'sudo journalctl -u exhibition -f'"