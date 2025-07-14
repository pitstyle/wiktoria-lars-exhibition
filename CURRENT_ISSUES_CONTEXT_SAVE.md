# CURRENT ISSUES - CONTEXT SAVE
**Date:** July 13, 2025  
**Status:** CRITICAL ISSUES - App partially working but stage logic broken

## 🚨 CRITICAL ISSUES IDENTIFIED

### 1. **SILENCE DETECTION NOT WORKING**
- **Problem:** True silence detection implementation isn't triggering properly
- **Expected:** Call should end after 12s of no speech from anyone (user OR agent)
- **Actual:** Silence detection not functioning as expected
- **Files affected:** `app/components/ExhibitionInterface.tsx` (silence detection logic)

### 2. **STAGE LOGIC BROKEN**
- **Problem:** No Lars after collection phase
- **Expected:** Lars → transferToWiktoria → Wiktoria → requestLarsPerspective → Lars → returnToWiktoria → Loop
- **Actual:** Missing Lars responses, broken handoff flow
- **Files affected:** `app/lars-wiktoria-enhanced-config.ts`, tool configuration

### 3. **APP NOT RETURNING TO START AFTER ENDCALL**
- **Problem:** App doesn't return to waiting state after call ends
- **Expected:** Call ends → Return to waiting state with phone tone → Ready for next user
- **Actual:** App stuck, doesn't reset to exhibition waiting mode
- **Files affected:** `app/components/ExhibitionInterface.tsx` (returnToWaitingState logic)

### 4. **WIKTORIA NEVER TRANSFERS TO LARS**
- **Problem:** Wiktoria doesn't use requestLarsPerspective tool properly
- **Expected:** Wiktoria asks user question → User responds → Wiktoria calls requestLarsPerspective
- **Actual:** Tool calls missing or not triggering Lars responses
- **Files affected:** Tool calling logic, prompt configuration

### 5. **NO ULTRAVOX ERRORS** (Good)
- **Status:** ✅ No tool errors showing in Ultravox logs
- **This means:** Tool registration is working, issue is in logic flow

## 📋 RECENT CHANGES MADE

### ✅ COMPLETED FIXES:
1. **Removed phantom tools** - `closeConversationTool`, `terminateSessionTool` from selectedTools
2. **Fixed selectedTools array** - Now contains only: `transferToWiktoriaTool`, `requestLarsPerspectiveTool`, `returnToWiktoriaTool`
3. **Removed requestUserResponse references** - Tool never existed, was causing errors
4. **Preserved audio improvements** - AudioContext overlay system still intact
5. **Synced to Pi directories** - All changes applied to main, Pi/, Pi-Deploy/

### 🔧 IMPLEMENTED FEATURES (Working):
- **True silence detection logic** - Code exists but not triggering properly
- **Audio permission handling** - AudioContext overlay system
- **Exhibition interface** - Voice activation, VAD system
- **Tool registration** - No Ultravox errors means tools are registered correctly

## 🎯 NEXT STEPS NEEDED

### Priority 1: Debug Stage Logic Flow
- **Issue:** Lars not appearing after collection
- **Check:** Tool calling sequence, prompt instructions
- **Files:** `app/lars-wiktoria-enhanced-config.ts`, character prompts

### Priority 2: Fix Silence Detection
- **Issue:** True silence polling not working
- **Check:** `checkForSilence()` function, timing logic
- **Files:** `app/components/ExhibitionInterface.tsx:166-180`

### Priority 3: Fix Return to Start
- **Issue:** App not resetting after endCall
- **Check:** `returnToWaitingState()` function
- **Files:** `app/components/ExhibitionInterface.tsx` (around line 220)

### Priority 4: Debug Wiktoria → Lars Handoff
- **Issue:** requestLarsPerspective not triggering Lars responses
- **Check:** Tool response handling, character prompts
- **Files:** `/api/requestLarsPerspective/route.ts`

## 📁 KEY FILES TO FOCUS ON

### Main Configuration:
- `app/lars-wiktoria-enhanced-config.ts` - Tool definitions and prompts
- `app/components/ExhibitionInterface.tsx` - Silence detection and state management

### API Routes (Should be working):
- `/api/transferToWiktoria/route.ts` ✅
- `/api/requestLarsPerspective/route.ts` ❓ (check response)
- `/api/returnToWiktoria/route.ts` ❓ (check response)

### Character Files:
- `app/characters/lars-character-base.ts`
- `app/characters/wiktoria-character-base.ts`

## 🔍 DEBUGGING APPROACH

1. **Test basic flow:** Start exhibition → Voice trigger → Lars collection → transferToWiktoria
2. **Check tool responses:** Verify each API route returns proper responses
3. **Monitor console logs:** Look for silence detection logs, tool call logs
4. **Check transcript flow:** Ensure user/agent speech tracking works
5. **Verify state transitions:** App should return to waiting after any call end

## 💾 WORKING REFERENCE

- **Last working transcript:** `transcript_1_6_1.txt` (July 10) - Shows proper Lars ↔ Wiktoria flow
- **GitHub branch:** `origin/stage_logic_new_prompts` - Reference for working configuration
- **Current branch:** `stage_logic_new_prompts` - Local changes applied

## ⚠️ PRESERVE THESE IMPROVEMENTS

- ✅ True silence detection code structure (even if not working)
- ✅ AudioContext permission handling
- ✅ Exhibition interface enhancements
- ✅ VAD and voice activation fixes
- ✅ Pi deployment structure

---

**RESUME POINT:** Debug stage logic flow - why Lars doesn't appear after collection phase. Start with checking tool responses and prompt instructions.