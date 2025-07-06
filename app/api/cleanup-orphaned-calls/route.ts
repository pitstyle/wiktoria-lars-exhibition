import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript, saveTranscript, supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting orphaned calls cleanup...');

    // Find conversations without full transcripts that are older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: orphanedConversations, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .is('full_transcript', null)
      .lt('start_time', fiveMinutesAgo)
      .order('start_time', { ascending: false })
      .limit(20); // Process max 20 at a time

    if (findError) {
      console.error('❌ Error finding orphaned conversations:', findError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!orphanedConversations || orphanedConversations.length === 0) {
      console.log('✅ No orphaned conversations found');
      return NextResponse.json({ message: 'No orphaned conversations', processed: 0 });
    }

    console.log(`🔍 Found ${orphanedConversations.length} potentially orphaned conversations`);

    const results = [];
    for (const conversation of orphanedConversations) {
      const callId = conversation.ultravox_call_id;
      console.log(`🔄 Processing orphaned conversation: ${conversation.id}, callId: ${callId}`);

      try {
        // Check if call actually ended by querying Ultravox
        const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
          headers: {
            'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
          },
        });

        if (!callResponse.ok) {
          console.log(`⚠️ Call ${callId} not found in Ultravox, likely deleted`);
          const result: any = { 
            conversation_id: conversation.id, 
            call_id: callId, 
            status: 'call_not_found',
            action: 'manual_compile'
          };
          results.push(result);
          
          // Try manual compilation
          const compileResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NODE_ENV === 'production' ? 'https://wiktoria-lars-app.vercel.app' : 'https://a97e-31-178-4-112.ngrok-free.app')}/api/compileTranscript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: conversation.id })
          });
          
          if (compileResponse.ok) {
            console.log(`✅ Manual compilation successful for ${conversation.id}`);
            result.compile_result = 'success';
          } else {
            console.log(`❌ Manual compilation failed for ${conversation.id}`);
            result.compile_result = 'failed';
          }
          continue;
        }

        const callData = await callResponse.json();
        
        // If call is still active, skip it
        if (callData.status === 'active' || callData.status === 'ringing') {
          console.log(`⏳ Call ${callId} still active, skipping`);
          results.push({ 
            conversation_id: conversation.id, 
            call_id: callId, 
            status: 'still_active',
            action: 'skipped'
          });
          continue;
        }

        // Call ended, fetch transcript
        console.log(`📞 Call ${callId} ended with status: ${callData.status}, fetching transcript...`);

        const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
          headers: {
            'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
          },
        });

        if (messagesResponse.ok) {
          const fullTranscript = await messagesResponse.json();
          console.log(`💾 Transcript fetched for ${callId}:`, fullTranscript.results?.length || 0, 'messages');
          
          // Get recording URL if available
          let recordingUrl = null;
          if (callData.recordingEnabled) {
            recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${callId}/recording`;
          }

          // Save full transcript
          await saveFullTranscript(conversation.id, fullTranscript, recordingUrl);
          
          // Save cleanup notification
          await saveTranscript({
            conversation_id: conversation.id,
            speaker: 'system',
            stage: 'conversation_end',
            content: `Call ended with status: ${callData.status}. Transcript recovered via cleanup job. Duration: ${callData.duration_ms || 'unknown'}ms.`
          });

          // Update conversation
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ 
              end_time: callData.ended_at || new Date().toISOString(),
              total_messages: fullTranscript.results?.length || 0
            })
            .eq('id', conversation.id);

          console.log(`✅ Transcript saved for orphaned conversation: ${conversation.id}`);
          results.push({ 
            conversation_id: conversation.id, 
            call_id: callId, 
            status: 'recovered',
            action: 'transcript_saved',
            messages: fullTranscript.results?.length || 0
          });

        } else {
          console.error(`❌ Failed to fetch transcript for ${callId}:`, messagesResponse.status);
          results.push({ 
            conversation_id: conversation.id, 
            call_id: callId, 
            status: 'transcript_fetch_failed',
            action: 'manual_compile_attempted'
          });
          
          // Try manual compilation as fallback
          const compileResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NODE_ENV === 'production' ? 'https://wiktoria-lars-app.vercel.app' : 'https://a97e-31-178-4-112.ngrok-free.app')}/api/compileTranscript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: conversation.id })
          });
          
          results[results.length - 1].compile_result = compileResponse.ok ? 'success' : 'failed';
        }

      } catch (error) {
        console.error(`❌ Error processing conversation ${conversation.id}:`, error);
        results.push({ 
          conversation_id: conversation.id, 
          call_id: callId, 
          status: 'error',
          action: 'failed',
          error: (error as Error).message
        });
      }
    }

    console.log('✅ Orphaned calls cleanup completed');
    return NextResponse.json({
      message: 'Cleanup completed',
      total_found: orphanedConversations.length,
      processed: results.length,
      results: results
    });

  } catch (error) {
    console.error('❌ Error in orphaned calls cleanup:', error);
    return NextResponse.json({ 
      error: 'Cleanup failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// Handle GET for manual trigger
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Orphaned calls cleanup endpoint active',
    description: 'POST to trigger cleanup of conversations without transcripts'
  });
}