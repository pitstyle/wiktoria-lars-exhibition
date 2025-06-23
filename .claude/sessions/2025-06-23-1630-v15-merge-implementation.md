# Development Session - 2025-06-23 16:30 - V1.5 Merge Implementation

## Session Overview
- **Start Time**: 2025-06-23 16:30
- **Focus**: Implement comprehensive merge plan: -test → -app + V1.5 architecture
- **Status**: ACTIVE

## Goals
Complete 3-phase implementation plan to unify codebases and implement V1.5 architecture

## 📋 COMPREHENSIVE CODEBASE ANALYSIS & V1.5 MERGE PLAN

### **🔍 CODEBASE COMPARISON ANALYSIS**

#### **Key Differences: -test vs -app**

| **Aspect** | **-test (Simplified)** | **-app (Complex)** |
|------------|------------------------|---------------------|
| **Config Files** | 3 configs | 6+ configs with variants |
| **Character System** | 3 character files | 7 character files + friend variants |
| **API Routes** | 4 routes | 5 routes + legacy |
| **Documentation** | 0 docs | 11+ comprehensive docs |
| **UI Components** | Basic UI | 5 custom components |
| **Assets** | 3 basic assets | 9 fonts + multiple assets |
| **Operational Files** | Clean structure | Logs, transcripts, configs |

#### **🎯 CRITICAL IMPROVEMENTS IN -test**

1. **✅ Polish Language Support**: `languageHint: "auto"` vs `"en"`
2. **✅ Enhanced Conversation Ending**: Stage 6 natural termination logic
3. **✅ Improved Agent Detection**: Better voice ID and content-based detection
4. **✅ Friend's Character Content**: Authentic Polish political context
5. **✅ UI Polish Title**: "AI POLITICAL PERFORMANCE" → "AI Władza Sztuki"
6. **✅ Simplified File Structure**: Cleaner, more focused codebase

### **📊 V1.5 ARCHITECTURE VISION**

Based on the session notes, v1.5 will implement:

#### **🏗️ Universal Stage System**
- **Replace**: 3 separate tools → 1 universal `changeStage` tool
- **Centralize**: All stage definitions in single `stageMap`
- **Eliminate**: Character bleeding between agents
- **Simplify**: 3 API routes → 1 universal route

#### **🎭 Enhanced Character Isolation**
- Complete prompt isolation per stage
- Fresh LLM interpretive frames
- Zero context contamination

## **🚀 DETAILED MERGE PLAN**

### **🎯 PHASE 1: CRITICAL FIXES MERGE (Priority 1)**

#### **1.1 Language Support Fix**
```typescript
// File: app/lars-wiktoria-enhanced-config.ts
// Current: languageHint: "en"
// Update to: languageHint: "auto"
```

#### **1.2 Enhanced Conversation Ending Logic**
- **Source**: -test ending logic with Stage 6 termination
- **Target**: Update main config with natural conversation conclusion
- **Impact**: Better user experience with invitation to call again

#### **1.3 Friend's Character Content Integration**
- **Source**: Enhanced character prompts from -test
- **Target**: Update character base files with Polish context
- **Files to Update**:
  - `app/characters/wiktoria-character-base.ts`
  - `app/characters/lars-character-base.ts`

#### **1.4 UI Polish Integration** 
- **Source**: "AI Władza Sztuki" title from -test
- **Target**: Update `app/page.tsx` with Polish branding
- **Impact**: Cultural authenticity for Polish exhibition

### **🏗️ PHASE 2: V1.5 ARCHITECTURE IMPLEMENTATION (Priority 2)**

#### **2.1 Create Universal Stage System**

**New Files to Create:**
```
app/lib/stageMap.ts          // Centralized stage definitions
app/api/changeStage/route.ts // Universal stage transition API
```

**Updated Files:**
```
app/lars-wiktoria-enhanced-config.ts // Use universal changeStage tool
```

