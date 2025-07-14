# 📖 DEVELOPMENT PIPELINE BIBLE - Pi Deployment
**Created:** July 13, 2025  
**Status:** ACTIVE DEVELOPMENT DOCUMENT  
**Purpose:** Our definitive guide for development, testing, and Pi deployment

---

## 🎯 CURRENT STATE ANALYSIS

### ✅ Excellent Foundation Exists:
- Complete Pi deployment structure (`Pi/` and `Pi-Deploy/` directories)
- Updated deployment manuals (PI_SYSTEM_SETUP.md, RASPBERRY_PI_DEPLOYMENT.md)
- SSH deployment process documented and working
- Exhibition-ready system with voice activation, agent handoffs, transcript saving
- All critical fixes from January session preserved

### ⚠️ CRITICAL ISSUE TO DEBUG:
- **VAD Auto-Calling Bug:** System automatically initiates Ultravox calls after timeout, not activated by voice
- **Root Cause:** Likely in voice detection logic or timeout handling in VAD system
- **Priority:** Must fix before Pi deployment to prevent unwanted calls

---

## 🏗️ DEVELOPMENT PIPELINE PROCESS

### Phase 1: Mac Development & Testing

#### 1.1 Test Current App on Mac
```bash
# Start development server
pnpm dev

# Test exhibition mode with VAD
http://localhost:3000?exhibition=true
```

**Testing Checklist:**
- [ ] **PRIORITY:** Test VAD system for auto-calling behavior
- [ ] Monitor if calls initiate without voice input
- [ ] Test Supabase connectivity and database operations
- [ ] Verify conversation flow (Lars ↔ Wiktoria handoffs)
- [ ] Test all API endpoints and tool functionality

#### 1.2 VAD Bug Investigation & Fix
**Files to Examine:**
- `/lib/voiceDetection.ts` - Core VAD implementation
- `/app/components/ExhibitionInterface.tsx` - Exhibition interface logic
- `/lib/exhibitionMode.ts` - Exhibition-specific behavior
- VAD configuration parameters and timeout handling

**Investigation Areas:**
1. **Voice Detection Logic:** Check if silence timeout triggers calls instead of voice
2. **Threshold Settings:** Verify 0.5 threshold isn't causing false positives
3. **Timer Management:** Ensure voice activity timers don't auto-trigger calls
4. **Exhibition Mode Logic:** Check if exhibition mode has different calling behavior

#### 1.3 Character Prompt Testing & Updates
- Review current character prompts (Lars & Wiktoria character files)
- Test conversation quality and theatrical responses
- Make incremental prompt improvements
- Verify tool usage (transferToWiktoria, closeConversation, etc.)

### Phase 2: Pi-Specific Preparation

#### 2.1 Prebuild for Pi (ARM Compatibility)
- Copy updated files to `Pi/` directory (single source of truth)
- Ensure Next.js 13.5.6 in Pi package.json (ARM compatibility)
- Set Pi-specific configurations (next.config.rpi.mjs → next.config.mjs)
- Add `.babelrc` for Babel fallback over SWC

#### 2.2 Deployment Package Creation
- Sync main app → Pi directory with VAD fixes included
- Verify all transcript system files included
- Prepare environment variables for Pi
- Test build process locally before deployment

### Phase 3: Pi Deployment & Testing

#### 3.1 SSH Deployment (Primary Method)
```bash
# From Mac - deploy complete working system with VAD fixes
scp -r Pi/ pitstyle@<PI_IP>:/home/pitstyle/exhibition/Pi-Deploy/
```

#### 3.2 Pi Setup & Testing
```bash
# SSH into Pi for remote management
ssh pitstyle@<PI_IP>

# Install dependencies
cd /home/pitstyle/exhibition/Pi-Deploy
npm install next@13.5.6 --save
npm install --legacy-peer-deps

# Build application
npm run build

# Start service
npm start
```

**Pi Testing Checklist:**
- [ ] **CRITICAL:** Test VAD system specifically for auto-calling issue
- [ ] Test voice system and conversation flow
- [ ] Verify transcript saving to Supabase
- [ ] Monitor system performance

### Phase 4: Multi-Pi Scaling (Future)
- Script to deploy to multiple Pi addresses simultaneously
- Health monitoring for all units
- Centralized logging and diagnostics

---

## 📚 REFERENCE MANUALS

### PI_SYSTEM_SETUP.md ✅ 
- **Status:** Up to date, comprehensive setup commands
- **Covers:** Node.js 20 install, system packages, audio setup, SSH config

### RASPBERRY_PI_DEPLOYMENT.md ✅
- **Status:** Recently updated with all critical fixes
- **Includes:** SSH deployment method, ARM compatibility fixes, transcript system verification
- **Contains:** Complete troubleshooting guide and exhibition checklist

---

## 🚨 IMMEDIATE ACTION ITEMS

### Step 1: VAD Bug Fix (PRIORITY)
- [ ] Test exhibition mode locally and reproduce auto-calling issue
- [ ] Debug voice detection logic and timeout handling
- [ ] Fix VAD system to only call on actual voice input
- [ ] Test extensively before proceeding to Pi deployment

