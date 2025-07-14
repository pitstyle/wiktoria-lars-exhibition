# Raspberry Pi Bluetooth Headphones Setup

## Prerequisites
- Bluetooth-enabled headphones (with microphone)
- Raspberry Pi 4 with Bluetooth support

## Step 1: Install Bluetooth Audio Support
```bash
# Install required packages
sudo apt-get update
sudo apt-get install -y pulseaudio pulseaudio-module-bluetooth pavucontrol bluez
sudo apt-get install -y blueman

# Add user to bluetooth group
sudo usermod -a -G bluetooth pitstyle

# Reboot to apply changes
sudo reboot
```

## Step 2: Start PulseAudio
```bash
# Start PulseAudio
pulseaudio --start

# Check if running
pulseaudio --check
echo $?  # Should return 0 if running
```

## Step 3: Connect Bluetooth Headphones

### Using GUI (Easier)
1. Click Bluetooth icon in taskbar
2. Select "Add Device"
3. Put headphones in pairing mode
4. Select your headphones from list
5. Click "Pair"
6. After pairing, click "Connect"

### Using Terminal (Advanced)
```bash
# Start bluetoothctl
bluetoothctl

# In bluetoothctl prompt:
power on
agent on
default-agent
scan on

# Wait for your headphones to appear (note the MAC address)
# Example: [NEW] Device 00:11:22:33:44:55 My Headphones

# When you see your headphones:
scan off
pair 00:11:22:33:44:55  # Use your device's MAC
trust 00:11:22:33:44:55
connect 00:11:22:33:44:55

# Exit bluetoothctl
exit
```

## Step 4: Set Bluetooth as Default Audio
```bash
# List audio sinks
pactl list short sinks

# You should see something like:
# 1    alsa_output.platform-bcm2835_audio.analog-stereo
# 2    bluez_sink.00_11_22_33_44_55.a2dp_sink

# Set Bluetooth as default
pactl set-default-sink bluez_sink.00_11_22_33_44_55.a2dp_sink
pactl set-default-source bluez_sink.00_11_22_33_44_55.a2dp_sink.monitor
```

## Step 5: Configure Audio for Terminal Voice Test
```bash
# Create/update .asoundrc for Bluetooth
cat > ~/.asoundrc << 'EOF'
pcm.!default {
    type pulse
}
ctl.!default {
    type pulse
}
EOF
```

## Step 6: Test Audio
```bash
# Test speaker
speaker-test -t sine -f 440 -c 2 -s 1

# Test microphone
arecord -d 5 test.wav && aplay test.wav

# Check volume levels
alsamixer
# Use F6 to select sound card
# Arrow keys to adjust levels
```

## Step 7: Auto-Connect on Boot (Optional)
```bash
# Create auto-connect script
sudo tee /etc/systemd/system/bluetooth-headphones.service << 'EOF'
[Unit]
Description=Connect Bluetooth Headphones
After=bluetooth.target

[Service]
Type=oneshot
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/bluetoothctl connect 00:11:22:33:44:55
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Enable service (replace MAC address)
sudo systemctl enable bluetooth-headphones.service
```

## Troubleshooting

### Headphones Connected but No Sound
```bash
# Restart PulseAudio
pulseaudio -k
pulseaudio --start

# Check audio profile
pacmd list-cards
# Look for your Bluetooth device and available profiles
# Set to A2DP for better quality:
pacmd set-card-profile bluez_card.00_11_22_33_44_55 a2dp_sink
```

### Microphone Not Working
```bash
# List sources
pacmd list-sources | grep -e 'index:' -e 'name:' -e 'bluetooth'

# Set Bluetooth mic as default
pacmd set-default-source bluez_source.00_11_22_33_44_55
```

### Connection Drops
```bash
# Edit Bluetooth config
sudo nano /etc/bluetooth/main.conf

# Add/modify:
[General]
Enable=Source,Sink,Media,Socket
Class=0x000414
FastConnectable=true

# Restart Bluetooth
sudo systemctl restart bluetooth
```

## Testing with Terminal Voice App
```bash
cd /home/pitstyle/exhibition/Pi-Deploy

# Ensure PulseAudio is running
pulseaudio --check || pulseaudio --start

# Run voice test
node terminal-voice-test.js
```

## Important Notes
- Bluetooth audio may have slight latency (100-200ms)
- Use USB audio adapter for best quality/lowest latency
- Some Bluetooth headphones need to be in "headset" mode for mic to work
- If using for exhibition, consider wired headphones for reliability