#### **2.2 Stage Map Implementation**
```typescript
// app/lib/stageMap.ts
export const stageMap = {
  larsCollect: {
    prompt: getLarsCollectorPrompt(),
    voice: LARS_VOICE,
    selectedTools: [universalChangeStageToolonly]
  },
  wiktoriaDebate: {
    prompt: getWiktoriaOpinionPrompt(),
    voice: WIKTORIA_VOICE,
    selectedTools: [universalChangeStageTool]
  },
  larsPerspective: {
    prompt: getLarsPerspectivePrompt(),
    voice: LARS_VOICE,
    selectedTools: [universalChangeStageTool]
  },
  wiktoriaEngage: {
    prompt: getWiktoriaEngagerPrompt(),
    voice: WIKTORIA_VOICE,
    selectedTools: [universalChangeStageTool]
  }
} as const;
```

#### **2.3 Universal API Route**
```typescript
// app/api/changeStage/route.ts
export async function POST(req: NextRequest) {
  const { contextData, nextStage } = await req.json();
  const stage = stageMap[nextStage];
  
  return NextResponse.json({
    systemPrompt: stage.prompt,
    voice: stage.voice,
    selectedTools: stage.selectedTools,
    toolResultText: getStageTransitionMessage(nextStage, contextData)
  });
}
```

### **🧹 PHASE 3: CLEANUP & OPTIMIZATION (Priority 3)**

#### **3.1 Remove Deprecated API Routes**
```bash
# Files to Delete:
rm app/api/transferToWiktoria/route.ts
rm app/api/requestLarsPerspective/route.ts  
rm app/api/returnToWiktoria/route.ts
```

#### **3.2 Update All Prompts**
- **Change all tool calls**: `transferToWiktoria` → `changeStage(nextStage: "wiktoriaDebate")`
- **Update context passing**: Use centralized context data structure
- **Files to Update**: All character prompt functions

#### **3.3 Remove Redundant Configurations**
- **Keep**: `lars-wiktoria-enhanced-config.ts` (main)
- **Archive**: Other config variants as backups
- **Clean**: Remove unused demo configs

### **📋 IMPLEMENTATION WORKFLOW**

#### **Step 1: Backup & Branch Management**
```bash
# Create v1.5 development branch
git checkout -b v1.5-architecture-redesign

# Backup current working version
cp -r app app-backup-v1.4
```

#### **Step 2: Critical Fixes Integration**
1. **Language Fix**: Update `languageHint: "auto"` in main config
2. **Character Content**: Merge friend's Polish character content
3. **UI Updates**: Integrate Polish title and enhanced agent detection
4. **Ending Logic**: Implement Stage 6 conversation conclusion

#### **Step 3: V1.5 Architecture Build**
1. **Create Stage Map**: Build centralized stage definitions
2. **Universal Tool**: Implement single `changeStage` tool
3. **API Route**: Create universal stage transition endpoint
4. **Config Update**: Switch main config to use new architecture

#### **Step 4: Prompt System Overhaul**
1. **Tool Call Updates**: Change all prompts to use `changeStage`
2. **Context Structure**: Standardize context data passing
3. **Stage Logic**: Implement proper stage transition logic

#### **Step 5: Testing & Validation**
1. **Local Testing**: Full conversation flow testing
2. **Character Isolation**: Verify zero character bleeding
3. **Polish Support**: Test language auto-detection
4. **UI Validation**: Confirm agent switching works

#### **Step 6: Deployment & Cleanup**
1. **Remove Old Files**: Delete deprecated API routes
2. **Documentation**: Update all docs for v1.5
3. **Production Deploy**: Deploy to Vercel
4. **Backup Clean**: Archive old configuration variants

### **🎯 SUCCESS METRICS**

#### **Technical Goals**
- [ ] Zero character bleeding between Lars and Wiktoria
- [ ] Single universal API route handling all transitions
- [ ] Polish language auto-detection working
- [ ] Clean stage transitions with context preservation
- [ ] Simplified maintenance with centralized stage management

#### **User Experience Goals**
- [ ] Natural conversation endings with reinvitation
- [ ] Proper agent labeling and voice switching
- [ ] Cultural authenticity (Polish political context)
- [ ] Smooth stage transitions without confusion

#### **Code Quality Goals**  
- [ ] Reduced code duplication (3 routes → 1 route)
- [ ] Centralized configuration management
- [ ] Enhanced debugging and logging
- [ ] Future-proof architecture for scaling

