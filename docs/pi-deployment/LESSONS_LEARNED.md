# Pi Deployment Lessons Learned

## 🚨 Critical Issues to Avoid

### 1. **WebRTC Audio Requirements**
- **DON'T**: Try to use terminal-only voice test
- **DO**: Always use browser (Chromium) for WebRTC audio
- **Reason**: WebSocket alone can't handle audio streams

### 2. **Audio Setup - USB Adapters**
- **SOLUTION**: USB audio adapters with TRRS/4-pole support
- **DON'T**: Use Pi's 3.5mm jack (output-only, no mic)
- **DO**: Use USB audio adapter for handset connection
- **No More Bluetooth**: USB adapters eliminate Bluetooth complexity

### 3. **Tool Registration**
- **DON'T**: Assume tools are automatically registered
- **DO**: Add debug logging to verify tools reach Ultravox
- **Check**: All tools in `selectedTools` array in API response

### 4. **API Authentication**
- **DON'T**: Use `Authorization: Bearer` header
- **DO**: Use `X-API-Key` header
- **Correct Format**: `'X-API-Key': ULTRAVOX_API_KEY`

### 5. **Agent Speech After Tools**
- **Issue**: Agents not speaking automatically after tool execution
- **Original Working**: NO reaction headers at all
- **Current**: Using `'X-Ultravox-Agent-Reaction': 'speaks-once'`
- **May Need**: Remove reaction headers entirely

### 6. **ARM Architecture**
- **DON'T**: Use Next.js 14+ (no ARM support)
- **DO**: Use Next.js 13.5.6
- **Required**: `.babelrc` with `{"presets": ["next/babel"]}`
- **Install**: `npm install next@13.5.6 eslint-config-next@13.5.6`

## ✅ Verified Working Configuration

### Hardware
- Raspberry Pi 4 (4GB minimum)
- USB audio adapter with TRRS/4-pole support
- Handset with 3.5mm TRRS plug
- Ethernet connection (more stable than WiFi)

### Software Stack
- Next.js 13.5.6 (ARM compatible)
- Node.js 20.x
- Chromium browser
- PulseAudio for audio management

### Deployment Method
- SSH deployment (fastest)
- `scp -r` from Mac to Pi
- Build on Pi after transfer

### Exhibition Mode
- Auto-start via systemd service
- Browser in kiosk mode
- Voice activation enabled
- No keyboard/mouse needed

## 🔧 Quick Fixes Reference

### SWC Binary Error
```bash
npm install next@13.5.6 eslint-config-next@13.5.6
echo '{"presets": ["next/babel"]}' > .babelrc
```

### USB Audio Setup
```bash
# Check USB audio device detected
aplay -l  # Note the card number (usually card 1)
arecord -l  # Verify mic is detected

# Set USB audio as default
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
```

### Tools Not Found
```javascript
// Add to /app/api/ultravox/route.ts
console.log('🛠️ Tools being sent:', responseBody.selectedTools);
```

### Build Memory Issues
```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

## 📋 Pre-Deployment Checklist

- [ ] Using Next.js 13.5.6 (not 14+)
- [ ] `.babelrc` file present
- [ ] USB audio adapter configured and tested
- [ ] All tools properly registered
- [ ] Browser-based deployment (not terminal)
- [ ] SSH access configured
- [ ] Exhibition mode URL parameter set