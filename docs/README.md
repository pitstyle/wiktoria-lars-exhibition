# Wiktoria-Lars Documentation

## 📁 Documentation Structure

### 🚀 [Pi Deployment](./pi-deployment/)
Complete guides for deploying the cleaned codebase to Raspberry Pi hardware:
- **LESSONS_LEARNED.md** - Critical issues and solutions learned from previous deployments
- **RASPBERRY_PI_DEPLOYMENT.md** - Complete step-by-step deployment guide
- **TODAYS_CRITICAL_LEARNINGS.md** - January 12, 2025 deployment session findings
- **PI_SYSTEM_SETUP.md** - Pi system configuration

### 🎭 [Exhibition Setup](./exhibition-setup/)
Configuration for art exhibition requirements:
- **SYSTEM_MANUAL.md** - Complete system operation manual
- Exhibition-specific settings and kiosk mode configuration

### 🛠️ [Troubleshooting](./troubleshooting/)
Solutions for common issues and debugging guides:
- **CRITICAL_FIXES_AND_FINDINGS.md** - Historical fixes and known issues

### ⚠️ [Pi Issues](./pi-issues/)
Reference documentation for Pi-specific problems:
- **PI_BLUETOOTH_HEADPHONES.md** - Legacy Bluetooth setup (replaced by USB adapters)

## 🎯 Quick Start for Pi Deployment

1. **Read first**: [Lessons Learned](./pi-deployment/LESSONS_LEARNED.md)
2. **Follow**: [Pi Deployment Guide](./pi-deployment/RASPBERRY_PI_DEPLOYMENT.md)
3. **If issues**: Check [Troubleshooting](./troubleshooting/)

## 📋 Current Clean Codebase Status

✅ **Optimized for Pi**:
- User silence timeout removed (simplified)
- 14 unused API routes removed
- Development files cleaned
- Font files optimized
- Build size: 158 kB (down from 246 kB)

✅ **Core Functionality Preserved**:
- Exhibition voice interface
- Agent handoff system (Lars ↔ Wiktoria)
- Database integration
- Voice activation
- Transcript saving

## 🔗 Related Files

- `CLAUDE.md` - Main project instructions for Claude Code
- `.claude/sessions/` - Development session history
- Root level configuration files for the cleaned codebase