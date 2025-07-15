# Transcript Saving Fix

## Issue Description
The `full_transcript` field in Supabase conversations table was always empty, despite having a working endCall route with bulletproof transcript saving logic.

## Root Cause Analysis

### Investigation Results
Using the conversation ID `1abab51e-1403-44c4-8886-72ae151fc761`:
- ✅ Conversation record existed with name and topic
- ❌ `full_transcript` field was empty
- ❌ `end_time` was null
- ✅ Ultravox API had 27 messages available
- ✅ Manual transcript save worked perfectly

### The Problem
The `endCall()` function in `lib/callFunctions.ts` was only calling `uvSession.leaveCall()` but **not triggering the endCall API route** that contains the transcript saving logic.

```typescript
// BEFORE (broken):
export async function endCall(): Promise<void> {
  console.log('Call ended.');
  if (uvSession) {
    uvSession.leaveCall();
    uvSession = null;
  }
}
```

The endCall API route (`/api/endCall`) contains a bulletproof 3-tier fallback system:
1. **Tier 1**: Fetch from Ultravox API
2. **Tier 2**: Create minimal transcript from conversation data
3. **Tier 3**: Save error transcript as last resort

But this route was never being called!

## Solution Applied

### 1. Store Call ID During Call Creation
```typescript
// In createCall function
let currentCallId: string | null = null;

// Store the call ID for later use in endCall
currentCallId = data.callId;
console.log('📞 Stored call ID:', currentCallId);
```

### 2. Enhanced endCall Function
```typescript
export async function endCall(): Promise<void> {
  console.log('Call ended.');

  if (uvSession) {
    // Use the stored call ID
    const callId = currentCallId;
    console.log('🔚 Ending call with ID:', callId);
    
    // End the Ultravox session
    uvSession.leaveCall();
    uvSession = null;
    
    // Call the endCall API route to save the transcript
    if (callId) {
      try {
        console.log('🔄 Calling endCall API route to save transcript...');
        const response = await fetch('/api/endCall', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            callId: callId,
            contextData: {
              userName: 'Exhibition User',
              lastSpeaker: 'system'
            }
          }),
        });
        
        if (response.ok) {
          console.log('✅ EndCall API route called successfully');
        } else {
          console.error('❌ EndCall API route failed:', response.status);
        }
      } catch (error) {
        console.error('❌ Error calling endCall API route:', error);
      }
    } else {
      console.warn('⚠️ No call ID available for transcript saving');
    }
    
    // Clear the stored call ID
    currentCallId = null;
  }
}
```

### 3. Preserved Exhibition Flow
The fix maintains the existing exhibition flow:
1. `endCall()` is called (now saves transcript)
2. `returnToWaitingState('call ended')` is called (preserves auto-return to start page)
3. Tone and VAD functionality remains intact

## Expected Results

### Before Fix:
- Conversation record created with name and topic
- `full_transcript` field: **EMPTY**
- `end_time`: **NULL**
- No transcript saving despite working API route

### After Fix:
- Conversation record created with name and topic
- `full_transcript` field: **POPULATED** with Ultravox API data
- `end_time`: **SET** to call end time
- Transcript saved automatically via bulletproof 3-tier system

## Technical Implementation

### Call Flow:
1. **Call Creation**: `createCall()` stores `callId` in `currentCallId`
2. **During Call**: Conversation proceeds normally
3. **Call End**: `endCall()` triggers API route with stored `callId`
4. **Transcript Saving**: 3-tier fallback system ensures transcript is saved
5. **Return to Start**: Exhibition returns to waiting state with tone

### Files Modified:
- `/lib/callFunctions.ts`: Enhanced `endCall()` function and call ID storage
- `/app/api/endCall/route.ts`: Already had working 3-tier fallback system
- `/lib/supabase.ts`: Already had working `saveFullTranscript()` function

### Fallback System (unchanged):
1. **Tier 1**: Fetch full transcript from Ultravox API
2. **Tier 2**: Create minimal transcript from conversation data
3. **Tier 3**: Save error transcript as absolute last resort

## Testing Verification

### Manual Test Results:
```
🔍 Debugging conversation: 1abab51e-1403-44c4-8886-72ae151fc761
✅ Ultravox API response: 27 messages
💾 Attempting to save transcript to Supabase...
✅ Transcript saved successfully!
```

### Expected Automatic Behavior:
- All future conversations will automatically save transcripts
- Exhibition flow preserved (auto-return to start page)
- Tone and VAD functionality maintained
- Bulletproof saving ensures no transcript loss

## Benefits

1. **Automatic Transcript Saving**: No manual intervention needed
2. **Bulletproof Reliability**: 3-tier fallback system prevents data loss
3. **Exhibition Ready**: Maintains auto-return and tone functionality
4. **Data Archiving**: Complete conversation data preserved for art installation