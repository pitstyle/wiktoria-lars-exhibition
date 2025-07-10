import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript, saveTranscript } from '@/lib/supabase';
import { archiveService } from '@/lib/archiveService';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('🔚 === ENDCALL ROUTE TRIGGERED ===');
  console.log('🔚 Time:', new Date().toISOString());
  console.log('🔚 MISSION: SAVE TRANSCRIPT NO MATTER WHAT!');
  
  try {
    const body = await request.json();
    console.log(`🔚 EndCall route called at ${new Date().toISOString()}`);
    console.log('🔚 DEBUGGING: EndCall triggered - Call duration and trigger analysis needed');
    console.log('🔚 Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('🔚 End call context:', body);
    console.log('🔚 Call timing: Started at startup, now ending at', new Date().toISOString());
    
    // Check if this is a premature call ending (should be ~10 minutes, not 2-3)
    const callDurationMinutes = Math.floor(startTime / 60000);
    if (callDurationMinutes < 8) {
      console.log('🚨 WARNING: Call ending prematurely! Expected ~10 minutes, got:', callDurationMinutes, 'minutes');
      console.log('🚨 This suggests maxDuration (600s) is not being respected or something else is triggering EndCall');
    }

    // Extract context data and call ID
    const { userName, lastSpeaker } = body.contextData || {};
    const { callId } = body; // This should come from automatic parameter
    
    console.log(`🔚 Ending call for user: ${userName || 'unknown'}, last speaker: ${lastSpeaker || 'unknown'}, callId: ${callId}`);

    // BULLETPROOF TRANSCRIPT SAVING - SAVE TRANSCRIPT NO MATTER WHAT
    if (callId) {
      console.log('🚀 FORCED TRANSCRIPT SAVE - NO EXCEPTIONS!');
      
      // Find conversation FIRST - this must exist
      const { supabase } = await import('@/lib/supabase');
      const { data: conversations, error: findError } = await supabase
        .from('conversations')
        .select('id, full_transcript, start_time')
        .eq('ultravox_call_id', callId)
        .single();

      if (findError || !conversations) {
        console.error('❌ CRITICAL: No conversation found for callId:', callId, findError);
        // STILL try to save something - create minimal record
        try {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ 
              ultravox_call_id: callId, 
              user_name: userName || 'Unknown', 
              topic: 'Recovered Call',
              full_transcript: { error: 'Call ended without proper conversation record', callId, userName, timestamp: new Date().toISOString() }
            })
            .select('id')
            .single();
          console.log('🔄 Created emergency conversation record:', newConv?.id);
        } catch (emergencyError) {
          console.error('❌ Even emergency conversation creation failed:', emergencyError);
        }
      } else {
        // Conversation exists - force save transcript
        console.log(`🎯 Found conversation: ${conversations.id}, forcing transcript save...`);
        
        if (conversations.full_transcript) {
          console.log('✅ Full transcript already exists - keeping existing data');
        } else {
          console.log('🚀 NO TRANSCRIPT EXISTS - FORCING SAVE FROM ULTRAVOX API');
          
          let transcriptSaved = false;
          let fullTranscript = null;
          let recordingUrl = null;
          
          // TRY 1: Fetch from Ultravox API
          try {
            console.log('🔄 Attempt 1: Fetching from Ultravox API...');
            const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
              headers: {
                'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
              },
            });

            if (messagesResponse.ok) {
              fullTranscript = await messagesResponse.json();
              console.log('✅ Ultravox API success:', fullTranscript.results?.length || 0, 'messages');
              
              // Try to get recording URL
              try {
                const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
                  headers: { 'X-API-Key': `${process.env.ULTRAVOX_API_KEY}` }
                });
                if (callResponse.ok) {
                  const callData = await callResponse.json();
                  recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${callId}/recording`;
                }
              } catch (recordingError) {
                console.warn('⚠️ Recording URL fetch failed:', (recordingError as Error).message);
              }
              
              await saveFullTranscript(conversations.id, fullTranscript, recordingUrl);
              transcriptSaved = true;
              console.log('✅ SUCCESS: Ultravox transcript saved!');
            } else {
              console.warn('⚠️ Ultravox API failed:', messagesResponse.status, await messagesResponse.text());
            }
          } catch (apiError) {
            console.warn('⚠️ Ultravox API error:', (apiError as Error).message);
          }
          
          // TRY 2: If API failed, create minimal transcript from conversation data
          if (!transcriptSaved) {
            console.log('🔄 Attempt 2: Creating minimal transcript from conversation data...');
            try {
              const minimalTranscript = {
                results: [
                  {
                    role: 'system',
                    text: `Conversation between ${userName || 'User'} and AI agents Lars & Wiktoria`,
                    timestamp: conversations.start_time || new Date().toISOString()
                  },
                  {
                    role: 'assistant', 
                    text: `This conversation was about: ${body.contextData?.topic || 'General discussion'}`,
                    timestamp: new Date().toISOString()
                  },
                  {
                    role: 'system',
                    text: `Call ended normally. CallId: ${callId}. Final speaker: ${lastSpeaker || 'unknown'}`,
                    timestamp: new Date().toISOString()
                  }
                ],
                callId: callId,
                source: 'endCall_fallback',
                userName: userName,
                endTime: new Date().toISOString()
              };
              
              await saveFullTranscript(conversations.id, minimalTranscript, null);
              transcriptSaved = true;
              console.log('✅ SUCCESS: Minimal transcript saved as fallback!');
            } catch (fallbackError) {
              console.error('❌ Even fallback transcript failed:', fallbackError);
            }
          }
          
          // TRY 3: Absolute last resort - save error transcript
          if (!transcriptSaved) {
            console.log('🔄 Attempt 3: Absolute last resort - saving error transcript...');
            try {
              const errorTranscript = {
                error: 'Transcript could not be retrieved',
                callId: callId,
                userName: userName || 'Unknown',
                endTime: new Date().toISOString(),
                attempts: ['ultravox_api_failed', 'minimal_fallback_failed'],
                source: 'endCall_error_fallback'
              };
              
              await saveFullTranscript(conversations.id, errorTranscript, null);
              console.log('✅ SUCCESS: Error transcript saved - better than nothing!');
            } catch (finalError) {
              console.error('❌ CATASTROPHIC: Even error transcript failed:', finalError);
            }
          }
        }
        
        // ALWAYS save end call transcript regardless of full_transcript success
        try {
          await saveTranscript({
            conversation_id: conversations.id,
            speaker: lastSpeaker === 'wiktoria' ? 'wiktoria' : 'lars',
            stage: 'conversation_end',
            content: `Conversation ended gracefully. Final speaker: ${lastSpeaker || 'unknown'}. User: ${userName || 'unknown'} completed discussion.`
          });
          console.log('✅ End call transcript saved');
        } catch (endTranscriptError) {
          console.error('❌ End call transcript failed:', endTranscriptError);
        }
        
        // ALWAYS update end_time regardless of transcript success
        try {
          await supabase
            .from('conversations')
            .update({ 
              end_time: new Date().toISOString(),
              total_messages: fullTranscript?.results?.length || 0
            })
            .eq('id', conversations.id);
          console.log('✅ Conversation end_time updated');
        } catch (timeError) {
          console.error('❌ End time update failed:', timeError);
        }
      }
    } else {
      console.log('❌ CRITICAL: No callId provided - cannot save any transcript!');
    }

    // Generate contextual farewell message for agent to speak in Polish as character
    const farewellContext = {
      userName: userName || 'przyjacielu',
      lastSpeaker: lastSpeaker || 'Leader Lars',
      politeGoodbye: true
    };

    // Create simple goodbye message that the agent will speak
    const agentFarewellMessage = `Dziękujemy, ${farewellContext.userName}, za wspaniałą rozmowę! Zapraszamy do ponownego kontaktu. Do widzenia!`;

    // Return response that will make agent speak farewell before terminating call  
    const response = NextResponse.json({
      message: agentFarewellMessage,
      success: true
      // No selectedTools or systemPrompt - this signals end of conversation after agent speaks
    });

    // CRITICAL FIX: Use correct Ultravox headers for call termination with agent farewell
    response.headers.set('X-Ultravox-Response-Type', 'hang-up');
    response.headers.set('X-Ultravox-Agent-Reaction', 'speaks');

    console.log(`✅ End call response sent successfully in ${Date.now() - startTime}ms`);
    return response;
    
  } catch (error) {
    console.error('❌ Error in endCall route:', error);
    return NextResponse.json({ 
      error: 'Internal server error in end call', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}