# Pi Deployment Quick Reference Card

## 🚀 **FAST DEPLOYMENT COMMANDS**

### **1. Pre-Deployment**
```bash
# Commit all fixes
git add app/ lib/ scripts/ docs/
git commit -m "🎯 EXHIBITION READY: All critical fixes applied"
git push origin pi-production-v2
```

### **2. Build for Pi**
```bash
./scripts/build-pi.sh
```

### **3. Deploy to Pi**
```bash
./scripts/deploy-pi.sh [PI_IP]
# Example: ./scripts/deploy-pi.sh 192.168.1.100
```

### **4. USB Audio Setup (5 minutes)**
```bash
ssh pitstyle@PI_IP "cd /home/pitstyle/exhibition && ./scripts/quick-usb-audio-setup.sh"
```

### **5. Test Exhibition**
```bash
curl http://PI_IP:3000/?exhibition=true
```

---

## 🎧 **USB AUDIO ONE-LINER**

```bash
# Complete USB audio setup in one command
ssh pitstyle@PI_IP 'cat > ~/.asoundrc << "EOF"
defaults.pcm.card 3
defaults.ctl.card 3
EOF
pactl set-default-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo
pactl suspend-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo 0
amixer -c 3 sset Speaker 100% unmute
amixer -c 3 sset Headphone 100% unmute
pactl set-sink-volume alsa_output.usb-Generic_USB_Audio-00.analog-stereo 100%
speaker-test -t wav -c 2 -D hw:3,0 -l 1'
```

---

## 📋 **CRITICAL FIXES APPLIED**

✅ **Phone tone auto-restart** - Tone restarts after conversation ends  
✅ **Tool availability** - 12+ exchanges (was 6)  
✅ **Character voices** - No contamination, consistent identity  
✅ **JSON speaking** - Silent tool execution  
✅ **Cold start** - <1s response with warming + keep-alive  
✅ **Transcript saving** - Reliable 3-tier fallback system  

---

## 🔧 **EMERGENCY TROUBLESHOOTING**

### **No Audio Output**
```bash
aplay -l | grep USB  # Should show card 3
pactl suspend-sink alsa_output.usb-Generic_USB_Audio-00.analog-stereo 0
```

### **Voice Activation Not Working**
```bash
# Check browser permissions - microphone must be allowed
# Test in browser: http://PI_IP:3000/?exhibition=true
```

### **Tool Timeout Errors**
```bash
cd /home/pitstyle/exhibition && ./scripts/warm-functions.sh
systemctl --user restart keep-alive
```

### **Character Voice Issues**
- Check recent commit has identity guards
- Test with fresh conversation
- Verify no cached prompts

---

## 🎯 **SUCCESS VERIFICATION**

### **Quick Tests**
```bash
# 1. Basic connectivity
curl http://PI_IP:3000

# 2. Exhibition mode
curl http://PI_IP:3000/?exhibition=true

# 3. USB audio detection
ssh pitstyle@PI_IP "aplay -l | grep USB"

# 4. Audio test
ssh pitstyle@PI_IP "speaker-test -t wav -c 2 -D hw:3,0 -l 1"
```

### **Exhibition Ready Checklist**
- [ ] App running at `http://PI_IP:3000`
- [ ] Exhibition mode loads: `http://PI_IP:3000/?exhibition=true`
- [ ] USB audio adapter connected (card 3)
- [ ] Handset connected to adapter
- [ ] Voice activation triggers Lars
- [ ] Audio output through handset
- [ ] Phone tone plays when waiting
- [ ] Conversations flow 12+ exchanges
- [ ] Characters maintain distinct voices
- [ ] System returns to waiting automatically

---

## 🏗️ **MULTI-PI DEPLOYMENT**

### **Deploy to All 5 Pis**
```bash
# Pi 1
./scripts/deploy-pi.sh 192.168.1.100
ssh pitstyle@192.168.1.100 "cd /home/pitstyle/exhibition && ./scripts/quick-usb-audio-setup.sh"

# Pi 2
./scripts/deploy-pi.sh 192.168.1.101
ssh pitstyle@192.168.1.101 "cd /home/pitstyle/exhibition && ./scripts/quick-usb-audio-setup.sh"

# Pi 3
./scripts/deploy-pi.sh 192.168.1.102
ssh pitstyle@192.168.1.102 "cd /home/pitstyle/exhibition && ./scripts/quick-usb-audio-setup.sh"

# Pi 4
./scripts/deploy-pi.sh 192.168.1.103
ssh pitstyle@192.168.1.103 "cd /home/pitstyle/exhibition && ./scripts/quick-usb-audio-setup.sh"

# Pi 5
./scripts/deploy-pi.sh 192.168.1.104
ssh pitstyle@192.168.1.104 "cd /home/pitstyle/exhibition && ./scripts/quick-usb-audio-setup.sh"
```

### **Test All Pis**
```bash
for ip in 192.168.1.{100..104}; do
  echo "Testing Pi at $ip..."
  curl -s http://$ip:3000/?exhibition=true > /dev/null && echo "✅ $ip OK" || echo "❌ $ip FAILED"
done
```

---

## 📊 **PERFORMANCE TARGETS**

- **Deployment time**: 30 minutes per Pi
- **USB audio setup**: 5 minutes per Pi
- **Tool response time**: <1s (warmed functions)
- **Conversation length**: 12+ exchanges
- **Phone tone restart**: Immediate after conversation
- **Character consistency**: 100% voice integrity
- **Audio quality**: Clear input/output through handset

---

## 🎭 **EXHIBITION URLS**

- **Pi 1**: `http://192.168.1.100:3000/?exhibition=true`
- **Pi 2**: `http://192.168.1.101:3000/?exhibition=true`
- **Pi 3**: `http://192.168.1.102:3000/?exhibition=true`
- **Pi 4**: `http://192.168.1.103:3000/?exhibition=true`
- **Pi 5**: `http://192.168.1.104:3000/?exhibition=true`

---

## 📞 **SUPPORT COMMANDS**

### **System Status**
```bash
# Check app status
ssh pitstyle@PI_IP "sudo systemctl status exhibition"

# Check logs
ssh pitstyle@PI_IP "sudo journalctl -u exhibition -f"

# Check USB audio
ssh pitstyle@PI_IP "pactl list short sinks | grep usb"
```

### **Restart Services**
```bash
# Restart exhibition app
ssh pitstyle@PI_IP "sudo systemctl restart exhibition"

# Restart audio system
ssh pitstyle@PI_IP "systemctl --user restart pulseaudio"
```

---

**🎯 Time per Pi: 35 minutes total (30 min deploy + 5 min audio setup)**  
**📱 Emergency Contact: Check systemd logs for detailed error messages**