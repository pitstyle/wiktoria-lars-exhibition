import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript, saveTranscript, supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 === ULTRAVOX WEBHOOK TRIGGERED ===');
    console.log('🔔 Time:', new Date().toISOString());
    console.log('🔔 MISSION: SAVE TRANSCRIPT NO MATTER WHAT!');
    console.log('🔔 Webhook payload:', JSON.stringify(body, null, 2));

    const { event_type, call } = body;
    
    if (!call || !call.call_id) {
      console.log('⚠️ Webhook missing call data, ignoring');
      return NextResponse.json({ message: 'No call data' });
    }

    const callId = call.call_id;
    console.log(`📞 Processing webhook for call: ${callId}, event: ${event_type}`);

    // Handle all call events - save transcript for any ending scenario
    if (event_type === 'call_ended' || event_type === 'call_cancelled' || event_type === 'call_disconnected' || event_type === 'call_timed_out' || event_type === 'call_failed') {
      console.log(`🔚 Call ended via webhook: ${event_type} - ensuring transcript is saved`);
      
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
        
        console.log(`🚀 FORCED TRANSCRIPT SAVE VIA WEBHOOK - NO EXCEPTIONS!`);
        console.log(`🎯 Conversation: ${conversation.id}, has existing transcript: ${!!conversation.full_transcript}`);
        
        // If we already have a full transcript, still update end_time but skip transcript
        if (conversation.full_transcript) {
          console.log(`✅ Full transcript already exists - updating end_time only`);
          
          // ALWAYS update end_time even if transcript exists
          try {
            const { error: updateError } = await supabase
              .from('conversations')
              .update({ 
                end_time: new Date().toISOString(),
                total_messages: conversation.full_transcript?.results?.length || 0
              })
              .eq('id', conversation.id);
            
            if (updateError) {
              console.error('❌ End time update failed:', updateError);
            } else {
              console.log('✅ End time updated for existing transcript');
            }
          } catch (timeError) {
            console.error('❌ Time update error:', timeError);
          }
          
          return NextResponse.json({ message: 'Transcript already saved, end_time updated' });
        }

        console.log(`🚀 NO TRANSCRIPT EXISTS - FORCING SAVE FROM ULTRAVOX API`);
        
        let transcriptSaved = false;
        let fullTranscript = null;
        let recordingUrl = null;
        
        // TRY 1: Fetch from Ultravox API
        try {
          console.log('🔄 Webhook Attempt 1: Fetching from Ultravox API...');
          const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
            headers: {
              'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
            },
          });

          if (messagesResponse.ok) {
            fullTranscript = await messagesResponse.json();
            console.log('✅ Webhook Ultravox API success:', fullTranscript.results?.length || 0, 'messages');
            
            // Try to get recording URL
            try {
              const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
                headers: { 'X-API-Key': `${process.env.ULTRAVOX_API_KEY}` }
              });
              if (callResponse.ok) {
                const callData = await callResponse.json();
                recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${callId}/recording`;
                console.log('✅ Recording URL obtained via webhook:', recordingUrl);
              }
            } catch (recordingError) {
              console.warn('⚠️ Recording URL fetch failed via webhook:', (recordingError as Error).message);
            }
            
            await saveFullTranscript(conversation.id, fullTranscript, recordingUrl);
            transcriptSaved = true;
            console.log('✅ SUCCESS: Webhook Ultravox transcript saved!');
          } else {
            console.warn('⚠️ Webhook Ultravox API failed:', messagesResponse.status, await messagesResponse.text());
          }
        } catch (apiError) {
          console.warn('⚠️ Webhook Ultravox API error:', (apiError as Error).message);
        }
        
        // TRY 2: Manual compilation fallback
        if (!transcriptSaved) {
          console.log('🔄 Webhook Attempt 2: Manual compilation fallback...');
          try {
            const baseUrl = process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : (process.env.NODE_ENV === 'production' 
                ? 'https://wiktoria-lars-app.vercel.app' 
                : 'https://a97e-31-178-4-112.ngrok-free.app');
                
            const compileResponse = await fetch(`${baseUrl}/api/compileTranscript`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: conversation.id })
            });
            
            if (compileResponse.ok) {
              transcriptSaved = true;
              console.log('✅ SUCCESS: Webhook manual compilation successful!');
            } else {
              console.warn('⚠️ Webhook manual compilation failed:', await compileResponse.text());
            }
          } catch (compileError) {
            console.warn('⚠️ Webhook compilation error:', (compileError as Error).message);
          }
        }
        
        // TRY 3: Create minimal transcript from webhook data
        if (!transcriptSaved) {
          console.log('🔄 Webhook Attempt 3: Creating minimal transcript from webhook data...');
          try {
            const minimalTranscript = {
              results: [
                {
                  role: 'system',
                  text: `Call ended via webhook: ${event_type}`,
                  timestamp: new Date().toISOString()
                },
                {
                  role: 'assistant', 
                  text: `Call duration: ${call.duration_ms || 'unknown'}ms. End reason: ${call.end_reason || 'webhook_notification'}`,
                  timestamp: new Date().toISOString()
                }
              ],
              callId: callId,
              source: 'webhook_fallback',
              event_type: event_type,
              endTime: new Date().toISOString()
            };
            
            await saveFullTranscript(conversation.id, minimalTranscript, undefined);
            transcriptSaved = true;
            console.log('✅ SUCCESS: Webhook minimal transcript saved!');
          } catch (fallbackError) {
            console.error('❌ Webhook fallback transcript failed:', fallbackError);
          }
        }
        
        // TRY 4: Absolute last resort - save error transcript
        if (!transcriptSaved) {
          console.log('🔄 Webhook Attempt 4: Absolute last resort - saving error transcript...');
          try {
            const errorTranscript = {
              error: 'Webhook transcript could not be retrieved',
              callId: callId,
              event_type: event_type,
              endTime: new Date().toISOString(),
              attempts: ['ultravox_api_failed', 'manual_compilation_failed', 'minimal_fallback_failed'],
              source: 'webhook_error_fallback'
            };
            
            await saveFullTranscript(conversation.id, errorTranscript, undefined);
            console.log('✅ SUCCESS: Webhook error transcript saved - better than nothing!');
          } catch (finalError) {
            console.error('❌ CATASTROPHIC: Even webhook error transcript failed:', finalError);
          }
        }
        
        // ALWAYS save end call transcript regardless of full_transcript success
        try {
          await saveTranscript({
            conversation_id: conversation.id,
            speaker: 'user',
            stage: 'conversation_end',
            content: `Conversation ended via ${event_type}. Call duration: ${call.duration_ms || 'unknown'}ms. End reason: ${call.end_reason || 'webhook_notification'}.`
          });
          console.log('✅ Webhook end call transcript saved');
        } catch (endTranscriptError) {
          console.error('❌ Webhook end call transcript failed:', endTranscriptError);
        }
        
        // ALWAYS update end_time regardless of transcript success
        try {
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ 
              end_time: new Date().toISOString(),
              total_messages: fullTranscript?.results?.length || 0
            })
            .eq('id', conversation.id);

          if (updateError) {
            console.error('❌ Webhook end time update failed:', updateError);
          } else {
            console.log('✅ Webhook conversation end_time updated');
          }
        } catch (timeError) {
          console.error('❌ Webhook time update error:', timeError);
        }

      } catch (transcriptError) {
        console.error('❌ Error processing transcript via webhook:', transcriptError);
        return NextResponse.json({ error: 'Transcript processing failed' }, { status: 500 });
      }
    }
    
    // Handle message events for real-time transcript saving
    if (event_type === 'message' && call.messages && call.messages.length > 0) {
      console.log(`💬 Message event received for call: ${callId}`);
      
      try {
        // Find the conversation
        const { data: existingConversations, error: findError } = await supabase
          .from('conversations')
          .select('id')
          .eq('ultravox_call_id', callId);

        if (findError || !existingConversations || existingConversations.length === 0) {
          console.log(`⚠️ No conversation found for message event, callId: ${callId}`);
        } else {
          const conversation = existingConversations[0];
          
          // Save each new message
          const latestMessage = call.messages[call.messages.length - 1];
          if (latestMessage) {
            await saveTranscript({
              conversation_id: conversation.id,
              speaker: latestMessage.role === 'user' ? 'user' : 'wiktoria', // Default agent messages to wiktoria
              stage: 'real_time',
              content: latestMessage.text || latestMessage.content || 'Message received'
            });
            console.log(`✅ Real-time message saved for conversation: ${conversation.id}`);
          }
        }
      } catch (messageError) {
        console.error('❌ Error processing message event:', messageError);
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