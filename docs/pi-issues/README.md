# Pi Issues - Reference Documentation

## 📋 Legacy Documentation

### [PI_BLUETOOTH_HEADPHONES.md](./PI_BLUETOOTH_HEADPHONES.md)
**⚠️ DEPRECATED - FOR REFERENCE ONLY**

This document contains the Bluetooth setup process that was used before USB audio adapters were implemented.

**Why Deprecated**:
- Bluetooth audio is complex and unreliable
- Profile switching required (A2DP vs headset mode)
- Connection drops and latency issues
- USB adapters are simpler and more stable

**Current Solution**:
- Use USB audio adapters with TRRS/4-pole support
- Direct handset connection via USB adapter
- No Bluetooth configuration needed
- More reliable for exhibition use

## 🔄 Migration Notes

If you encounter systems still using Bluetooth:

### Remove Bluetooth Dependencies
```bash
# Disable Bluetooth audio
sudo systemctl disable bluetooth
# Remove PulseAudio Bluetooth modules
sudo apt remove pulseaudio-module-bluetooth
```

### Switch to USB Audio
```bash
# Install USB audio support
sudo apt install alsa-utils
# Configure USB as default (see troubleshooting docs)
```

## 📖 Historical Context

The Bluetooth documentation is preserved because:
1. **Learning Reference**: Shows complexity of Bluetooth setup
2. **Migration Guide**: For systems still using Bluetooth
3. **Comparison**: Demonstrates why USB is preferred
4. **Debugging**: If Bluetooth audio issues resurface

## ✅ Current Recommended Approach

**Hardware**: USB audio adapter + handset
**Configuration**: ALSA configuration for USB audio
**Reliability**: No connection drops or profile switching
**Maintenance**: Plug-and-play, no complex setup