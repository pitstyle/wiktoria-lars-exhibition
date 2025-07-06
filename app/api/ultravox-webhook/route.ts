import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript, saveTranscript, supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 Ultravox webhook received:', JSON.stringify(body, null, 2));

    const { event_type, call } = body;
    
    if (!call || !call.call_id) {
      console.log('⚠️ Webhook missing call data, ignoring');
      return NextResponse.json({ message: 'No call data' });
    }

    const callId = call.call_id;
    console.log(`📞 Processing webhook for call: ${callId}, event: ${event_type}`);

    // Handle call ended events (both normal end and cancellation)
    if (event_type === 'call_ended' || event_type === 'call_cancelled' || event_type === 'call_disconnected') {
      console.log(`🔚 Call ended via webhook: ${event_type}`);
      
      try {
        // Check if we already have a full transcript saved
        const { data: existingConversations, error: findError } = await supabase
          .from('conversations')
          .select('id, full_transcript')
          .eq('ultravox_call_id', callId);

        if (findError) {
          console.error('❌ Error finding conversation:', findError);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!existingConversations || existingConversations.length === 0) {
          console.log(`⚠️ No conversation found for callId: ${callId}`);
          return NextResponse.json({ message: 'No conversation found' });
        }

        const conversation = existingConversations[0];
        
        // If we already have a full transcript, skip
        if (conversation.full_transcript) {
          console.log(`✅ Full transcript already exists for conversation: ${conversation.id}`);
          return NextResponse.json({ message: 'Transcript already saved' });
        }

        console.log(`💾 Fetching transcript for ended/cancelled call: ${callId}`);

        // Fetch full transcript from Ultravox API
        const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
          headers: {
            'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
          },
        });

        if (messagesResponse.ok) {
          const fullTranscript = await messagesResponse.json();
          console.log('💾 Full transcript fetched via webhook:', fullTranscript.results?.length || 0, 'messages');
          
          // Try to get recording URL
          let recordingUrl = null;
          try {
            const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
              headers: {
                'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
              },
            });

            if (callResponse.ok) {
              const callData = await callResponse.json();
              if (callData.recordingEnabled) {
                recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${callId}/recording`;
                console.log('💾 Recording URL obtained via webhook:', recordingUrl);
              }
            }
          } catch (recordingError) {
            console.error('⚠️ Failed to fetch recording URL via webhook:', recordingError);
          }

          // Save full transcript
          await saveFullTranscript(conversation.id, fullTranscript, recordingUrl);
          console.log('✅ Full transcript saved via webhook for conversation:', conversation.id);

          // Save end call stage as transcript
          await saveTranscript({
            conversation_id: conversation.id,
            speaker: 'user',
            stage: 'conversation_end',
            content: `Conversation ended via ${event_type}. Call duration: ${call.duration_ms || 'unknown'}ms. End reason: ${call.end_reason || 'webhook_notification'}.`
          });
          console.log('✅ End call transcript saved via webhook');

          // Update conversation end time
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ 
              end_time: new Date().toISOString(),
              total_messages: fullTranscript.results?.length || 0
            })
            .eq('id', conversation.id);

          if (updateError) {
            console.error('⚠️ Failed to update conversation end time:', updateError);
          }

        } else {
          console.error('❌ Failed to fetch transcript via webhook:', messagesResponse.status, await messagesResponse.text());
          
          // Try manual compilation as fallback
          try {
            const compileResponse = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NODE_ENV === 'production' ? 'https://wiktoria-lars-app.vercel.app' : 'https://a97e-31-178-4-112.ngrok-free.app')}/api/compileTranscript`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: conversation.id })
            });
            
            if (compileResponse.ok) {
              console.log('✅ Manual transcript compilation successful via webhook');
            } else {
              console.error('❌ Manual transcript compilation failed via webhook');
            }
          } catch (compileError) {
            console.error('❌ Error in manual compilation via webhook:', compileError);
          }
        }

      } catch (transcriptError) {
        console.error('❌ Error processing transcript via webhook:', transcriptError);
        return NextResponse.json({ error: 'Transcript processing failed' }, { status: 500 });
      }
    }

    // Handle other events if needed
    console.log(`📝 Webhook processed successfully for event: ${event_type}`);
    return NextResponse.json({ message: 'Webhook processed', event_type, call_id: callId });

  } catch (error) {
    console.error('❌ Error in Ultravox webhook:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// Handle GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Ultravox webhook endpoint active' });
}