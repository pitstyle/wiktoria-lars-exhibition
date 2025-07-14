import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    const speaker = searchParams.get('speaker'); // 'User', 'Leader Lars', 'Wiktoria Cukt 2.0', 'System'
    const role = searchParams.get('role'); // 'MESSAGE_ROLE_USER', 'MESSAGE_ROLE_AGENT', etc.
    const minLength = parseInt(searchParams.get('minLength') || '0');
    const format = searchParams.get('format') || 'json'; // 'json', 'text', 'summary'

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // Get the conversation with full transcript
    const { data: conversation, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (!conversation.full_transcript?.results) {
      return NextResponse.json({ error: 'No transcript data available' }, { status: 404 });
    }

    let filteredMessages = conversation.full_transcript.results;

    // Filter by speaker if specified
    if (speaker) {
      filteredMessages = filteredMessages.filter((msg: any) => 
        msg.speaker_label === speaker
      );
    }

    // Filter by role if specified
    if (role) {
      filteredMessages = filteredMessages.filter((msg: any) => 
        msg.role === role
      );
    }

    // Filter by minimum length
    if (minLength > 0) {
      filteredMessages = filteredMessages.filter((msg: any) => 
        (msg.text || '').length >= minLength
      );
    }

    // Format output based on request
    let result: any = {
      conversation_id: conversationId,
      total_messages: filteredMessages.length,
      filters_applied: { speaker, role, minLength },
      messages: filteredMessages
    };

    if (format === 'text') {
      const textOutput = filteredMessages.map((msg: any, index: number) => 
        `[${index + 1}] ${msg.speaker_label || 'Unknown'}: ${msg.text || ''}`
      ).join('\n\n');
      
      result = {
        ...result,
        text_format: textOutput
      };
    } else if (format === 'summary') {
      const speakerStats = filteredMessages.reduce((acc: any, msg: any) => {
        const speaker = msg.speaker_label || 'Unknown';
        acc[speaker] = (acc[speaker] || 0) + 1;
        return acc;
      }, {});

      result = {
        conversation_id: conversationId,
        total_messages: filteredMessages.length,
        speaker_distribution: speakerStats,
        filters_applied: { speaker, role, minLength },
        sample_messages: filteredMessages.slice(0, 3).map((msg: any) => ({
          speaker: msg.speaker_label,
          text: (msg.text || '').substring(0, 100) + '...',
          role: msg.role
        }))
      };
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error filtering transcript:', error);
    return NextResponse.json({
      error: 'Error filtering transcript',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}