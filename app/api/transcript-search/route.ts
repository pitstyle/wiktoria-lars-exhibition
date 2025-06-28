import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q'); // Search term
    const speaker = searchParams.get('speaker');
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '10');
    const action = searchParams.get('action') || 'search';

    if (action === 'speakers') {
      // Get unique speakers across all conversations
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('full_transcript')
        .not('full_transcript', 'is', null);

      if (error) throw error;

      const allSpeakers = new Set();
      conversations?.forEach(conv => {
        conv.full_transcript?.results?.forEach((msg: any) => {
          if (msg.speaker_label) allSpeakers.add(msg.speaker_label);
        });
      });

      return NextResponse.json({
        action: 'speakers',
        unique_speakers: Array.from(allSpeakers),
        total_conversations: conversations?.length || 0
      });
    }

    if (action === 'topics') {
      // Get all available topics
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('topic')
        .not('topic', 'is', null);

      if (error) throw error;

      const topicCounts = conversations?.reduce((acc: any, conv) => {
        const topic = conv.topic || 'Unknown';
        acc[topic] = (acc[topic] || 0) + 1;
        return acc;
      }, {});

      return NextResponse.json({
        action: 'topics',
        topic_distribution: topicCounts,
        total_conversations: conversations?.length || 0
      });
    }

    if (action === 'conversation-summary') {
      const conversationId = searchParams.get('id');
      if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID required for summary' }, { status: 400 });
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error || !conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Generate conversation summary
      const messages = conversation.full_transcript?.results || [];
      const speakerStats = messages.reduce((acc: any, msg: any) => {
        const speaker = msg.speaker_label || 'Unknown';
        acc[speaker] = {
          count: (acc[speaker]?.count || 0) + 1,
          total_chars: (acc[speaker]?.total_chars || 0) + (msg.text?.length || 0)
        };
        return acc;
      }, {});

      const userMessages = messages.filter((msg: any) => msg.speaker_label === 'User');
      const agentMessages = messages.filter((msg: any) => msg.role === 'MESSAGE_ROLE_AGENT');
      const toolCalls = messages.filter((msg: any) => msg.role === 'MESSAGE_ROLE_TOOL_CALL');

      return NextResponse.json({
        conversation_id: conversationId,
        basic_info: {
          user_name: conversation.user_name,
          topic: conversation.topic,
          total_messages: messages.length,
          duration: conversation.end_time && conversation.start_time 
            ? new Date(conversation.end_time).getTime() - new Date(conversation.start_time).getTime()
            : null
        },
        speaker_statistics: speakerStats,
        message_breakdown: {
          user_messages: userMessages.length,
          agent_messages: agentMessages.length,
          tool_calls: toolCalls.length,
          system_messages: messages.length - userMessages.length - agentMessages.length - toolCalls.length
        },
        conversation_flow: messages.map((msg: any, index: number) => ({
          index,
          speaker: msg.speaker_label,
          role: msg.role,
          preview: (msg.text || '').substring(0, 50) + '...',
          length: msg.text?.length || 0
        })),
        key_exchanges: {
          user_inputs: userMessages.map((msg: any) => ({
            index: msg.callStageMessageIndex,
            text: msg.text,
            medium: msg.medium
          })),
          transfers: toolCalls.map((msg: any) => ({
            index: msg.callStageMessageIndex,
            tool: msg.toolName,
            data: msg.text
          }))
        }
      });
    }

    // Default search functionality
    let baseQuery = supabase
      .from('conversations')
      .select('id, user_name, topic, start_time, end_time, full_transcript');

    // Filter by topic if specified
    if (topic) {
      baseQuery = baseQuery.eq('topic', topic);
    }

    const { data: conversations, error } = await baseQuery
      .not('full_transcript', 'is', null)
      .limit(limit);

    if (error) throw error;

    const searchResults: any[] = [];

    conversations?.forEach(conversation => {
      const messages = conversation.full_transcript?.results || [];
      
      messages.forEach((message: any, index: number) => {
        let match = false;

        // Check search query
        if (query) {
          match = (message.text || '').toLowerCase().includes(query.toLowerCase());
        } else {
          match = true; // No search query, include all
        }

        // Filter by speaker
        if (speaker && message.speaker_label !== speaker) {
          match = false;
        }

        if (match) {
          searchResults.push({
            conversation_id: conversation.id,
            conversation_info: {
              user_name: conversation.user_name,
              topic: conversation.topic,
              start_time: conversation.start_time
            },
            message: {
              index,
              speaker: message.speaker_label,
              role: message.role,
              text: message.text,
              medium: message.medium,
              timestamp: message.timespan || null
            },
            match_context: query ? {
              query: query,
              position: (message.text || '').toLowerCase().indexOf(query.toLowerCase()),
              surrounding_text: extractContext(message.text || '', query)
            } : null
          });
        }
      });
    });

    // Sort by relevance (exact matches first, then by position)
    if (query) {
      searchResults.sort((a, b) => {
        const aPos = a.match_context?.position || 999999;
        const bPos = b.match_context?.position || 999999;
        return aPos - bPos;
      });
    }

    return NextResponse.json({
      query: query,
      filters: { speaker, topic },
      total_results: searchResults.length,
      results: searchResults.slice(0, limit),
      available_actions: ['search', 'speakers', 'topics', 'conversation-summary']
    });

  } catch (error) {
    console.error('Error searching transcripts:', error);
    return NextResponse.json({
      error: 'Error searching transcripts',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

function extractContext(text: string, query: string, contextLength: number = 100): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const position = lowerText.indexOf(lowerQuery);
  
  if (position === -1) return text.substring(0, contextLength);
  
  const start = Math.max(0, position - contextLength / 2);
  const end = Math.min(text.length, position + query.length + contextLength / 2);
  
  let context = text.substring(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}