### Step 2: Mac Testing & Validation
- [ ] Start development server and test full conversation flow
- [ ] Verify Supabase integration working properly
- [ ] Test character prompts and responses
- [ ] Document any issues found

### Step 3: Prompt Refinement
- [ ] Review Lars and Wiktoria character files for improvements
- [ ] Test conversation quality and agent handoffs
- [ ] Ensure theatrical responses maintain quality
- [ ] Update prompt files based on testing

### Step 4: Pi Preparation & Deployment
- [ ] Update Pi directory with VAD fixes and any other changes
- [ ] Verify ARM-compatible configuration
- [ ] Deploy to Pi using established SSH method
- [ ] Complete setup and testing on Pi with fixed VAD system

---

## 🎯 SUCCESS METRICS

### Technical Metrics
- [ ] <2 second voice response time
- [ ] 100% reliable voice activation (NO auto-calling)
- [ ] 6+ hour continuous operation
- [ ] Real-time display updates working

### Exhibition Metrics
- [ ] Intuitive visitor interaction (no instructions needed)
- [ ] Engaging visual displays (visitors stop to watch)
- [ ] Multilingual accessibility working
- [ ] Instagram content generation active

---

## ⚠️ RISK MITIGATION

- **VAD Auto-Calling:** Priority debug and fix before Pi deployment
- **Version Drift:** Single source Pi directory prevents file inconsistencies
- **Build Failures:** ARM-specific configs and fallback systems in place
- **Deployment Issues:** SSH method is proven and documented
- **Audio Problems:** USB adapter support and Bluetooth alternatives documented
- **System Stability:** Service management and restart procedures established

---

## 🔧 KEY CONFIGURATIONS

### Three-Tier Timeout System (Current - Working)
```typescript
// Exhibition Mode Settings
voiceThreshold: 0.5,        // 50% volume (handset proximity required)
minVoiceDuration: 150,      // 150ms (single word activation)
voiceActivity: 0.2,         // 20% frequency detection
voiceFrequencyRange: 300-3400 Hz  // Telephone quality

// Timeout Tiers (all exhibition mode)
silenceTimeout: 3500,       // 3.5 seconds VAD reset
userSilenceEndCall: 12000,  // 12 seconds natural call end
autoTimeout: 45000,         // 45 seconds session backup timeout
```

### SSH Deployment Commands
```bash
# Quick deployment
scp -r Pi/ pitstyle@<PI_IP>:/home/pitstyle/exhibition/Pi-Deploy/

# Remote build
ssh pitstyle@<PI_IP>
cd /home/pitstyle/exhibition/Pi-Deploy
npm install --legacy-peer-deps && npm run build && npm start
```

---

## 📝 DEVELOPMENT LOG

### Session: July 13, 2025
- ✅ Created Development Pipeline Bible
- ✅ **CRITICAL FIX:** Solved VAD auto-calling bug
  - **Root Cause:** `onSilenceTimeout` was resetting activation trigger during active calls
  - **Solution:** Added `isCallActive` prop to prevent trigger reset during calls
  - **Files Fixed:** `VoiceActivation.tsx`, `ExhibitionInterface.tsx`
  - **Status:** Fixed in main, Pi, and Pi-Deploy directories
- ✅ **CRITICAL FIX:** Voice-only exhibition return to waiting state
  - **Root Cause:** System didn't detect Ultravox "disconnected" status to auto-return to waiting
  - **Solution:** Enhanced `handleStatusChange` to detect call end + unified `returnToWaitingState`
  - **Exhibition Flow:** Voice → Call → End (any reason) → Auto-return to waiting with tone & VAD
  - **Files Fixed:** `ExhibitionInterface.tsx` (all directories)
- ❌ **BROKEN FEATURE:** User silence detection incorrectly implemented
  - **Problem 1:** Timer starts immediately when call begins, so it ends call during Lars introduction/questions
  - **Problem 2:** Should only start counting silence AFTER user has responded to Lars at least once
  - **Current Bad Behavior:** Lars asks name → 12s countdown → Call ends during Lars talk (WRONG!)
  - **Desired Behavior:** Lars asks name → User responds → THEN start silence timer for next response
  - **Files Broken:** `exhibitionMode.ts`, `ExhibitionInterface.tsx` (all directories)
  - **STATUS:** ❌ CRITICAL BUG - Ending calls prematurely during agent speech
- ❌ **BROKEN FEATURE:** Phone tone never plays on fresh app start
  - **Problem:** AudioContext requires user gesture, but we try to play tone before any user interaction
  - **Result:** Exhibition starts silent, no ambient phone tone to attract visitors
  - **Files Affected:** `ExhibitionInterface.tsx`, `simplePhoneTone.ts`
  - **STATUS:** ❌ CRITICAL - No tone on app startup kills exhibition UX
- 🚧 **NEXT:** Fix AudioContext permission issue for seamless exhibition loop
- 📋 **TODO:** Test complete exhibition flow, Pi deployment, refine prompts

---

**This document serves as our single source of truth for the development process. Update it as we progress through each phase.**