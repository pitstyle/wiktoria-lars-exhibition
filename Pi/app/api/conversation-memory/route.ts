import { NextRequest, NextResponse } from 'next/server';
import { getConversationMemory, checkTopicRepetition, checkQuestionRepetition } from '@/lib/conversationMemory';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');
  const action = searchParams.get('action');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'memory':
        const memory = await getConversationMemory(conversationId);
        return NextResponse.json({ memory });

      case 'topics':
        const { data: topicContexts } = await supabase
          .from('transcripts')
          .select('*')
          .eq('conversation_id', conversationId)
          .like('content', '[CONTEXT:topic_covered]%')
          .order('timestamp', { ascending: false });

        const topics = topicContexts?.map(t => {
          try {
            const match = t.content.match(/\[CONTEXT:topic_covered\] (.*)/)
            return match ? { ...JSON.parse(match[1]), timestamp: t.timestamp, speaker: t.speaker } : null
          } catch (e) {
            return null
          }
        }).filter(Boolean) || [];

        return NextResponse.json({ topics });

      case 'questions':
        const { data: questionContexts } = await supabase
          .from('transcripts')
          .select('*')
          .eq('conversation_id', conversationId)
          .like('content', '[CONTEXT:question_asked]%')
          .order('timestamp', { ascending: false });

        const questions = questionContexts?.map(t => {
          try {
            const match = t.content.match(/\[CONTEXT:question_asked\] (.*)/)
            return match ? { ...JSON.parse(match[1]), timestamp: t.timestamp, speaker: t.speaker } : null
          } catch (e) {
            return null
          }
        }).filter(Boolean) || [];

        return NextResponse.json({ questions });

      case 'repetition-check':
        const topic = searchParams.get('topic');
        const question = searchParams.get('question');
        
        const results: any = {};
        
        if (topic) {
          results.topicCheck = await checkTopicRepetition(conversationId, topic);
        }
        
        if (question) {
          results.questionCheck = await checkQuestionRepetition(conversationId, question);
        }
        
        return NextResponse.json({ results });

      case 'summary':
        // Get conversation summary with memory insights
        const { data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        const { data: allContexts } = await supabase
          .from('transcripts')
          .select('*')
          .eq('conversation_id', conversationId)
          .like('content', '[CONTEXT:%')
          .order('timestamp', { ascending: true });

        const summary = {
          conversation,
          totalContexts: allContexts?.length || 0,
          contextTypes: {} as Record<string, number>,
          memoryInsights: {
            questionsAsked: 0,
            topicsDiscussed: 0,
            agentStatements: 0,
            userPreferences: 0
          } as Record<string, number>
        };

        allContexts?.forEach(context => {
          try {
            const match = context.content.match(/\[CONTEXT:(\w+)\]/)
            if (match) {
              const contextType = match[1];
              summary.contextTypes[contextType] = (summary.contextTypes[contextType] || 0) + 1;
              const insightKey = contextType + 's';
              summary.memoryInsights[insightKey] = (summary.memoryInsights[insightKey] || 0) + 1;
            }
          } catch (e) {
            console.warn('Failed to parse context for summary:', e);
          }
        });

        return NextResponse.json({ summary });

      default:
        return NextResponse.json({ error: 'Invalid action. Use: memory, topics, questions, repetition-check, or summary' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in conversation memory API:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch conversation memory',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST endpoint for testing memory functions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, conversationId, data } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId is required' }, { status: 400 });
    }

    switch (action) {
      case 'simulate-topic-check':
        if (!data.topic) {
          return NextResponse.json({ error: 'topic is required' }, { status: 400 });
        }
        const topicResult = await checkTopicRepetition(conversationId, data.topic);
        return NextResponse.json({ topicResult });

      case 'simulate-question-check':
        if (!data.question) {
          return NextResponse.json({ error: 'question is required' }, { status: 400 });
        }
        const questionResult = await checkQuestionRepetition(conversationId, data.question);
        return NextResponse.json({ questionResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in conversation memory POST:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}