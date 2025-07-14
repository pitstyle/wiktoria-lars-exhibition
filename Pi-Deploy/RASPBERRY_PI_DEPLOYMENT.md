# Raspberry Pi Exhibition Deployment Guide

## Overview
This guide deploys the Wiktoria-Lars voice installation on Raspberry Pi for exhibition use. The system runs automatically on boot with no keyboard/mouse required.

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

## Quick Deployment Process

### 1. Prepare on Your Mac

```bash
# In your development folder
cd /path/to/wiktoria-lars-app

# Create Pi deployment folder
mkdir -p Pi-Deploy

# Copy essential files including bulletproof transcript system
cp -r app lib public Pi-Deploy/
cp package.json package-lock.json tsconfig.json Pi-Deploy/
cp .env.local next.config.mjs Pi-Deploy/
cp next.config.rpi.mjs RASPBERRY_PI_DEPLOYMENT.md Pi-Deploy/

# Ensure new transcript system API routes are included
mkdir -p Pi-Deploy/app/api/closeConversation
mkdir -p Pi-Deploy/app/api/terminateSession
mkdir -p Pi-Deploy/app/api/transcript-recovery

# Copy bulletproof transcript system files (if not already included in app/ copy)
cp app/api/closeConversation/route.ts Pi-Deploy/app/api/closeConversation/ 2>/dev/null || echo "closeConversation already copied"
cp app/api/terminateSession/route.ts Pi-Deploy/app/api/terminateSession/ 2>/dev/null || echo "terminateSession already copied"
cp app/api/transcript-recovery/route.ts Pi-Deploy/app/api/transcript-recovery/ 2>/dev/null || echo "transcript-recovery already copied"
cp lib/failsafeTranscriptCompiler.ts Pi-Deploy/lib/ 2>/dev/null || echo "failsafeTranscriptCompiler already copied"

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

# Verify bulletproof transcript system is included
echo "Verifying transcript system files..."
ls -la app/api/closeConversation/route.ts && echo "✅ closeConversation tool found" || echo "❌ closeConversation missing"
ls -la app/api/terminateSession/route.ts && echo "✅ terminateSession tool found" || echo "❌ terminateSession missing"
ls -la app/api/transcript-recovery/route.ts && echo "✅ transcript-recovery found" || echo "❌ transcript-recovery missing"
ls -la lib/failsafeTranscriptCompiler.ts && echo "✅ failsafeTranscriptCompiler found" || echo "❌ failsafeTranscriptCompiler missing"
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

### 10. Verify Bulletproof Transcript System

After the system boots up, verify the transcript system is working:

```bash
# Wait for the app to start (about 30 seconds after boot)
sleep 30

# Test conversation control tools
echo "Testing conversation control tools..."
curl -X POST http://localhost:3000/api/closeConversation \
  -H "Content-Type: application/json" \
  -d '{"conversationStatus": {"status": "completed", "reason": "test"}}' \
  && echo "✅ closeConversation tool working" || echo "❌ closeConversation failed"

curl -X POST http://localhost:3000/api/terminateSession \
  -H "Content-Type: application/json" \
  -d '{"sessionStatus": {"status": "closed", "errorReason": "test"}}' \
  && echo "✅ terminateSession tool working" || echo "❌ terminateSession failed"

# Check failsafe transcript compiler status
echo "Checking failsafe transcript compiler..."
curl http://localhost:3000/api/transcript-recovery \
  && echo "✅ Failsafe compiler accessible" || echo "❌ Failsafe compiler failed"

# Test webhook endpoint
echo "Testing enhanced webhook..."
curl http://localhost:3000/api/ultravox-webhook \
  && echo "✅ Enhanced webhook accessible" || echo "❌ Enhanced webhook failed"

# Check if failsafe compiler is running in background
echo "Checking background services..."
sudo journalctl -u exhibition -n 20 | grep -i "failsafe\|transcript" && echo "✅ Transcript system active in logs"

echo "🎯 Bulletproof transcript system verification complete!"
```

## Exhibition Checklist

### Hardware Setup
- [ ] USB audio adapter connected
- [ ] Handset plugged into adapter
- [ ] Ethernet cable connected
- [ ] Display connected (for monitoring)
- [ ] System boots directly to app
- [ ] Voice detection works automatically
- [ ] No keyboard/mouse needed

### Bulletproof Transcript System
- [ ] closeConversation tool responding
- [ ] terminateSession tool responding
- [ ] Failsafe transcript compiler accessible
- [ ] Enhanced webhook responding
- [ ] Background transcript services active
- [ ] Real-time message saving functional

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

### Transcript System Issues

#### Missing Conversation Control Tools
**Problem**: Agent tries to call `closeConversation` or `terminateSession` but gets "Tool does not exist" error

**Root Cause**: New conversation control tools not deployed or not included in agent configuration

**Solutions**:
```bash
# Verify tools exist
curl http://localhost:3000/api/closeConversation
curl http://localhost:3000/api/terminateSession

# If missing, check files exist
ls -la app/api/closeConversation/route.ts
ls -la app/api/terminateSession/route.ts

