# Raspberry Pi System Setup Commands

## Run these commands ON THE PI (copy/paste each section)

### 1. Initial System Update
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Verify Node.js Installation
```bash
node --version
npm --version
```

### 4. Install Required System Packages
```bash
sudo apt install -y chromium-browser unclutter git
```

### 5. Configure GPU Memory
```bash
echo "gpu_mem=256" | sudo tee -a /boot/config.txt
```

### 6. Create Exhibition Directory
```bash
mkdir -p /home/pitstyle/exhibition
```

### 7. Create pitstyle User (if using default pi user)
```bash
sudo adduser pitstyle
sudo usermod -aG sudo pitstyle
su - pitstyle
mkdir -p /home/pitstyle/exhibition
```

### 8. Configure Audio (After USB adapter connected)
```bash
# Check audio devices
aplay -l
arecord -l

# Create audio config (replace card number with your USB device)
cat > ~/.asoundrc << 'EOF'
pcm.!default {
    type hw
    card 1
}
ctl.!default {
    type hw  
    card 1
}
EOF
```

### 9. Test Audio
```bash
speaker-test -t sine -f 440 -c 2 -s 1 -D default
arecord -d 5 -D default test.wav && aplay test.wav
```

### 10. Enable SSH (Optional - for remote access)
```bash
sudo systemctl enable ssh
sudo systemctl start ssh
```

### 11. Install Global NPM Dependencies for Terminal Voice Test
```bash
# Install WebSocket support globally
sudo npm install -g ws

# Verify installation
npm list -g ws
```

---

## After System Setup Complete

1. **Transfer app from Mac** (see RASPBERRY_PI_DEPLOYMENT.md)
2. **Build and configure** (see RASPBERRY_PI_DEPLOYMENT.md)
3. **Test terminal voice** (node terminal-voice-test.js)

## Notes
- Run each section and wait for completion
- If any command fails, note the error
- USB audio adapter must be connected for audio config
- After audio config, test before proceeding to app installation