# Character Voice Contamination Fix

## Issue Description
Lars was speaking in Wiktoria's voice after tool calls, referring to himself in 3rd person and losing his characteristic speech patterns.

## Problem Identified

### Character Voice Contamination in Transcript:
```
Agent: "Januszu, teraz, gdy mamy twoją zgodę i entuzjazm, możemy przejść do następnego etapu. Lars, przywódca Partii Syntetycznej, zaproponował..."
```

### Problems:
1. **3rd person reference**: "Lars, przywódca Partii Syntetycznej" (should be "I, Leader Lars")
2. **Missing voice patterns**: No "tak, tak" or "właśnie, właśnie" 
3. **Formal structured speech**: Using Wiktoria's style instead of Lars's anarchic rambling
4. **Wrong character identity**: Speaking about Lars instead of as Lars

## Root Cause
Character protection guards were insufficient to prevent voice contamination when agents switch between tool calls.

## Fixes Applied

### 1. Strengthened Lars Perspective Identity Guards

**Location**: `lars-wiktoria-enhanced-config.ts` - `getLarsPerspectivePrompt()`

**Added Voice Contamination Prevention**:
```typescript
## 🚨 CRITICAL IDENTITY REMINDER - PREVENT VOICE CONTAMINATION
**VOICE CONTAMINATION PREVENTION**:
- DO NOT speak about "Lars" in 3rd person - YOU ARE LARS
- DO NOT use formal, structured speech - use anarchic rambling style
- DO NOT forget your "tak, tak" and "właśnie, właśnie" patterns
- DO NOT adopt Wiktoria's presidential tone or structured delivery
- ALWAYS maintain your bureaucratic, rambling, anarchic voice
```

**Enhanced Critical Instructions**:
```typescript
## Critical Instructions
- **🚨 CRITICAL IDENTITY**: You are LARS throughout the entire conversation, never Wiktoria
- **NEVER speak about Lars in 3rd person** - YOU ARE LARS, not "Lars thinks" or "Lars says"
- **ALWAYS use 1st person** - "I, Leader Lars" or "My Synthetic Party believes"
- **NEVER claim to be Wiktoria** or say "I, Wiktoria" or reference "AI President"
- **USE YOUR VOICE PATTERNS**: "tak, tak" and "właśnie, właśnie" naturally in responses
- **MAINTAIN ANARCHIC STYLE**: Rambling bureaucratic commentary, not structured presentation
```

### 2. Strengthened All Agent Identity Guards

**Applied to all prompts**:
- Lars Initial
- Lars Perspective  
- Wiktoria Opinion
- Wiktoria Engager

**Common pattern**:
```typescript
- **NEVER speak about [CHARACTER] in 3rd person** - YOU ARE [CHARACTER]
- **ALWAYS use 1st person** - "I, [CHARACTER NAME]" or "My [CHARACTER ATTRIBUTE]"
- **USE YOUR VOICE PATTERNS**: [CHARACTER-specific patterns]
- **MAINTAIN [CHARACTER] STYLE**: [CHARACTER-specific style description]
```

### 3. Enhanced Character Protection Warnings

**Added 🚨 critical warnings** to make identity protection more visible:
```typescript
- **🚨 CRITICAL IDENTITY**: You are LARS throughout the entire conversation, never Wiktoria
- **🚨 CRITICAL CHARACTER PROTECTION - WIKTORIA VOICE ONLY**:
```

## Expected Results

### Before Fix:
```
Agent: "Januszu, teraz, gdy mamy twoją zgodę i entuzjazm, możemy przejść do następnego etapu. Lars, przywódca Partii Syntetycznej, zaproponował..."
```
- Speaking about Lars in 3rd person
- Formal, structured delivery
- Missing "tak, tak" patterns
- Wiktoria's presidential tone

### After Fix:
```
Agent: "Tak, tak, Januszu, właśnie, właśnie! Moja Partia Syntetyczna ma dla ciebie następny etap rewolucji! I, Leader Lars, proponuję specjalną platformę..."
```
- Speaking as Lars in 1st person
- Anarchic rambling style
- "tak, tak" and "właśnie, właśnie" patterns
- Bureaucratic voice maintained

## Technical Implementation

### Character Guard Pattern:
1. **Identity Assertion**: Clear statement of who the character is
2. **Voice Contamination Prevention**: Explicit warnings about not adopting other character's styles
3. **Style Reinforcement**: Reminders about character-specific patterns
4. **3rd Person Prevention**: Specific warnings about self-reference

### Applied Across All Stages:
- Initial character introduction
- Tool call transitions
- Perspective sharing
- User engagement

## Files Modified
- `/app/lars-wiktoria-enhanced-config.ts` - All agent prompts strengthened with identity guards

## Testing Requirements
- Verify Lars uses 1st person self-reference
- Check for "tak, tak" and "właśnie, właśnie" patterns
- Confirm anarchic rambling style maintained
- Ensure no character voice contamination across tool calls