# Restart service to reload configuration
sudo systemctl restart exhibition
```

#### Transcripts Not Being Saved
**Problem**: Conversations complete but no transcripts appear in Supabase

**Root Cause**: Webhook failures, API errors, or failsafe compiler issues

**Solutions**:
```bash
# Check webhook is responding
curl http://localhost:3000/api/ultravox-webhook

# Test failsafe compiler manually
curl -X POST http://localhost:3000/api/transcript-recovery \
  -H "Content-Type: application/json" \
  -d '{"action": "compile"}'

# Check service logs for errors
sudo journalctl -u exhibition -f | grep -i "transcript\|webhook\|error"

# Verify API endpoints are all responding
curl http://localhost:3000/api/ultravox-webhook
curl http://localhost:3000/api/endCall
curl http://localhost:3000/api/forceTranscriptSave
```

#### Real-time Messages Not Saving
**Problem**: Individual messages during conversation not being saved

**Root Cause**: Webhook message events not being processed properly

**Solutions**:
```bash
# Check webhook logs for message events
sudo journalctl -u exhibition -f | grep "💬 Message event\|Real-time message saved"

# Test webhook manually
curl -X POST http://localhost:3000/api/ultravox-webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type": "message", "call": {"call_id": "test", "messages": [{"text": "test"}]}}'

# Check database connection
curl http://localhost:3000/api/test-db
```

#### Failsafe Compiler Not Running
**Problem**: Background transcript recovery service not active

**Solutions**:
```bash
# Check if compiler is mentioned in logs
sudo journalctl -u exhibition -n 50 | grep -i "failsafe\|transcript.*compiler"

# Force manual compilation
curl -X POST http://localhost:3000/api/transcript-recovery \
  -H "Content-Type: application/json" \
  -d '{"action": "compile"}'

# Check compiler status
curl http://localhost:3000/api/transcript-recovery \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'

# Restart service to reload compiler
sudo systemctl restart exhibition
```

## Quick Update Process

When updating the app:

1. Build on Mac:
```bash
cd /path/to/wiktoria-lars-app
# Make your changes

# Update Pi-Deploy folder with all new files including transcript system
cp -r app lib public Pi-Deploy/
cp package.json package-lock.json tsconfig.json Pi-Deploy/
cp .env.local next.config.mjs Pi-Deploy/
cp next.config.rpi.mjs RASPBERRY_PI_DEPLOYMENT.md Pi-Deploy/

# Ensure transcript system files are included
mkdir -p Pi-Deploy/app/api/closeConversation
mkdir -p Pi-Deploy/app/api/terminateSession
mkdir -p Pi-Deploy/app/api/transcript-recovery
cp app/api/closeConversation/route.ts Pi-Deploy/app/api/closeConversation/ 2>/dev/null || echo "closeConversation updated"
cp app/api/terminateSession/route.ts Pi-Deploy/app/api/terminateSession/ 2>/dev/null || echo "terminateSession updated"
cp app/api/transcript-recovery/route.ts Pi-Deploy/app/api/transcript-recovery/ 2>/dev/null || echo "transcript-recovery updated"
cp lib/failsafeTranscriptCompiler.ts Pi-Deploy/lib/ 2>/dev/null || echo "failsafeTranscriptCompiler updated"

# Copy to Pi via FileZilla or rsync
rsync -av Pi-Deploy/ pitstyle@<PI_IP>:/home/pitstyle/exhibition/Pi-Deploy/
```

2. On Pi:
```bash
sudo systemctl stop exhibition
cd /home/pitstyle/exhibition/Pi-Deploy

# Install dependencies if package.json changed
npm install --legacy-peer-deps

# Verify transcript system files are present
ls -la app/api/closeConversation/route.ts && echo "✅ closeConversation updated"
ls -la app/api/terminateSession/route.ts && echo "✅ terminateSession updated"
ls -la app/api/transcript-recovery/route.ts && echo "✅ transcript-recovery updated"
ls -la lib/failsafeTranscriptCompiler.ts && echo "✅ failsafeTranscriptCompiler updated"

# Build the application
npm run build

# Start service and verify transcript system
sudo systemctl start exhibition
sleep 10
curl http://localhost:3000/api/transcript-recovery && echo "✅ Transcript system operational"
```

## Exhibition Mode Features

### Core Exhibition Features
- Auto-starts on boot
- No keyboard/mouse required  
- Voice-activated conversations
- Automatic error recovery
- Runs indefinitely
- Minimal CPU/memory usage with Pi optimizations

### Bulletproof Transcript System
- **100% transcript capture guarantee** - Multiple backup methods ensure no conversation is lost
- **Real-time message saving** - Individual messages saved during conversation with intelligent speaker detection
- **Agent conversation control** - Proper conversation ending with closeConversation and terminateSession tools
- **Failsafe background compiler** - Runs every 30 seconds to recover incomplete transcripts
- **Enhanced webhook system** - Consolidated, reliable webhook handling with comprehensive error recovery
- **4-tier backup system**: Ultravox API → Manual compilation → Recovery transcript → Emergency marker
- **Automatic memory analysis** - Post-conversation analysis for improved future interactions

## Important Notes

1. **Always use USB audio adapter** - Pi's 3.5mm jack won't work with microphones
2. **Test handset before exhibition** - Ensure both mic and speaker work
3. **Use Ethernet if possible** - More reliable than WiFi
4. **Monitor remotely** - SSH access for troubleshooting