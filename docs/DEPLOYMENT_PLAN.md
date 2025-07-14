# Pi Deployment Plan - Clean Code to Exhibition Ready

## 🎯 Current Status (Jan 14, 2025)

### ✅ Completed Phase 1 & 2
- **Codebase Cleaned**: Removed 14 unused API routes, optimized to 158 kB
- **Documentation Recovered**: All Pi deployment docs moved to `docs/` structure
- **Lessons Learned**: USB audio (no Bluetooth), Next.js 13.5.6 requirement, tool registration issues
- **User Silence Timeout**: Removed complex polling system for Pi optimization

### 📋 Active Todos
1. ✅ **Recover critical Pi documentation from git**
2. ✅ **Read and analyze recovered Pi documentation for lessons learned**  
3. ✅ **Create documentation structure based on learnings**
4. 🔄 **Set up git strategy for clean code deployment** (IN PROGRESS)
5. ⏸️ **Prepare Pi-specific build with learned optimizations** (PENDING)
6. ⏸️ **Deploy and test on Pi hardware** (PENDING)

## 🚀 Next Phases (Post-Context Clear)

### Phase 3: Git Strategy & Clean Branch
**Objective**: Organize cleaned code for production deployment

**Tasks**:
- [ ] Create `pi-production-v2` branch from current cleaned state
- [ ] Tag as `v2.0-pi-informed` with lessons learned applied
- [ ] Push cleaned code with documentation structure
- [ ] **Decision Point**: Use existing `wiktoria-lars-exhibition` repo or new branch

**Key Considerations**:
- Preserve clean codebase state
- Include complete documentation structure
- Maintain version history for rollback capability

### Phase 4: Pi Build Preparation
**Objective**: Apply Pi-specific optimizations from lessons learned

**Tasks**:
- [ ] Configure Next.js 13.5.6 for ARM compatibility
- [ ] Add `.babelrc` with `{"presets": ["next/babel"]}` 
- [ ] Remove any remaining SWC dependencies
- [ ] Test build process with Pi memory constraints
- [ ] Verify all tool registration debugging is in place

**Critical Requirements**:
- **Next.js Version**: Must be 13.5.6 (not 14+) for ARM support
- **Build Size**: Keep under 200 kB for Pi performance
- **Tool Registration**: Debug logging to verify tools reach Ultravox
- **API Headers**: Ensure `X-API-Key` format (not `Authorization: Bearer`)

### Phase 5: Pi Deployment & Testing
**Objective**: Deploy and verify exhibition-ready system

**Tasks**:
- [ ] SSH deployment to Pi hardware using documented process
- [ ] USB audio adapter configuration and testing
- [ ] Exhibition mode verification (`?exhibition=true`)
- [ ] Voice activation responsiveness testing
- [ ] Agent handoff flow testing (Lars ↔ Wiktoria)
- [ ] Database integration verification
- [ ] 8-hour continuous operation test

**Hardware Setup**:
- Raspberry Pi 4 with USB audio adapter (TRRS/4-pole)
- Handset with 3.5mm TRRS connector
- Ethernet connection for stability
- Chromium browser in kiosk mode

## 🔑 Critical Lessons Applied

### From Documentation Analysis
1. **USB Audio Solution**: No Bluetooth complexity, direct handset connection
2. **Browser Requirement**: WebRTC needs Chromium browser (not terminal WebSocket)
3. **ARM Compatibility**: Next.js 13.5.6 mandatory for Pi deployment
4. **Tool Registration**: Add debug logging to verify tools reach Ultravox API
5. **Agent Speech Issue**: May need to remove `X-Ultravox-Agent-Reaction` headers entirely

### From Code Cleaning
1. **Simplified Interface**: User silence timeout removed for better Pi performance
2. **Optimized Build**: 158 kB main bundle (down from 246 kB)
3. **Core Functionality**: Agent handoffs, voice activation, database integration preserved
4. **Exhibition Mode**: Voice-only operation ready for art installation

## 📁 Documentation Structure Ready

```
docs/
├── pi-deployment/     # Complete deployment guides with lessons learned
├── exhibition-setup/  # Exhibition configuration and requirements  
├── troubleshooting/   # Common issues and emergency procedures
└── pi-issues/        # Legacy reference (Bluetooth deprecated)
```

## ✅ Success Criteria

### Technical Verification
- [ ] Clean build completes without errors
- [ ] All 5 core API routes functional
- [ ] Voice activation triggers conversation start
- [ ] Agent handoffs work smoothly (Lars ↔ Wiktoria)
- [ ] Database saves conversations correctly
- [ ] Exhibition mode auto-starts on boot

### Exhibition Readiness
- [ ] No keyboard/mouse interaction needed
- [ ] 8+ hour continuous operation
- [ ] Audio quality suitable for public use
- [ ] Error recovery and auto-restart functional
- [ ] Monitoring and debugging accessible via SSH

## 🔗 Related Files

- **Session Record**: `.claude/sessions/2025-01-14-1400.md`
- **Project Instructions**: `CLAUDE.md` (may need restoration)
- **Core Configuration**: `app/lars-wiktoria-enhanced-config.ts`
- **Documentation**: `docs/README.md` for complete guide structure