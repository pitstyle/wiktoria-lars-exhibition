import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript, saveTranscript } from '@/lib/supabase';
import { archiveService } from '@/lib/archiveService';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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

    // CRITICAL FIX: Fetch and save full transcript before ending call
    if (callId) {
      try {
        console.log('💾 Fetching full transcript from Ultravox before ending call...');
        
        // Fetch full transcript from Ultravox API
        const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
          headers: {
            'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
          },
        });

        if (messagesResponse.ok) {
          const fullTranscript = await messagesResponse.json();
          console.log('💾 Full transcript fetched:', fullTranscript.results?.length || 0, 'messages');
          
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
              if (callData.recordingEnabled && callData.ended) {
                recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${callId}/recording`;
                console.log('💾 Recording URL obtained:', recordingUrl);
              }
            }
          } catch (recordingError) {
            console.error('⚠️ Failed to fetch recording URL:', recordingError);
          }

          // Find the conversation by call ID and save transcript
          const { supabase } = await import('@/lib/supabase');
          const { data: conversations, error: findError } = await supabase
            .from('conversations')
            .select('id')
            .eq('ultravox_call_id', callId)
            .single();

          if (findError) {
            console.error('⚠️ Could not find conversation for call ID:', callId, findError);
          } else if (conversations) {
            // Check if transcript already exists to prevent duplicates
            const { data: existingConv } = await supabase
              .from('conversations')
              .select('full_transcript')
              .eq('id', conversations.id)
              .single();

            if (existingConv?.full_transcript) {
              console.log('✅ Full transcript already exists, skipping save to prevent duplicate');
            } else {
              await saveFullTranscript(conversations.id, fullTranscript, recordingUrl);
              console.log('✅ Full transcript saved to database for conversation:', conversations.id);
            }

            // Save end call stage as transcript (only if we saved the full transcript)
            if (!existingConv?.full_transcript) {
              await saveTranscript({
                conversation_id: conversations.id,
                speaker: lastSpeaker === 'wiktoria' ? 'wiktoria' : 'lars',
                stage: 'conversation_end',
                content: `Conversation ended gracefully. Final speaker: ${lastSpeaker || 'unknown'}. User: ${userName || 'unknown'} completed discussion.`
              });
              console.log('✅ End call transcript saved');
              
              // Finalize conversation archiving
              await archiveService.finalizeConversation(callId, fullTranscript, recordingUrl);
              console.log('✅ Conversation archiving finalized');
            } else {
              console.log('✅ Skipping end call transcript and archiving - already processed');
            }
          }
        } else {
          console.error('❌ Failed to fetch transcript from Ultravox:', messagesResponse.status);
        }
      } catch (transcriptError) {
        console.error('❌ Error fetching/saving transcript:', transcriptError);
        // Continue with call termination even if transcript save fails
      }
    } else {
      console.log('⚠️ No callId provided - cannot fetch transcript');
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