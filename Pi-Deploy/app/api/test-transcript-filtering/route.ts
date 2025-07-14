import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('Testing enhanced transcript filtering logic...');
  
  // Simulate the enhanced filtering logic from handleTranscriptChange
  const testTranscripts = [
    { speaker: 'agent', text: 'Hello' }, // Too short (5 chars)
    { speaker: 'agent', text: 'Hello there' }, // Still too short (11 chars)
    { speaker: 'agent', text: 'Hello there, how are you doing today?' }, // Good length but no strong completion
    { speaker: 'agent', text: 'Hello there, how are you doing today? I hope you are well.' }, // Complete with strong ending
    { speaker: 'user', text: 'I am doing great, thank you for asking.' }, // Complete user response
    { speaker: 'agent', text: 'I am doing great, thank you for asking. That is wonderful to hear!' }, // Different from user, complete
    { speaker: 'agent', text: 'Well, let me tell you about our program.' }, // Natural conversation pattern
    { speaker: 'agent', text: 'So, anyway, I think we should proceed.' }, // Natural conversation ending
  ];
  
  const lastSavedTranscripts = new Map<string, string>();
  const filteredTranscripts = [];
  
  for (const transcript of testTranscripts) {
    const speakerKey = `${transcript.speaker}`;
    const currentText = transcript.text.trim();
    const lastSavedText = lastSavedTranscripts.get(speakerKey) || '';
    
    // Skip if text is too short (require minimum meaningful length)
    if (currentText.length < 25) {
      console.log(`❌ FILTERED OUT (too short): "${currentText}"`);
      continue;
    }
    
    // Skip if this is just a longer version of what we already saved
    if (lastSavedText && currentText.startsWith(lastSavedText)) {
      const lengthDiff = currentText.length - lastSavedText.length;
      if (lengthDiff < 100) {
        console.log(`❌ FILTERED OUT (not long enough diff): "${currentText}"`);
        continue;
      }
    }
    
    // Enhanced completion detection for full thoughts/sentences
    const hasStrongCompletionIndicator = 
      // Complete sentences with proper endings
      /[.!?]\s*$/.test(currentText) ||
      // Multiple complete sentences
      (currentText.match(/[.!?]/g) || []).length >= 2 ||
      // Natural conversation endings
      currentText.toLowerCase().includes(' well,') ||
      currentText.toLowerCase().includes(' so,') ||
      currentText.toLowerCase().includes(' anyway,') ||
      currentText.toLowerCase().includes(' right.') ||
      currentText.toLowerCase().includes(' okay.') ||
      // Agent-specific completion patterns
      currentText.includes('*') ||
      currentText.toLowerCase().includes('transfer') ||
      currentText.toLowerCase().includes('hand over') ||
      currentText.toLowerCase().includes('colleague');
    
    // More stringent check: only save if clearly complete AND different
    if (hasStrongCompletionIndicator && (!lastSavedText || !currentText.startsWith(lastSavedText))) {
      lastSavedTranscripts.set(speakerKey, currentText);
      filteredTranscripts.push(transcript);
      console.log(`✅ ACCEPTED: "${currentText}"`);
      continue;
    }
    
    // Special case: If no previous text and this seems like a complete statement
    if (!lastSavedText && hasStrongCompletionIndicator && currentText.length > 50) {
      lastSavedTranscripts.set(speakerKey, currentText);
      filteredTranscripts.push(transcript);
      console.log(`✅ ACCEPTED (new complete): "${currentText}"`);
      continue;
    }
    
    console.log(`❌ FILTERED OUT (not complete): "${currentText}"`);
  }
  
  return NextResponse.json({
    success: true,
    message: 'Enhanced transcript filtering test completed',
    results: {
      totalInputs: testTranscripts.length,
      filtered: filteredTranscripts.length,
      rejectionRate: `${Math.round((1 - filteredTranscripts.length / testTranscripts.length) * 100)}%`,
      acceptedTranscripts: filteredTranscripts.map(t => t.text)
    }
  });
}