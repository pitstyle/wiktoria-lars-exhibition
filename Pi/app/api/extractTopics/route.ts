import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function extractTopicFromTranscript(messages: any[]): string | null {
  if (!messages || !Array.isArray(messages)) return null;

  // Look for user responses that indicate topic interest
  for (const message of messages) {
    if (message.role === 'MESSAGE_ROLE_USER' && message.text) {
      const text = message.text.toLowerCase();
      
      // Look for topic patterns in Polish
      const topicPatterns = [
        /chcę (?:rozmawiać|porozmawiać|dyskutować) (?:o|na temat|właśnie o) (.+?)(?:\.|$|,|\?)/i,
        /porozmawiać (?:właśnie )?o (.+?)(?:\.|$|,|\?)/i,
        /interesuje mnie (.+?)(?:\.|$|,|\?)/i,
        /temat[^:]*:?\s*(.+?)(?:\.|$|,|\?)/i,
        /(?:o|na temat) (.+?)(?:\.|$|,|\?)/i,
        /mówić o (.+?)(?:\.|$|,|\?)/i,
        /problemie (.+?)(?:\.|$|,|\?)/i,
        /zajmuję się (.+?)(?:\.|$|,|\?)/i
      ];
      
      for (const pattern of topicPatterns) {
        const match = message.text.match(pattern);
        if (match && match[1]) {
          const topic = match[1].trim();
          // Filter out generic responses
          if (topic.length > 3 && 
              !topic.includes('nie wiem') && 
              !topic.includes('wszystko') &&
              !topic.includes('tego') &&
              topic.length < 100) {
            return topic;
          }
        }
      }
    }
  }

  // Fallback: Look for Lars asking about specific topics
  for (const message of messages) {
    if (message.role === 'MESSAGE_ROLE_AGENT' && message.text) {
      const larsQuestions = [
        /co konkretnie chciałby[^?]*omówić[^?]*kontekście (.+?)\?/i,
        /dyskusja o (.+?),/i,
        /temat (.+?) może być/i
      ];
      
      for (const pattern of larsQuestions) {
        const match = message.text.match(pattern);
        if (match && match[1]) {
          const topic = match[1].trim();
          if (topic.length > 3 && topic.length < 50) {
            return topic;
          }
        }
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 === EXTRACT TOPICS FROM TRANSCRIPTS ===');
    
    const body = await request.json();
    const { conversationId, updateAll = false } = body;

    let conversations = [];

    if (conversationId) {
      // Extract topic for specific conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, user_name, topic, full_transcript')
        .eq('id', conversationId)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      conversations = [data];
    } else if (updateAll) {
      // Extract topics for all conversations with generic topics
      const { data, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, user_name, topic, full_transcript')
        .in('topic', ['General Discussion', 'Art Exhibition Interaction'])
        .not('full_transcript', 'is', null)
        .gte('start_time', new Date(Date.now() - 7*24*60*60*1000).toISOString()) // Last 7 days
        .order('start_time', { ascending: false });
      
      if (error) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      conversations = data || [];
    } else {
      return NextResponse.json({ error: 'Must provide conversationId or updateAll=true' }, { status: 400 });
    }

    console.log(`🎯 Processing ${conversations.length} conversations for topic extraction`);

    const results = [];

    for (const conv of conversations) {
      console.log(`🔄 Processing: ${conv.user_name} - ${conv.topic} (${conv.ultravox_call_id})`);
      
      if (!conv.full_transcript || !conv.full_transcript.results) {
        console.log(`⚠️ No transcript data for: ${conv.ultravox_call_id}`);
        results.push({
          conversationId: conv.id,
          callId: conv.ultravox_call_id,
          status: 'no_transcript',
          oldTopic: conv.topic,
          newTopic: null
        });
        continue;
      }

      const extractedTopic = extractTopicFromTranscript(conv.full_transcript.results);
      
      if (extractedTopic) {
        console.log(`✅ Extracted topic for ${conv.ultravox_call_id}: "${extractedTopic}"`);
        
        try {
          // Update the conversation with the extracted topic
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ topic: extractedTopic })
            .eq('id', conv.id);
          
          if (updateError) {
            console.error(`❌ Failed to update topic for ${conv.ultravox_call_id}:`, updateError);
            results.push({
              conversationId: conv.id,
              callId: conv.ultravox_call_id,
              status: 'update_failed',
              oldTopic: conv.topic,
              newTopic: extractedTopic,
              error: updateError.message
            });
          } else {
            console.log(`✅ Topic updated successfully for ${conv.ultravox_call_id}`);
            results.push({
              conversationId: conv.id,
              callId: conv.ultravox_call_id,
              status: 'updated',
              oldTopic: conv.topic,
              newTopic: extractedTopic,
              userName: conv.user_name
            });
          }
        } catch (updateError) {
          console.error(`❌ Update error for ${conv.ultravox_call_id}:`, updateError);
          results.push({
            conversationId: conv.id,
            callId: conv.ultravox_call_id,
            status: 'update_error',
            oldTopic: conv.topic,
            newTopic: extractedTopic,
            error: (updateError as Error).message
          });
        }
      } else {
        console.log(`⚠️ Could not extract topic from ${conv.ultravox_call_id}`);
        results.push({
          conversationId: conv.id,
          callId: conv.ultravox_call_id,
          status: 'no_topic_found',
          oldTopic: conv.topic,
          newTopic: null,
          userName: conv.user_name
        });
      }

      // Small delay between updates
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🎉 Topic extraction completed!');
    
    return NextResponse.json({
      success: true,
      message: `Processed ${conversations.length} conversations`,
      results: results,
      summary: {
        total: results.length,
        updated: results.filter(r => r.status === 'updated').length,
        no_topic_found: results.filter(r => r.status === 'no_topic_found').length,
        no_transcript: results.filter(r => r.status === 'no_transcript').length,
        errors: results.filter(r => r.status.includes('error') || r.status.includes('failed')).length
      }
    });

  } catch (error) {
    console.error('❌ Error in extractTopics:', error);
    return NextResponse.json({ 
      error: 'Topic extraction failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Extract topics from transcripts endpoint',
    usage: {
      'POST with conversationId': 'Extract topic for specific conversation',
      'POST with updateAll=true': 'Extract topics for all generic conversations from last 7 days'
    }
  });
}