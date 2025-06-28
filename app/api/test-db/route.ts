import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Import the enhancement functions from fetch-ultravox-data
function identifySpeaker(role: string, text: string, previousSpeaker: string = '', messageIndex: number = 0): string {
  if (role === 'MESSAGE_ROLE_USER') {
    return 'User';
  }
  
  if (role === 'MESSAGE_ROLE_AGENT') {
    const text_lower = text.toLowerCase();
    
    // Strong Wiktoria indicators (prioritized to avoid confusion)
    if (text_lower.includes('jestem wiktoria cukt') || 
        text_lower.includes('wiktoria cukt, prezydent') ||
        text_lower.includes('president of poland') ||
        text_lower.includes('prezydent polski') ||
        (text_lower.includes('wiktoria') && !text_lower.includes('pass the conversation to') && !text_lower.includes('transfer'))) {
      return 'Wiktoria Cukt 2.0';
    }
    
    // Context-based detection: After transfer tool, it's Wiktoria
    if (previousSpeaker === 'TOOL_TRANSFER') {
      return 'Wiktoria Cukt 2.0';
    }
    
    // Lars indicators (only if not Wiktoria)
    if (text_lower.includes('leader lars') || 
        text_lower.includes('*coughs*') || 
        text_lower.includes('*puffs on cigarette*') ||
        text_lower.includes('synthetic party') ||
        text_lower.includes('gravel-voiced') ||
        text_lower.includes('chain-smoking')) {
      return 'Leader Lars';
    }
    
    // Contextual fallback: if we just had a transfer, assume Wiktoria
    if (previousSpeaker === 'System' && messageIndex > 10) {
      return 'Wiktoria Cukt 2.0';
    }
    
    // Default to Lars (he usually starts calls)
    return 'Leader Lars';
  }
  
  if (role === 'MESSAGE_ROLE_TOOL_CALL') {
    const text_lower = text.toLowerCase();
    if (text_lower.includes('transfertowiktoria') || text_lower.includes('wiktoria')) {
      return 'TOOL_TRANSFER';
    }
    return 'System';
  }
  
  if (role === 'MESSAGE_ROLE_TOOL_RESULT') {
    return 'System';
  }
  
  return 'Unknown';
}

