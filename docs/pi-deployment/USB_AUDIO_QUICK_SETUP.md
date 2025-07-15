# USB Audio Quick Setup Guide - For Remaining 4 Pis

## 🚀 FAST SETUP (5 minutes per Pi)

### Prerequisites
- Pi already has the app deployed and running
- USB audio adapter plugged in
- Handset connected to USB adapter

### Method 1: One-Line Setup (Fastest)

**SSH to Pi and run:**
```bash
curl -sSL https://raw.githubusercontent.com/YOUR_REPO/scripts/quick-usb-audio-setup.sh | bash
```

### Method 2: Manual Quick Setup

**SSH to Pi and paste these commands:**

```bash
# 1. Configure ALSA (USB is always card 3)
cat > ~/.asoundrc << 'EOF'
defaults.pcm.card 3
defaults.ctl.card 3
EOF

# 2. Configure PulseAudio/PipeWire
pactl set-default-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo
pactl suspend-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo 0

# 3. Set audio volume to maximum
amixer -c 3 sset Speaker 100% unmute 2>/dev/null || true
amixer -c 3 sset Headphone 100% unmute 2>/dev/null || true
amixer -c 3 sset PCM 100% unmute 2>/dev/null || true
pactl set-sink-volume alsa_output.usb-Generic_USB_Audio-00.analog-stereo 100%

# 4. Quick test
speaker-test -t wav -c 2 -D hw:3,0 -l 1
```

### Method 3: Copy Script from Mac

**From your Mac:**
```bash
# Copy the setup script to Pi
scp scripts/quick-usb-audio-setup.sh pitstyle@PI_IP:~/

# Run it on Pi
ssh pitstyle@PI_IP "chmod +x quick-usb-audio-setup.sh && ./quick-usb-audio-setup.sh"
```

## 🎯 Complete Setup Checklist

For each Pi:

- [ ] Plug in USB audio adapter
- [ ] Connect handset to adapter
- [ ] SSH to Pi: `ssh pitstyle@10.10.21.XX`
- [ ] Run USB audio setup (any method above)
- [ ] Test in browser: `http://PI_IP:3000/?exhibition=true`
- [ ] Verify voice input AND output work

## 💡 Key Learnings

1. **USB adapter is ALWAYS card 3** on these Pis
2. **No need for complex detection** - hardcode card 3
3. **PipeWire sink name** is consistent: `alsa_output.usb-Generic_USB_Audio-00.analog-stereo`
4. **Must wake sink** from SUSPENDED state
5. **ALSA + PulseAudio** both need configuration

## 🔧 Troubleshooting

**No audio output?**
```bash
# Check if USB detected
aplay -l | grep USB  # Should show card 3

# Check PulseAudio sink
pactl list short sinks  # Should show USB sink

# Force wake sink
pactl suspend-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo 0

# Check volume
alsamixer -c 3  # Press M to unmute, arrows to adjust
```

**Still no audio?**
```bash
# Restart PulseAudio
systemctl --user restart pulseaudio

# Test ALSA directly
aplay -D hw:3,0 /usr/share/sounds/alsa/Front_Left.wav
```

## 📋 For All 4 Remaining Pis

```bash
# Pi 2 (10.10.21.XX)
ssh pitstyle@10.10.21.XX "./quick-usb-audio-setup.sh"

# Pi 3 (10.10.21.XX)
ssh pitstyle@10.10.21.XX "./quick-usb-audio-setup.sh"

# Pi 4 (10.10.21.XX)
ssh pitstyle@10.10.21.XX "./quick-usb-audio-setup.sh"

# Pi 5 (10.10.21.XX)
ssh pitstyle@10.10.21.XX "./quick-usb-audio-setup.sh"
```

## ✅ Success Indicators

- `speaker-test` produces sound through handset
- Browser shows "Voice Activated" UI
- Speaking triggers Lars response
- Audio responses play through handset speaker
- Conversation flows: Lars → Wiktoria → User

---

**Time estimate: 5 minutes per Pi (vs 2 hours for the first one!)**