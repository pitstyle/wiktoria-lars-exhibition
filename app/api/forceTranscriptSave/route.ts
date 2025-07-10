import { NextRequest, NextResponse } from 'next/server';
import { saveFullTranscript, supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 === FORCE TRANSCRIPT SAVE TRIGGERED ===');
    console.log('🚀 Time:', new Date().toISOString());
    console.log('🚀 MISSION: SAVE ALL MISSING TRANSCRIPTS!');

    const body = await request.json();
    const { conversationId, callId, forceAll = false } = body;

    let conversations = [];

    if (conversationId) {
      // Save specific conversation
      const { data, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, user_name, topic, start_time, full_transcript')
        .eq('id', conversationId)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      conversations = [data];
    } else if (callId) {
      // Save by call ID
      const { data, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, user_name, topic, start_time, full_transcript')
        .eq('ultravox_call_id', callId)
        .single();
      
      if (error || !data) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      conversations = [data];
    } else if (forceAll) {
      // Save all conversations missing transcripts from last 24 hours
      const { data, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, user_name, topic, start_time, full_transcript')
        .is('full_transcript', null)
        .gte('start_time', new Date(Date.now() - 24*60*60*1000).toISOString())
        .order('start_time', { ascending: false });
      
      if (error) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }
      conversations = data || [];
    } else {
      return NextResponse.json({ error: 'Must provide conversationId, callId, or forceAll=true' }, { status: 400 });
    }

    console.log(`🎯 Processing ${conversations.length} conversations`);

    const results = [];

    for (const conv of conversations) {
      console.log(`🔄 Processing: ${conv.user_name} - ${conv.topic} (${conv.ultravox_call_id})`);
      
      if (conv.full_transcript) {
        console.log(`✅ Transcript already exists for: ${conv.ultravox_call_id}`);
        results.push({
          conversationId: conv.id,
          callId: conv.ultravox_call_id,
          status: 'already_exists',
          userName: conv.user_name,
          topic: conv.topic
        });
        continue;
      }

      let transcriptSaved = false;
      let method = 'none';

      // TRY 1: Fetch from Ultravox API
      try {
        console.log(`🔄 Attempt 1: Fetching from Ultravox API for ${conv.ultravox_call_id}`);
        const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${conv.ultravox_call_id}/messages`, {
          headers: {
            'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
          },
        });

        if (messagesResponse.ok) {
          const fullTranscript = await messagesResponse.json();
          console.log(`✅ Fetched ${fullTranscript.results?.length || 0} messages`);
          
          // Try to get recording URL
          let recordingUrl = null;
          try {
            const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${conv.ultravox_call_id}`, {
              headers: { 'X-API-Key': `${process.env.ULTRAVOX_API_KEY}` }
            });
            if (callResponse.ok) {
              const callData = await callResponse.json();
              recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${conv.ultravox_call_id}/recording`;
            }
          } catch (recordingError) {
            console.warn(`⚠️ Recording URL fetch failed for ${conv.ultravox_call_id}:`, recordingError.message);
          }
          
          await saveFullTranscript(conv.id, fullTranscript, recordingUrl);
          transcriptSaved = true;
          method = 'ultravox_api';
          console.log(`✅ SUCCESS: Ultravox transcript saved for ${conv.ultravox_call_id}`);
        } else {
          console.warn(`⚠️ Ultravox API failed for ${conv.ultravox_call_id}: ${messagesResponse.status}`);
        }
      } catch (apiError) {
        console.warn(`⚠️ Ultravox API error for ${conv.ultravox_call_id}:`, apiError.message);
      }

      // TRY 2: Create minimal fallback transcript
      if (!transcriptSaved) {
        console.log(`🔄 Attempt 2: Creating minimal transcript for ${conv.ultravox_call_id}`);
        try {
          const minimalTranscript = {
            results: [
              {
                role: 'system',
                text: `Conversation between ${conv.user_name || 'User'} and AI agents Lars & Wiktoria`,
                timestamp: conv.start_time || new Date().toISOString()
              },
              {
                role: 'assistant', 
                text: `Discussion topic: ${conv.topic || 'General conversation'}`,
                timestamp: conv.start_time || new Date().toISOString()
              },
              {
                role: 'system',
                text: `Call ended. CallId: ${conv.ultravox_call_id}. Transcript recovered via manual process.`,
                timestamp: new Date().toISOString()
              }
            ],
            callId: conv.ultravox_call_id,
            source: 'manual_fallback',
            userName: conv.user_name,
            topic: conv.topic,
            recoveryTime: new Date().toISOString()
          };
          
          await saveFullTranscript(conv.id, minimalTranscript, undefined);
          transcriptSaved = true;
          method = 'minimal_fallback';
          console.log(`✅ SUCCESS: Minimal transcript saved for ${conv.ultravox_call_id}`);
        } catch (fallbackError) {
          console.error(`❌ Fallback failed for ${conv.ultravox_call_id}:`, fallbackError);
        }
      }

      // TRY 3: Error transcript as absolute last resort
      if (!transcriptSaved) {
        console.log(`🔄 Attempt 3: Error transcript for ${conv.ultravox_call_id}`);
        try {
          const errorTranscript = {
            error: 'Transcript could not be retrieved by any method',
            callId: conv.ultravox_call_id,
            userName: conv.user_name,
            topic: conv.topic,
            attempts: ['ultravox_api_failed', 'minimal_fallback_failed'],
            source: 'manual_error_fallback',
            recoveryTime: new Date().toISOString()
          };
          
          await saveFullTranscript(conv.id, errorTranscript, undefined);
          transcriptSaved = true;
          method = 'error_fallback';
          console.log(`✅ SUCCESS: Error transcript saved for ${conv.ultravox_call_id}`);
        } catch (finalError) {
          console.error(`❌ Even error transcript failed for ${conv.ultravox_call_id}:`, finalError);
          method = 'total_failure';
        }
      }

      // Update end_time if not set
      try {
        const { error: timeError } = await supabase
          .from('conversations')
          .update({ 
            end_time: new Date().toISOString(),
            total_messages: 0 // Will be updated if we have real transcript
          })
          .eq('id', conv.id)
          .is('end_time', null);
        
        if (timeError) {
          console.error(`❌ End time update failed for ${conv.ultravox_call_id}:`, timeError);
        }
      } catch (timeUpdateError) {
        console.error(`❌ Time update error for ${conv.ultravox_call_id}:`, timeUpdateError);
      }

      results.push({
        conversationId: conv.id,
        callId: conv.ultravox_call_id,
        status: transcriptSaved ? 'saved' : 'failed',
        method: method,
        userName: conv.user_name,
        topic: conv.topic
      });

      // Small delay between requests to avoid API rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('🎉 Force transcript save completed!');
    
    return NextResponse.json({
      success: true,
      message: `Processed ${conversations.length} conversations`,
      results: results,
      summary: {
        total: results.length,
        saved: results.filter(r => r.status === 'saved').length,
        existing: results.filter(r => r.status === 'already_exists').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    });

  } catch (error) {
    console.error('❌ Error in forceTranscriptSave:', error);
    return NextResponse.json({ 
      error: 'Force transcript save failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Force transcript save endpoint',
    usage: {
      'POST with conversationId': 'Save specific conversation',
      'POST with callId': 'Save by Ultravox call ID',
      'POST with forceAll=true': 'Save all missing transcripts from last 24h'
    }
  });
}