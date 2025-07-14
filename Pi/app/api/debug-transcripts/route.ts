import { NextRequest, NextResponse } from 'next/server';
import { saveTranscript } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Debug transcript save attempt:', body);
    
    // Try to save a transcript directly
    await saveTranscript({
      conversation_id: body.conversation_id,
      speaker: body.speaker || 'user',
      stage: body.stage || 'debug',
      content: body.content || 'Debug test transcript'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Transcript saved successfully',
      data: body
    });
    
  } catch (error) {
    console.error('❌ Debug transcript save failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}