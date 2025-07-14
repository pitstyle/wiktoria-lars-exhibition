import { NextResponse, NextRequest } from 'next/server';
import { saveFullTranscript } from '@/lib/supabase';

// Function to extract user name and topic from transcript
function extractUserDataFromTranscript(transcript: any): { userName?: string, topic?: string } {
  if (!transcript?.results || !Array.isArray(transcript.results)) {
    return {};
  }

  // PRIORITY 1: Check if Lars already extracted data in transferToWiktoria tool call
  for (const message of transcript.results) {
    if (message.role === 'MESSAGE_ROLE_TOOL_CALL' && 
        message.toolName === 'transferToWiktoria' && 
        message.text) {
      try {
        const toolData = JSON.parse(message.text);
        if (toolData.contextData) {
          const extractedName = toolData.contextData.userName;
          const extractedTopic = toolData.contextData.topic;
          
          console.log(`✅ FOUND LARS EXTRACTION - Name: ${extractedName}, Topic: ${extractedTopic}`);
          
          // Use the exact topic, just clean it up for display
          let cleanTopic = extractedTopic;
          if (cleanTopic) {
            // Capitalize first letter and clean up
            cleanTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
            // Translate common Polish terms to English for better display
            cleanTopic = cleanTopic
              .replace(/^rozpoznawanie twarzy$/i, 'Face Recognition')
              .replace(/^wieczność$/i, 'Eternity')
              .replace(/^przezroczystość$/i, 'Transparency')
              .replace(/^polityka$/i, 'Politics')
              .replace(/^sztuka$/i, 'Art');
          }
          
          return {
            userName: extractedName || undefined,
            topic: cleanTopic || undefined
          };
        }
      } catch (error) {
        console.error('Failed to parse tool data:', error);
      }
    }
  }

  // FALLBACK: Extract from user voice messages
  let userName = '';
  let topic = '';

  for (const message of transcript.results) {
    if (message.role === 'MESSAGE_ROLE_USER' && message.text && message.medium === 'MESSAGE_MEDIUM_VOICE') {
      const text = message.text.toLowerCase();
      console.log(`🔍 Fallback extraction - Checking message: ${text.substring(0, 150)}...`);
      
      // Extract name patterns
      const namePatterns = [
        /(?:mam na imię|nazywam się|jestem)\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/i,
        /(?:my name is|i'm|i am)\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/i,
      ];
      
      for (const pattern of namePatterns) {
        const nameMatch = text.match(pattern);
        if (nameMatch && !userName && nameMatch[1].length >= 3) {
          userName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
          console.log(`✅ FALLBACK NAME FOUND: ${userName}`);
          break;
        }
      }
      
      // Simple topic extraction from content
      if (!topic && text.includes('wieczność')) {
        topic = 'Eternity';
      } else if (text.includes('rozpoznawanie twarzy')) {
        topic = 'Face Recognition';
      } else if (text.includes('przezroczystość')) {
        topic = 'Transparency';
      }
    }
  }

  return {
    userName: userName || undefined,
    topic: topic || undefined
  };
}


// Function to identify speaker from message content and role
function identifySpeaker(role: string, text: string, previousSpeaker: string = '', messageIndex: number = 0): string {
  if (role === 'MESSAGE_ROLE_USER') {
    return 'User';
  }
  
  if (role === 'MESSAGE_ROLE_AGENT') {
    const text_lower = text.toLowerCase();
    
    // DEBUG: Log message content for troubleshooting
    console.log(`🔍 Speaker Detection - Message ${messageIndex}: ${text_lower.substring(0, 100)}...`);
    
    // PRIORITY 1: Strong Lars indicators (check FIRST to avoid transfer confusion)
    if (text_lower.includes('leader lars') || 
        text_lower.includes('*coughs*') || 
        text_lower.includes('*puffs on cigarette*') ||
        text_lower.includes('*clears throat*') ||
        text_lower.includes('*scribbles notes*') ||
        text_lower.includes('*mutters') ||
        text_lower.includes('synthetic party') ||
        text_lower.includes('gravel-voiced') ||
        text_lower.includes('chain-smoking')) {
      console.log(`✅ LARS DETECTED by behavioral indicators in message ${messageIndex}`);
      return 'Leader Lars';
    }
    
    // PRIORITY 2: Context-based detection: After transfer tool, it's Wiktoria
    if (previousSpeaker === 'TOOL_TRANSFER') {
      return 'Wiktoria Cukt 2.0';
    }
    
    // PRIORITY 3: Strong Wiktoria self-identification (only if no Lars indicators)
    if (text_lower.includes('jestem wiktoria cukt') || 
        text_lower.includes('wiktoria cukt, prezydent') ||
        text_lower.includes('president of poland') ||
        text_lower.includes('prezydent polski') ||
        text_lower.includes('ai president')) {
      return 'Wiktoria Cukt 2.0';
    }
    
    // PRIORITY 4: Wiktoria mentions (but NOT in transfer contexts)
    if (text_lower.includes('wiktoria') && 
        !text_lower.includes('pass the conversation to') && 
        !text_lower.includes('transfer') &&
        !text_lower.includes('colleague') &&
        !text_lower.includes('hand over')) {
      return 'Wiktoria Cukt 2.0';
    }
    
    // PRIORITY 5: Contextual fallback: if we just had a transfer, assume Wiktoria
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

// Function to enhance transcript with proper speaker labels
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

// Helper function to retry API calls with exponential backoff
async function retryFetch(url: string, options: any, maxRetries: number = 3, delay: number = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 Attempt ${attempt}/${maxRetries} - Fetching: ${url}`);
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // If it's a 404 or 422, the transcript might not be ready yet
      if (response.status === 404 || response.status === 422) {
        console.log(`⏳ Transcript not ready (${response.status}), waiting ${delay}ms before retry...`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
      }
      
      // For other errors, don't retry
      return response;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts`);
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 API Route called: fetch-ultravox-data');
    const { callId, conversationId } = await request.json();
    
    if (!callId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing callId or conversationId' },
        { status: 400 }
      );
    }

    console.log('🚀 Fetching full transcript for call:', callId);

    // First, check if the call exists and is complete
    try {
      console.log('🔍 Checking call status first...');
      const callCheckResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
        headers: {
          'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
        },
      });

      if (!callCheckResponse.ok) {
        console.error('❌ Call not found:', callCheckResponse.status);
        return NextResponse.json(
          { error: `Call ${callId} not found or invalid` },
          { status: 404 }
        );
      }

      const callData = await callCheckResponse.json();
      console.log('📞 Call status:', {
        ended: callData.ended,
        status: callData.status,
        duration: callData.duration
      });

      // If call hasn't ended, wait longer
      if (!callData.ended) {
        console.log('⏳ Call not ended yet, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        console.log('⏳ Call ended, waiting 5 seconds for transcript processing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('⚠️ Error checking call status:', error);
      // Continue anyway, might be a temporary issue
    }

    // Fetch full transcript from Ultravox API with retry logic
    const messagesResponse = await retryFetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
      headers: {
        'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
      },
    }, 8, 3000); // 8 retries with 3-second initial delay

    if (!messagesResponse.ok) {
      console.error('❌ Failed to fetch messages after retries:', messagesResponse.status, messagesResponse.statusText);
      
      // Try to save whatever we can get
      try {
        const errorText = await messagesResponse.text();
        console.error('❌ Error response body:', errorText);
      } catch (e) {
        console.error('❌ Could not read error response');
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch transcript from Ultravox after multiple attempts',
          status: messagesResponse.status,
          callId: callId
        },
        { status: messagesResponse.status }
      );
    }

    const rawTranscript = await messagesResponse.json();
    console.log('💾 Raw transcript fetched:', rawTranscript.results?.length || 0, 'messages');
    
    // Validate transcript has meaningful content
    if (!rawTranscript.results || rawTranscript.results.length < 1) {
      console.log('⚠️ Transcript appears empty, but will save basic conversation data');
      
      // Even if transcript is empty, update the conversation as attempted
      try {
        const { supabase } = await import('@/lib/supabase');
        await supabase
          .from('conversations')
          .update({ 
            end_time: new Date().toISOString(),
            total_messages: 0,
            full_transcript: { results: [], attempted_fetch: true, error: 'Empty transcript from Ultravox' }
          })
          .eq('id', conversationId);
        console.log('💾 Saved empty transcript attempt record');
      } catch (error) {
        console.error('⚠️ Failed to save empty transcript record:', error);
      }
      
      return NextResponse.json({
        success: false,
        error: 'Transcript is empty',
        transcriptCount: rawTranscript.results?.length || 0,
        savedEmptyRecord: true
      });
    }
    
    // Enhance transcript with proper speaker labels
    const fullTranscript = enhanceTranscriptWithSpeakers(rawTranscript);
    console.log('✨ Transcript enhanced with speaker labels');

    // Extract user name and topic from transcript content
    const extractedData = extractUserDataFromTranscript(fullTranscript);
    console.log('📝 Extracted user data:', extractedData);

    // Fetch call details and recording URL from Ultravox API
    let recordingUrl = null;
    let updatedUserName = extractedData.userName;
    let updatedTopic = extractedData.topic;

    try {
      // Get call details first to check recording status
      const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}`, {
        headers: {
          'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
        },
      });

      if (callResponse.ok) {
        const callData = await callResponse.json();
        console.log('🔍 Call data received:', {
          recordingEnabled: callData.recordingEnabled,
          ended: callData.ended,
          recordingUrl: callData.recordingUrl
        });

        // Check if recording is enabled and available
        if (callData.recordingEnabled && callData.ended) {
          // Try the direct recording URL if provided
          if (callData.recordingUrl) {
            recordingUrl = callData.recordingUrl;
          } else {
            // Fallback to the standard recording endpoint
            recordingUrl = `https://api.ultravox.ai/api/calls/${callId}/recording`;
          }
          console.log('💾 Recording URL obtained:', recordingUrl);
        } else {
          console.log('⚠️ Recording not available - enabled:', callData.recordingEnabled, 'ended:', callData.ended);
        }
      } else {
        console.error('❌ Failed to fetch call details:', callResponse.status, callResponse.statusText);
      }
    } catch (recordingError) {
      console.error('⚠️ Failed to fetch call details:', recordingError);
      // Continue without recording - it may not be ready yet
    }

    // Save full transcript and recording URL to database
    try {
      await saveFullTranscript(conversationId, fullTranscript, recordingUrl);
      console.log('💾 Full transcript and recording URL saved to database');
    } catch (saveError) {
      console.error('❌ Failed to save transcript to database:', saveError);
      
      // Try to at least mark the conversation as ended
      try {
        const { supabase } = await import('@/lib/supabase');
        await supabase
          .from('conversations')
          .update({ 
            end_time: new Date().toISOString(),
            total_messages: fullTranscript.results?.length || 0,
            full_transcript: { 
              error: 'Failed to save transcript', 
              attempted_save: true,
              transcript_length: fullTranscript.results?.length || 0 
            }
          })
          .eq('id', conversationId);
        console.log('💾 Marked conversation as ended despite transcript save failure');
      } catch (fallbackError) {
        console.error('❌ Even fallback save failed:', fallbackError);
      }
      
      // Return error but don't completely fail
      return NextResponse.json({
        success: false,
        error: 'Failed to save transcript to database',
        transcriptCount: fullTranscript.results?.length || 0,
        details: saveError instanceof Error ? saveError.message : String(saveError)
      }, { status: 500 });
    }

    // Update conversation with extracted user name and topic if we found them
    if (updatedUserName || updatedTopic) {
      try {
        const { supabase } = await import('@/lib/supabase');
        const updateData: any = {};
        
        if (updatedUserName) updateData.user_name = updatedUserName;
        if (updatedTopic) updateData.topic = updatedTopic;
        
        const { error: updateError } = await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', conversationId);
          
        if (updateError) {
          console.error('⚠️ Failed to update conversation data:', updateError);
        } else {
          console.log('✅ Updated conversation with extracted data:', updateData);
        }
      } catch (updateError) {
        console.error('⚠️ Error updating conversation:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      transcriptCount: fullTranscript.results?.length || 0,
      recordingUrl: recordingUrl,
      enhanced: fullTranscript.enhanced_with_speakers || false,
      extractedData: {
        userName: updatedUserName,
        topic: updatedTopic
      },
      message: 'Full conversation archived successfully with speaker labels and extracted data'
    });

  } catch (error) {
    console.error('❌ Error in fetch-ultravox-data API:', error);
    return NextResponse.json(
      { 
        error: 'Error fetching Ultravox data', 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}