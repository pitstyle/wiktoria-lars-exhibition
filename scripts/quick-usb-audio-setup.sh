#!/bin/bash
# Quick USB Audio Setup for Exhibition Pis
# Run this on each Pi after deployment

echo "🎧 Setting up USB Audio for Exhibition..."

# 1. Create ALSA config for USB audio (card 3)
cat > ~/.asoundrc << 'EOF'
defaults.pcm.card 3
defaults.ctl.card 3
EOF

echo "✅ ALSA configured for USB audio (card 3)"

# 2. Set PipeWire/PulseAudio default sink
pactl set-default-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo 2>/dev/null || \
pactl set-default-sink alsa_output.usb-0d8c_USB_Audio-00.analog-stereo 2>/dev/null

# 3. Wake up the audio sink
pactl suspend-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo 0 2>/dev/null || \
pactl suspend-sink alsa_output.usb-0d8c_USB_Audio-00.analog-stereo 0 2>/dev/null

echo "✅ PulseAudio/PipeWire configured"

# 4. Set audio volume to maximum
echo "🔊 Setting USB audio volume to maximum..."
# Set all mixer controls to maximum for USB audio
amixer -c 3 sset Speaker 100% unmute 2>/dev/null || true
amixer -c 3 sset Headphone 100% unmute 2>/dev/null || true
amixer -c 3 sset PCM 100% unmute 2>/dev/null || true
amixer -c 3 sset Master 100% unmute 2>/dev/null || true

# Also set PulseAudio volume to maximum
pactl set-sink-volume alsa_output.usb-Generic_USB_Audio-00.analog-stereo 100% 2>/dev/null || \
pactl set-sink-volume alsa_output.usb-0d8c_USB_Audio-00.analog-stereo 100% 2>/dev/null || true

echo "✅ Volume set to maximum"

# 5. Test audio output
echo "🔊 Testing speaker output..."
speaker-test -t wav -c 2 -D hw:3,0 -l 1

echo "🎉 USB Audio setup complete!"
echo ""
echo "To verify:"
echo "1. Run: pactl info | grep 'Default Sink'"
echo "2. Open browser: http://localhost:3000/?exhibition=true"
echo "3. Speak into handset - you should hear responses"