import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔚 EndCall route called');
    console.log('End call context:', body);

    // Extract any context data for logging
    const { userName, lastSpeaker } = body.contextData || {};
    
    console.log(`🔚 Ending call for user: ${userName || 'unknown'}, last speaker: ${lastSpeaker || 'unknown'}`);

    // Return response that will terminate the call
    const response = NextResponse.json({
      toolResultText: `Thank you for joining our AI political debate! The conversation between Lars and Wiktoria has been concluded. We hope you enjoyed exploring the intersection of artificial intelligence and politics. Goodbye!`,
      // No selectedTools or systemPrompt - this signals end of conversation
    });

    // CRITICAL FIX: Use correct Ultravox header for call termination
    response.headers.set('X-Ultravox-Response-Type', 'hang-up');

    console.log('✅ End call response sent successfully');
    return response;
    
  } catch (error) {
    console.error('❌ Error in endCall route:', error);
    return NextResponse.json({ 
      error: 'Internal server error in end call', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}