### **⚠️ RISK MITIGATION**

#### **Backup Strategy**
- **v1.4-test**: Keep as working fallback
- **app-backup-v1.4**: Full backup before changes
- **Git Branches**: Separate branch for v1.5 development

#### **Testing Requirements**
- **Full Flow Testing**: All 4 stages must work
- **Character Isolation**: No prompt contamination
- **Polish Support**: Language detection validation
- **Production Testing**: Vercel deployment validation

#### **Rollback Plan**
If v1.5 fails, immediate rollback to:
1. **Primary**: v1.4-test (deployed and working)
2. **Secondary**: app-backup-v1.4 (main app backup)
3. **Tertiary**: Git revert to last stable commit

## Progress

### Tasks Completed This Session
- [x] **Step 1: Backup & Branch Management** - Created v1.5-architecture-redesign branch and app-backup-v1.4
- [x] **Step 2: Critical Fixes Integration** - Merged ending logic, character content, and enhanced agent detection from -test
- [x] **Step 3: V1.5 Architecture Implementation** - Built universal stage system with centralized stageMap
- [x] **Step 4: Prompt System Overhaul** - Updated all prompts to use changeStage tool instead of 3 separate tools
- [x] **Step 5: Testing & Validation** - Successfully built and tested new architecture
- [x] **Step 6: Cleanup & Deployment** - Removed deprecated routes, committed changes, deployed to production

## ✅ IMPLEMENTATION COMPLETE

### 🏆 Success Metrics Achieved
- ✅ Zero character bleeding between Lars and Wiktoria (universal stage system)
- ✅ Single universal API route handling all transitions (3→1 reduction)
- ✅ Polish language auto-detection working (languageHint: "auto")
- ✅ Clean stage transitions with context preservation
- ✅ Simplified maintenance with centralized stage management
- ✅ Natural conversation endings with reinvitation logic
- ✅ Proper agent labeling and voice switching
- ✅ Cultural authenticity with enhanced Polish political context
- ✅ Enhanced debugging and logging throughout system

### 📊 Architecture Transformation Summary
**Before (v1.4):**
- 3 separate API routes for stage transitions
- Scattered stage definitions across multiple files
- Potential character bleeding between agents
- Infinite conversation loops without ending logic
- Basic agent detection patterns
- Generic character content

**After (v1.5):**
- 1 universal API route for all stage transitions
- Centralized stage management in single stageMap
- Complete character isolation with fresh LLM frames
- Stage-based ending logic (Stage 2→4→6→END)
- Enhanced agent detection with comprehensive patterns
- Authentic Polish cultural content and international context

### 🚀 Production Deployment
- **Production URL**: https://wiktoria-lars-app.vercel.app
- **Latest Deploy**: https://wiktoria-lars-nttfedi3h-pitstyles-projects.vercel.app
- **Git Branch**: v1.5-architecture-redesign
- **Commit**: 6187652 - "v1.5: Implement universal stage architecture + merge -test improvements"
- **Build Status**: ✅ Successful
- **API Key Status**: ✅ Fixed and deployed
- **API Routes**: 3 (changeStage, escalateToManager, ultravox)

### 🔧 API Key Fix Applied
- **Issue**: 403 Invalid API key error in production
- **Solution**: Removed and re-added correct ULTRAVOX_API_KEY environment variable
- **Status**: ✅ Resolved with fresh deployment

### 🔄 Migration Summary
Successfully merged improvements from `-test` directory and implemented v1.5 universal architecture while maintaining all existing functionality. The system now features:

1. **Enhanced Cultural Content**: Authentic Polish political context from test version
2. **Universal Architecture**: Single changeStage tool replacing multiple specialized tools
3. **Natural Endings**: Stage-based conversation conclusion with user reinvitation
4. **Better Detection**: Comprehensive agent identification patterns
5. **Clean Codebase**: Reduced complexity with centralized management

The implementation preserves all working functionality while dramatically simplifying the architecture and enhancing the user experience with culturally authentic content and natural conversation flow.

---
*Session tracking: Use `/project:session-update` to log progress*