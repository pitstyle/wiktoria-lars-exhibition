import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript, supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    console.log(`📝 Compiling transcript for conversation: ${conversationId}`);

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, ultravox_call_id, full_transcript')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      console.error('❌ Error finding conversation:', conversationError);
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // If we already have a full transcript, return it
    if (conversation.full_transcript) {
      console.log(`✅ Full transcript already exists for conversation: ${conversationId}`);
      return NextResponse.json({ 
        message: 'Transcript already compiled', 
        conversationId,
        messageCount: conversation.full_transcript.results?.length || 0
      });
    }

    const ultravoxCallId = conversation.ultravox_call_id;
    if (!ultravoxCallId) {
      console.error('❌ No ultravox_call_id found for conversation:', conversationId);
      return NextResponse.json({ error: 'No Ultravox call ID found' }, { status: 400 });
    }

    console.log(`🔄 Fetching transcript from Ultravox API for call: ${ultravoxCallId}`);

    // Fetch full transcript from Ultravox API
    const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${ultravoxCallId}/messages`, {
      headers: {
        'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
      },
    });

    if (!messagesResponse.ok) {
      console.error('❌ Failed to fetch transcript from Ultravox:', messagesResponse.status, await messagesResponse.text());
      return NextResponse.json({ error: 'Failed to fetch transcript from Ultravox' }, { status: 500 });
    }

    const fullTranscript = await messagesResponse.json();
    console.log('📝 Full transcript fetched:', fullTranscript.results?.length || 0, 'messages');

    // Try to get recording URL
    let recordingUrl = null;
    try {
      const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${ultravoxCallId}`, {
        headers: {
          'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
        },
      });

      if (callResponse.ok) {
        const callData = await callResponse.json();
        if (callData.recordingEnabled) {
          recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${ultravoxCallId}/recording`;
          console.log('🎵 Recording URL obtained:', recordingUrl);
        }
      }
    } catch (recordingError) {
      console.error('⚠️ Failed to fetch recording URL:', recordingError);
    }

    // Save full transcript
    await saveFullTranscript(conversationId, fullTranscript, recordingUrl);

    // Update conversation metadata
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ 
        total_messages: fullTranscript.results?.length || 0,
        end_time: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('⚠️ Failed to update conversation metadata:', updateError);
    }

    console.log('✅ Transcript compiled and saved successfully');
    return NextResponse.json({ 
      message: 'Transcript compiled successfully', 
      conversationId,
      messageCount: fullTranscript.results?.length || 0,
      recordingUrl 
    });

  } catch (error) {
    console.error('❌ Error compiling transcript:', error);
    return NextResponse.json({ 
      error: 'Transcript compilation failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// Handle GET for status check
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId parameter is required' }, { status: 400 });
  }

  try {
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('id, full_transcript, total_messages')
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const hasFullTranscript = !!conversation.full_transcript;
    const messageCount = conversation.full_transcript?.results?.length || conversation.total_messages || 0;

    return NextResponse.json({
      conversationId,
      hasFullTranscript,
      messageCount,
      status: hasFullTranscript ? 'compiled' : 'pending'
    });

  } catch (error) {
    console.error('❌ Error checking transcript status:', error);
    return NextResponse.json({ 
      error: 'Status check failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}