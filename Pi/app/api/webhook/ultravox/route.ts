import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript } from '@/lib/supabase';
import { saveConversationContext } from '@/lib/conversationMemory';

// Webhook to automatically save transcripts when any call ends
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 Ultravox webhook received:', body.event);

    // Only process call.ended events
    if (body.event !== 'call.ended') {
      console.log('ℹ️ Ignoring non-call.ended event:', body.event);
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const call = body.call;
    const callId = call.id;
    
    console.log(`📞 Call ended webhook: ${callId}`);

    // Find the conversation by call ID
    const { supabase } = await import('@/lib/supabase');
    const { data: conversations, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .eq('ultravox_call_id', callId)
      .single();

    if (findError) {
      console.error('⚠️ Could not find conversation for call ID:', callId, findError);
      return NextResponse.json({ status: 'conversation_not_found' }, { status: 200 });
    }

    if (!conversations) {
      console.log('ℹ️ No conversation found for call ID:', callId);
      return NextResponse.json({ status: 'no_conversation' }, { status: 200 });
    }

    // Fetch full transcript from Ultravox API
    console.log('💾 Fetching full transcript from Ultravox...');
    const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
      headers: {
        'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
      },
    });

    if (!messagesResponse.ok) {
      console.error('❌ Failed to fetch transcript from Ultravox:', messagesResponse.status);
      return NextResponse.json({ status: 'transcript_fetch_failed' }, { status: 200 });
    }

    const fullTranscript = await messagesResponse.json();
    console.log('💾 Full transcript fetched:', fullTranscript.results?.length || 0, 'messages');

    // Try to get recording URL
    let recordingUrl = null;
    try {
      if (call.recordingEnabled && call.ended) {
        recordingUrl = call.recordingUrl || `https://api.ultravox.ai/api/calls/${callId}/recording`;
        console.log('💾 Recording URL obtained:', recordingUrl);
      }
    } catch (recordingError) {
      console.error('⚠️ Failed to get recording URL:', recordingError);
    }

    // Save full transcript to database
    await saveFullTranscript(conversations.id, fullTranscript, recordingUrl);
    console.log('✅ Full transcript saved to database for conversation:', conversations.id);

    // Analyze conversation for memory insights
    try {
      await analyzeConversationForMemory(conversations.id, fullTranscript);
      console.log('✅ Conversation analyzed for memory insights');
    } catch (analysisError) {
      console.error('⚠️ Failed to analyze conversation for memory:', analysisError);
    }

    return NextResponse.json({ 
      status: 'success',
      conversationId: conversations.id,
      messageCount: fullTranscript.results?.length || 0
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error in Ultravox webhook:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Analyze conversation transcript for memory insights
async function analyzeConversationForMemory(conversationId: string, fullTranscript: any) {
  if (!fullTranscript.results || !Array.isArray(fullTranscript.results)) {
    return;
  }

  const messages = fullTranscript.results;
  
  // Extract questions asked by agents
  const agentQuestions: { question: string, agent: string, timestamp: string }[] = [];
  
  // Extract topics discussed
  const topicsDiscussed: { topic: string, category: string, speaker: string }[] = [];
  
  // Extract agent positions/statements
  const agentPositions: { agent: string, position: string, topic?: string }[] = [];

  messages.forEach((message: any) => {
    if (message.speaker === 'agent' && message.text) {
      const text = message.text;
      
      // Detect questions (simple heuristic)
      if (text.includes('?')) {
        const questions = text.split(/[.!]/).filter((s: string) => s.includes('?'));
        questions.forEach((q: string) => {
          if (q.trim().length > 10) {
            agentQuestions.push({
              question: q.trim(),
              agent: message.agentName || 'unknown',
              timestamp: message.timestamp || new Date().toISOString()
            });
          }
        });
      }

      // Detect topic keywords for political discussion
      const politicalKeywords = ['polityk', 'rząd', 'partia', 'prezydent', 'wybory', 'demokracja', 'władza', 'społeczeństwo'];
      const techKeywords = ['technologia', 'AI', 'sztuczna inteligencja', 'internet', 'komputer'];
      const cultureKeywords = ['kultura', 'sztuka', 'muzyka', 'film', 'literatura'];
      
      let detectedCategory = 'personal';
      if (politicalKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
        detectedCategory = 'politics';
      } else if (techKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
        detectedCategory = 'technology';
      } else if (cultureKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
        detectedCategory = 'culture';
      }

      // Extract key phrases as topics (simplified)
      const sentences = text.split(/[.!?]/).filter((s: string) => s.trim().length > 20);
      sentences.forEach((sentence: string) => {
        if (sentence.trim().length > 30) {
          topicsDiscussed.push({
            topic: sentence.trim().substring(0, 100),
            category: detectedCategory,
            speaker: message.agentName || 'agent'
          });
        }
      });

      // Store agent positions
      if (text.length > 50) {
        agentPositions.push({
          agent: message.agentName || 'agent',
          position: text.substring(0, 200),
          topic: detectedCategory !== 'personal' ? detectedCategory : undefined
        });
      }
    }
  });

  // Save questions to memory
  for (const questionData of agentQuestions) {
    await saveConversationContext(
      conversationId,
      'question_asked',
      {
        question: questionData.question,
        answered: true, // Assume answered since conversation ended
        analysis_source: 'webhook_transcript'
      },
      'post_conversation',
      questionData.agent as any
    );
  }

  // Save topics to memory
  for (const topicData of topicsDiscussed) {
    await saveConversationContext(
      conversationId,
      'topic_covered',
      {
        category: topicData.category,
        topic: topicData.topic,
        depth: 2, // Post-conversation analysis suggests deeper discussion
        analysis_source: 'webhook_transcript'
      },
      'post_conversation',
      topicData.speaker as any
    );
  }

  // Save agent positions to memory
  for (const positionData of agentPositions) {
    await saveConversationContext(
      conversationId,
      'agent_statement',
      {
        position: positionData.position,
        topic: positionData.topic,
        agent: positionData.agent,
        analysis_source: 'webhook_transcript'
      },
      'post_conversation',
      positionData.agent as any
    );
  }

  console.log(`💾 Analyzed conversation: ${agentQuestions.length} questions, ${topicsDiscussed.length} topics, ${agentPositions.length} positions`);
}