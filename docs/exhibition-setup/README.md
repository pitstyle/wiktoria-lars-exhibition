# Exhibition Setup Documentation

## 📋 Exhibition Requirements

### Voice-Only Operation
- No keyboard/mouse interaction required
- Voice activation triggers conversation start
- Automatic return to waiting state after conversations
- Continuous operation for exhibition hours

### Hardware Configuration
- Raspberry Pi 4 with USB audio adapter
- Handset with TRRS 3.5mm connector
- Ethernet connection for stability
- Display for monitoring (optional during operation)

### Software Requirements
- Chromium browser in kiosk mode
- Exhibition mode parameter: `?exhibition=true`
- Systemd service for auto-start
- Error recovery and restart capabilities

## 📖 Available Documentation

### [SYSTEM_MANUAL.md](./SYSTEM_MANUAL.md)
Complete system operation manual including:
- Exhibition mode features
- Conversation flow patterns
- Troubleshooting during exhibition
- Emergency procedures

## 🎭 Exhibition Mode Features

### Auto-Start Configuration
- Boots directly into exhibition interface
- No login screen or desktop interaction
- Voice activation enabled immediately
- Phone tone ambient sound for user attraction

### Conversation Management
- **Session Timeout**: 45 seconds backup timeout
- **Agent Handoffs**: Lars ↔ Wiktoria conversation flow
- **Natural Endings**: Graceful conversation conclusion
- **State Reset**: Automatic return to waiting for next user

### Error Handling
- **Audio Issues**: Automatic recovery and restart
- **Network Problems**: Retry logic and fallback
- **Browser Crashes**: Service auto-restart
- **Memory Leaks**: Periodic restart if needed

## 🔧 Configuration Files

### Systemd Service
Located in deployment guide for:
- Auto-start on boot
- Process monitoring
- Automatic restart on failure
- Logging and debugging

### Kiosk Mode Setup
Browser configuration for:
- Full-screen operation
- Disabled user controls
- Audio autoplay permissions
- WebRTC camera/microphone access

## 🚀 Pre-Exhibition Checklist

- [ ] Pi hardware assembled and tested
- [ ] USB audio adapter working with handset
- [ ] Network connection stable
- [ ] Auto-start service enabled
- [ ] Voice activation responsive
- [ ] Agent conversations working
- [ ] Database logging functional
- [ ] Emergency restart procedure tested