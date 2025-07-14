import { NextResponse, NextRequest } from 'next/server';
import { saveFullTranscript } from '@/lib/supabase';

// Function to extract user name and topic from transcript
function extractUserDataFromTranscript(transcript: any): { userName?: string, topic?: string } {
  if (!transcript?.results || !Array.isArray(transcript.results)) {
    return {};
  }

  let userName = '';
  let topic = '';

  // Look through messages to find user name and topic
  for (const message of transcript.results) {
    if (message.role === 'MESSAGE_ROLE_USER' && message.text) {
      const text = message.text.toLowerCase();
      console.log(`🔍 Topic Detection - Checking message: ${text.substring(0, 150)}...`);
      
      // Extract name patterns
      const nameMatch = text.match(/(?:mam na imię|nazywam się|jestem|my name is|i'm|i am)\s+([a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]+)/i);
      if (nameMatch && !userName) {
        userName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
        console.log(`✅ NAME FOUND: ${userName}`);
      }
      
      // Extract topic patterns  
      if (text.includes('edukacji') || text.includes('education')) {
        topic = 'Education & AI';
        console.log(`✅ TOPIC FOUND: ${topic}`);
      } else if (text.includes('polityka') || text.includes('politics')) {
        topic = 'Politics & Society';
        console.log(`✅ TOPIC FOUND: ${topic}`);
      } else if (text.includes('technologia') || text.includes('technology')) {
        topic = 'Technology & Innovation';
        console.log(`✅ TOPIC FOUND: ${topic}`);
      } else if (text.includes('sztuka') || text.includes('art')) {
        topic = 'Art & Culture';
        console.log(`✅ TOPIC FOUND: ${topic}`);
      } else if (text.includes('kolarz') || text.includes('rower') || 
                 text.includes('prędkość') || text.includes('szybkość') || 
                 text.includes('cycling') || text.includes('speed') || 
                 text.includes('sport') || text.includes('fitness') ||
                 text.includes('zawodowo jeżdżę') ||
                 text.includes('kolarzem') || text.includes('rowerze') ||
                 text.includes('prędkości') || text.includes('szybkości') ||
                 text.includes('bicykl') || text.includes('kolarstw')) {
        topic = 'Sports & Performance';
        console.log(`✅ SPORTS TOPIC FOUND: ${topic} (matched cycling patterns)`);
      } else if (text.includes('biznes') || text.includes('business') ||
                 text.includes('praca') || text.includes('work') ||
                 text.includes('firma') || text.includes('company')) {
        topic = 'Business & Career';
        console.log(`✅ TOPIC FOUND: ${topic}`);
      } else {
        console.log(`❌ No topic patterns matched in this message`);
      }
    }
  }

  return {
    userName: userName || undefined,
    topic: topic || undefined
  };
}

// Function to detect conversation stage based on tool calls and message patterns
function detectConversationStage(role: string, text: string, toolName: string = '', messageIndex: number = 0): number {
  if (role === 'MESSAGE_ROLE_TOOL_CALL') {
    if (toolName === 'transferToWiktoria') {
      return 2; // Stage 2: Wiktoria Opinion Leader
    }
    if (toolName === 'requestLarsPerspective') {
      return 3; // Stage 3: Lars Perspective Provider
    }
    if (toolName === 'returnToWiktoria') {
      return 4; // Stage 4: Wiktoria Conversation Facilitator
    }
  }
  
  // Default to Stage 1 for early messages (Lars collector)
  if (messageIndex < 8) {
    return 1;
  }
  
  // If no clear stage detected, maintain previous or default to 1
  return 1;
}

// Function to identify speaker from message content and role
function identifySpeaker(role: string, text: string, previousSpeaker: string = '', messageIndex: number = 0, toolName: string = ''): string {
  if (role === 'MESSAGE_ROLE_USER') {
    return 'User';
  }
  
  if (role === 'MESSAGE_ROLE_AGENT') {
    const text_lower = text.toLowerCase();
    
    // DEBUG: Log message content for troubleshooting
    console.log(`🔍 Speaker Detection - Message ${messageIndex}: ${text_lower.substring(0, 100)}...`);
    
    // PRIORITY 1: Strong Lars behavioral indicators
    if (text_lower.includes('leader lars') || 
        text_lower.includes('partii syntetycznej') ||
        text_lower.includes('synthetic party') ||
        text_lower.includes('*coughs*') || 
        text_lower.includes('*puffs on cigarette*') ||
        text_lower.includes('*clears throat*') ||
        text_lower.includes('*scribbles notes*') ||
        text_lower.includes('*mutters') ||
        text_lower.includes('gravel-voiced') ||
        text_lower.includes('chain-smoking') ||
        text_lower.includes('anarchist') ||
        text_lower.includes('anarchiczn')) {
      console.log(`✅ LARS DETECTED by behavioral indicators in message ${messageIndex}`);
      return 'Leader Lars';
    }
    
    // PRIORITY 2: Strong Wiktoria self-identification
    if (text_lower.includes('wiktoria cukt') || 
        text_lower.includes('ai prezydent') ||
        text_lower.includes('president of poland') ||
        text_lower.includes('prezydent polski') ||
        text_lower.includes('ai president')) {
      console.log(`✅ WIKTORIA DETECTED by self-identification in message ${messageIndex}`);
      return 'Wiktoria Cukt 2.0';
    }
    
    // PRIORITY 3: Context-based detection after tool transfers
    if (previousSpeaker === 'TOOL_TRANSFER' || previousSpeaker === 'System') {
      // Check if message contains Wiktoria content patterns
      if (text_lower.includes('witaj') || 
          text_lower.includes('po wysłuchaniu') ||
          text_lower.includes('mam jeszcze więcej do powiedzenia') ||
          text_lower.includes('jako ai prezydent')) {
        return 'Wiktoria Cukt 2.0';
      }
    }
    
    // PRIORITY 4: Stage-based detection
    // After message 10, if we see political/anarchist language, it's likely Lars
    if (messageIndex > 10 && (
        text_lower.includes('hahah') ||
        text_lower.includes('...!?!!?!') ||
        text_lower.includes('ale, ale, ale') ||
        text_lower.includes('anarchist') ||
        text_lower.includes('restrykcj') ||
        text_lower.includes('zmiany są konieczne'))) {
      return 'Leader Lars';
    }
    
    // PRIORITY 5: Early message detection (Lars usually starts)
    if (messageIndex < 8) {
      return 'Leader Lars';
    }
    
    // Default fallback based on message content
    if (text_lower.includes('wiktoria') && 
        !text_lower.includes('pass the conversation to') && 
        !text_lower.includes('transfer') &&
        !text_lower.includes('colleague') &&
        !text_lower.includes('hand over')) {
      return 'Wiktoria Cukt 2.0';
    }
    
    // Final fallback to Lars
    return 'Leader Lars';
  }
  
  if (role === 'MESSAGE_ROLE_TOOL_CALL') {
    if (toolName === 'transferToWiktoria' || toolName === 'requestLarsPerspective' || toolName === 'returnToWiktoria') {
      return 'TOOL_TRANSFER';
    }
    return 'System';
  }
  
  if (role === 'MESSAGE_ROLE_TOOL_RESULT') {
    return 'System';
  }
  
  return 'Unknown';
}

// Function to enhance transcript with proper speaker labels and conversation stages
function enhanceTranscriptWithSpeakers(transcript: any): any {
  if (!transcript || !transcript.results || !Array.isArray(transcript.results)) {
    return transcript;
  }
  
  let previousSpeaker = '';
  let currentStage = 1;
  
  const enhancedResults = transcript.results.map((message: any, index: number) => {
    const toolName = message.toolName || '';
    const speaker = identifySpeaker(message.role, message.text || '', previousSpeaker, index, toolName);
    
    // Detect stage transitions
    const detectedStage = detectConversationStage(message.role, message.text || '', toolName, index);
    if (detectedStage > currentStage) {
      currentStage = detectedStage;
    }
    
    previousSpeaker = speaker;
    
    return {
      ...message,
      speaker_label: speaker,
      conversation_stage: currentStage,
      enhanced: true
    };
  });
  
  return {
    ...transcript,
    results: enhancedResults,
    enhanced_with_speakers: true,
    enhanced_with_stages: true,
    enhancement_timestamp: new Date().toISOString()
  };
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

    // Fetch full transcript from Ultravox API
    const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${callId}/messages`, {
      headers: {
        'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
      },
    });

    if (!messagesResponse.ok) {
      console.error('❌ Failed to fetch messages:', messagesResponse.status, messagesResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch transcript from Ultravox' },
        { status: messagesResponse.status }
      );
    }

    const rawTranscript = await messagesResponse.json();
    console.log('💾 Raw transcript fetched:', rawTranscript.results?.length || 0, 'messages');
    
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
    await saveFullTranscript(conversationId, fullTranscript, recordingUrl);
    console.log('💾 Full transcript and recording URL saved to database');

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