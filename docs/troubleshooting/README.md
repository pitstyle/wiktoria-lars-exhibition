# Troubleshooting Documentation

## 🔧 Available Guides

### [CRITICAL_FIXES_AND_FINDINGS.md](./CRITICAL_FIXES_AND_FINDINGS.md)
Historical fixes and solutions for:
- Agent conversation flow issues
- Tool execution problems  
- Response repetition fixes
- Identity confusion solutions

## 🚨 Common Pi Deployment Issues

### 1. **SWC Binary Errors**
**Symptom**: `Failed to load SWC binary for linux/arm`
**Solution**: 
```bash
npm install next@13.5.6 eslint-config-next@13.5.6
echo '{"presets": ["next/babel"]}' > .babelrc
```

### 2. **Audio Not Working**
**Symptom**: No audio input/output
**Solution**:
```bash
# Check USB audio detected
aplay -l && arecord -l
# Configure default audio device
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

### 3. **Tools Not Found**
**Symptom**: "Tool 'transferToWiktoria' does not exist"
**Solution**: Verify tool registration in `/app/api/ultravox/route.ts`

### 4. **Agents Not Speaking**
**Symptom**: Tool executes but agent doesn't respond
**Status**: May need to remove `X-Ultravox-Agent-Reaction` headers
**Investigation**: Original working code had no reaction headers

### 5. **Build Memory Issues**
**Symptom**: Build fails with memory errors
**Solution**:
```bash
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

## 🔍 Debugging Process

### 1. **Check Service Status**
```bash
sudo systemctl status exhibition
sudo journalctl -u exhibition -f
```

### 2. **Test API Endpoints**
```bash
curl http://localhost:3000/api/ultravox
curl http://localhost:3000/api/transferToWiktoria
```

### 3. **Audio Testing**
```bash
speaker-test -D plughw:1,0
arecord -D plughw:1,0 -d 5 test.wav
```

### 4. **Browser Console**
Check for WebRTC errors and tool execution logs

## 📞 Emergency Procedures

### Quick Restart
```bash
sudo systemctl restart exhibition
pkill chromium && /home/pitstyle/start-kiosk.sh
```

### Full Reset
```bash
sudo systemctl stop exhibition
cd /home/pitstyle/exhibition/Pi-Deploy
npm run build
sudo systemctl start exhibition
```

### Network Issues
```bash
# Check connection
ping google.com
# Restart networking
sudo systemctl restart networking
```