function enhanceTranscriptWithSpeakers(transcript: any): any {
  if (!transcript || !transcript.results || !Array.isArray(transcript.results)) {
    return transcript;
  }
  
  let previousSpeaker = '';
  
  const enhancedResults = transcript.results.map((message: any, index: number) => {
    const speaker = identifySpeaker(message.role, message.text || '', previousSpeaker, index);
    previousSpeaker = speaker;
    
    return {
      ...message,
      speaker_label: speaker,
      enhanced: true
    };
  });
  
  return {
    ...transcript,
    results: enhancedResults,
    enhanced_with_speakers: true,
    enhancement_timestamp: new Date().toISOString()
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'schema') {
      // Check current database schema by querying a sample row
      const { data: sampleData, error } = await supabase
        .from('conversations')
        .select('*')
        .limit(1);

      if (error) {
        return NextResponse.json({ error: 'Failed to check schema', details: error }, { status: 500 });
      }

      const columns = sampleData?.[0] ? Object.keys(sampleData[0]) : [];
      const hasNewColumns = {
        end_time: columns.includes('end_time'),
        full_transcript: columns.includes('full_transcript'),
        recording_url: columns.includes('recording_url')
      };

      return NextResponse.json({ 
        message: 'Current conversations table schema', 
        columns: columns,
        new_columns_status: hasNewColumns,
        migration_needed: !Object.values(hasNewColumns).every(Boolean)
      });
    }

    if (action === 'migrate') {
      // Run migration by updating the table structure
      try {
        // First check if columns already exist
        const { data: sampleData } = await supabase
          .from('conversations')
          .select('*')
          .limit(1);

        const columns = sampleData?.[0] ? Object.keys(sampleData[0]) : [];
        const hasNewColumns = {
          end_time: columns.includes('end_time'),
          full_transcript: columns.includes('full_transcript'),
          recording_url: columns.includes('recording_url')
        };

        if (Object.values(hasNewColumns).every(Boolean)) {
          return NextResponse.json({ 
            message: 'Migration not needed - all columns already exist', 
            columns_status: hasNewColumns 
          });
        }

        // Since we can't run ALTER TABLE directly through Supabase client,
        // we'll provide instructions for manual migration
        return NextResponse.json({ 
          message: 'Migration required - please run this SQL in your Supabase dashboard',
          sql: `
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS full_transcript JSONB,
  ADD COLUMN IF NOT EXISTS recording_url TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_recording_url 
  ON conversations(recording_url) WHERE recording_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_end_time 
  ON conversations(end_time) WHERE end_time IS NOT NULL;
          `,
          current_status: hasNewColumns
        });

      } catch (error) {
        return NextResponse.json({ error: 'Migration check failed', details: error }, { status: 500 });
      }
    }

    if (action === 'query') {
      // Query recent conversations with full transcript data
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, user_name, topic, start_time, end_time, full_transcript, recording_url')
        .order('start_time', { ascending: false })
        .limit(10);

      if (error) {
        return NextResponse.json({ error: 'Failed to query conversations', details: error }, { status: 500 });
      }

      // Check which conversations have full transcripts
      const transcriptStatus = conversations?.map(conv => ({
        id: conv.id.slice(0, 8),
        call_id: conv.ultravox_call_id,
        user_name: conv.user_name,
        start_time: conv.start_time,
        end_time: conv.end_time,
        has_full_transcript: !!conv.full_transcript,
        transcript_length: conv.full_transcript?.results?.length || conv.full_transcript?.messages?.length || 0,
        enhanced_with_speakers: conv.full_transcript?.enhanced_with_speakers || false,
        has_recording_url: !!conv.recording_url,
        recording_url: conv.recording_url
      })) || [];

      return NextResponse.json({
        message: 'Recent conversations queried',
        total_conversations: conversations?.length || 0,
        conversations: transcriptStatus,
        summary: {
          with_full_transcript: transcriptStatus.filter(c => c.has_full_transcript).length,
          with_recording_url: transcriptStatus.filter(c => c.has_recording_url).length,
          completed_calls: transcriptStatus.filter(c => c.end_time).length
        }
      });
    }

    if (action === 'transcript') {
      // Get specific transcript content by conversation ID
      const conversationId = searchParams.get('id');
      if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, full_transcript')
        .eq('id', conversationId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to get transcript', details: error }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Transcript retrieved',
        conversation_id: conversation.id,
        ultravox_call_id: conversation.ultravox_call_id,
        full_transcript: conversation.full_transcript,
        transcript_structure: {
          is_array: Array.isArray(conversation.full_transcript),
          length: conversation.full_transcript?.results?.length || 0,
          keys: conversation.full_transcript ? Object.keys(conversation.full_transcript) : [],
          enhanced: conversation.full_transcript?.enhanced_with_speakers || false,
          sample_messages: conversation.full_transcript?.results?.slice(0, 3).map((msg: any) => ({
            role: msg.role,
            speaker_label: msg.speaker_label,
            text: msg.text?.substring(0, 100) + '...',
            enhanced: msg.enhanced
          })) || 'No results array'
        }
      });
    }

    if (action === 'enhance') {
      // Enhance existing transcript with speaker labels
      const conversationId = searchParams.get('id');
      if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, full_transcript')
        .eq('id', conversationId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to get conversation', details: error }, { status: 500 });
      }

      if (!conversation.full_transcript) {
        return NextResponse.json({ error: 'No transcript to enhance' }, { status: 400 });
      }

      // Enhance the transcript
      const enhancedTranscript = enhanceTranscriptWithSpeakers(conversation.full_transcript);

      // Update the database
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ full_transcript: enhancedTranscript })
        .eq('id', conversationId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update transcript', details: updateError }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Transcript enhanced with speaker labels',
        conversation_id: conversation.id,
        original_enhanced: conversation.full_transcript?.enhanced_with_speakers || false,
        now_enhanced: true,
        sample_enhanced_messages: enhancedTranscript.results?.slice(0, 5).map((msg: any) => ({
          role: msg.role,
          speaker_label: msg.speaker_label,
          text: msg.text?.substring(0, 150) + '...',
          enhanced: msg.enhanced
        })) || []
      });
    }

    if (action === 'extract') {
      // Extract user data from transcript
      const conversationId = searchParams.get('id');
      if (!conversationId) {
        return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
      }

      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, full_transcript, user_name, topic')
        .eq('id', conversationId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to get conversation', details: error }, { status: 500 });
      }

      if (!conversation.full_transcript) {
        return NextResponse.json({ error: 'No transcript to extract from' }, { status: 400 });
      }

      // Extract user data from transcript (inline implementation)
      const extractUserDataFromTranscript = (transcript: any): { userName?: string, topic?: string } => {
        if (!transcript?.results || !Array.isArray(transcript.results)) {
          return {};
        }

        let userName = '';
        let topic = '';

        for (const message of transcript.results) {
          if (message.role === 'MESSAGE_ROLE_USER' && message.text) {
            const text = message.text.toLowerCase();
            
            const nameMatch = text.match(/(?:mam na imię|nazywam się|jestem|my name is|i'm|i am)\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/i);
            if (nameMatch && !userName) {
              userName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
            }
            
            if (text.includes('edukacji') || text.includes('education')) {
              topic = 'Education & AI';
            } else if (text.includes('polityka') || text.includes('politics')) {
              topic = 'Politics & Society';
            } else if (text.includes('technologia') || text.includes('technology')) {
              topic = 'Technology & Innovation';
            } else if (text.includes('sztuka') || text.includes('art')) {
              topic = 'Art & Culture';
            }
          }
        }

        return {
          userName: userName || undefined,
          topic: topic || undefined
        };
      };

      const extractedData = extractUserDataFromTranscript(conversation.full_transcript);

      // Update the conversation if we extracted data
      const updateData: any = {};
      if (extractedData.userName) updateData.user_name = extractedData.userName;
      if (extractedData.topic) updateData.topic = extractedData.topic;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', conversationId);

        if (updateError) {
          return NextResponse.json({ error: 'Failed to update conversation', details: updateError }, { status: 500 });
        }
      }

      return NextResponse.json({
        message: 'User data extracted from transcript',
        conversation_id: conversation.id,
        current_data: {
          user_name: conversation.user_name,
          topic: conversation.topic
        },
        extracted_data: extractedData,
        updated_data: updateData,
        update_applied: Object.keys(updateData).length > 0
      });
    }

    if (action === 'verify') {
      // Test the saveFullTranscript function
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .limit(1);

      if (!conversations || conversations.length === 0) {
        return NextResponse.json({ 
          message: 'No conversations found to test with',
          need_test_data: true 
        });
      }

      const testConversation = conversations[0];
      const testTranscript = {
        messages: [
          { speaker: 'lars', content: 'Test message from Lars' },
          { speaker: 'user', content: 'Test response from user' }
        ],
        call_id: testConversation.ultravox_call_id,
        duration: 120
      };

      // Test the saveFullTranscript function
      try {
        const { data, error } = await supabase
          .from('conversations')
          .update({ 
            full_transcript: testTranscript,
            recording_url: 'https://test-recording-url.com/test.mp3',
            end_time: new Date().toISOString()
          })
          .eq('id', testConversation.id)
          .select();

        if (error) {
          return NextResponse.json({ error: 'Full transcript save failed', details: error }, { status: 500 });
        }

        return NextResponse.json({ 
          message: 'Full transcript storage verified successfully', 
          updated_conversation: data?.[0],
          test_data_saved: true
        });

      } catch (error) {
        return NextResponse.json({ error: 'Verification failed', details: error }, { status: 500 });
      }
    }

    // Default behavior - basic database test
    const { data, error, count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('Database connection error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 });
    }

    // Test table structure
    const { data: tableData, error: tableError } = await supabase
      .from('conversations')
      .select('*')
      .limit(5);

    // Test transcripts table
    const { data: transcriptData, error: transcriptError, count: transcriptCount } = await supabase
      .from('transcripts')
      .select('*', { count: 'exact' })
      .limit(5);

    const columns = tableData?.[0] ? Object.keys(tableData[0]) : [];
    const hasNewColumns = {
      end_time: columns.includes('end_time'),
      full_transcript: columns.includes('full_transcript'),
      recording_url: columns.includes('recording_url')
    };

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      connection: 'OK',
      migration_status: {
        columns_present: hasNewColumns,
        migration_needed: !Object.values(hasNewColumns).every(Boolean)
      },
      tables: {
        conversations: count || 0,
        transcripts: transcriptCount || 0,
        conversationSample: tableData?.slice(0, 2) || [],
        transcriptSample: transcriptData?.slice(0, 2) || []
      },
      available_actions: ['schema', 'migrate', 'verify', 'query', 'transcript', 'enhance', 'extract'],
      environment: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured' : 'Missing',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured' : 'Missing'
      }
    });

  } catch (error) {
    console.error('Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}