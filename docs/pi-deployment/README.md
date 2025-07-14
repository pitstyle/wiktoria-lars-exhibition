# Pi Deployment Documentation

## 📖 Reading Order

### 1. **Start Here: [LESSONS_LEARNED.md](./LESSONS_LEARNED.md)**
**🚨 CRITICAL - READ FIRST**
- Key issues to avoid from previous deployments
- Hardware requirements (USB audio adapters)
- Software compatibility issues (Next.js 13.5.6)
- Quick fixes reference

### 2. **Main Guide: [RASPBERRY_PI_DEPLOYMENT.md](./RASPBERRY_PI_DEPLOYMENT.md)**
Complete step-by-step deployment process:
- SSH deployment method (recommended)
- Pi system setup
- USB audio configuration
- Service configuration
- Exhibition mode setup

### 3. **Historical Context: [TODAYS_CRITICAL_LEARNINGS.md](./TODAYS_CRITICAL_LEARNINGS.md)**
January 12, 2025 deployment session findings:
- Working solution confirmation
- Tool registration fixes
- Audio setup process
- File synchronization issues

### 4. **System Setup: [PI_SYSTEM_SETUP.md](./PI_SYSTEM_SETUP.md)**
Pi-specific system configuration details

## 🎯 Key Changes for Current Clean Codebase

### ✅ Improvements Applied
- **USB Audio**: No more Bluetooth complexity
- **Simplified Interface**: User silence timeout removed
- **Optimized Build**: 158 kB (was 246 kB)
- **ARM Compatibility**: Next.js 13.5.6 requirement documented

### 🚫 Issues Resolved
- Tool registration problems
- API authentication format
- Agent speech after tools
- File synchronization chaos
- SWC binary errors on ARM

## 🚀 Quick Deployment Summary

1. **Prerequisites**: Pi 4 + USB audio adapter + handset
2. **SSH Deploy**: `scp -r` cleaned codebase to Pi
3. **Install**: Next.js 13.5.6 (ARM compatible)
4. **Configure**: USB audio as default
5. **Start**: Browser in exhibition mode
6. **Test**: Voice activation and agent handoffs

## ⚠️ Critical Requirements

- **Browser Required**: WebRTC needs Chromium browser
- **USB Audio**: Pi's 3.5mm jack doesn't support microphones
- **Next.js 13.5.6**: Version 14+ has ARM compatibility issues
- **Tool Registration**: Debug and verify all tools reach Ultravox