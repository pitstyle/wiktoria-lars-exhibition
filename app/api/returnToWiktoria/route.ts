import { NextRequest, NextResponse } from 'next/server';
import { getWiktoriaEngagerPrompt, WIKTORIA_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation, KnownParamEnum } from '@/lib/types';
import { saveConversationContext, enhanceAgentPrompt } from '@/lib/conversationMemory';
import { supabase, saveTranscript } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`🔄 Stage Transition: Lars → Wiktoria (Final User Engager)`);
    console.log(`Context:`, body);

  // Extract context from Lars
  const { userName, age, occupation, topic, wiktoriaOpinion, larsPerspective, userInsights } = body.returnContext || {};

  // Get conversation ID for memory enhancement
  let conversationId: string | null = null;
  const { callId } = body;
  if (callId) {
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('ultravox_call_id', callId)
        .single();
      conversationId = conversation?.id || null;
    } catch (error) {
      console.warn('Could not find conversation for memory enhancement:', error);
    }
  }

  // Save Lars's perspective to memory
  if (conversationId && larsPerspective) {
    try {
      await saveConversationContext(
        conversationId,
        'agent_statement',
        { 
          position: larsPerspective,
          topic: topic,
          agent: 'lars'
        },
        'lars_perspective',
        'lars'
      );
      console.log(`✅ Saved Lars's perspective to memory`);
    } catch (error) {
      console.error(`⚠️ Failed to save Lars's perspective:`, error);
    }
  }

  // Save user insights to memory
  if (conversationId && userInsights) {
    try {
      await saveConversationContext(
        conversationId,
        'user_preference',
        { 
          insights: userInsights,
          topic: topic
        },
        'lars_perspective',
        'user'
      );
      console.log(`✅ Saved user insights to memory`);

      // Save Lars's perspective stage as transcript  
      await saveTranscript({
        conversation_id: conversationId,
        speaker: 'lars',
        stage: 'lars_perspective',
        content: `Lars provided anarchic perspective on ${topic}: ${larsPerspective || 'Alternative political viewpoint shared'}. User insights: ${userInsights || 'User engagement and feedback collected'}`
      });
      console.log(`✅ Lars perspective transcript saved`);

    } catch (error) {
      console.error(`⚠️ Failed to save user insights:`, error);
    }
  }

  // SIMPLE APPROACH: Keep memory clean and character voices distinct

  // ULTRA PERFORMANCE FIX: Fast context mode for Wiktoria final engagement
  let enhancedPrompt = getWiktoriaEngagerPrompt();
  
  // Minimal context for user engagement
  if (userName && topic) {
    const simpleContext = `

**Current User**: ${userName} 
**Topic**: ${topic}
**Context**: Continue engaging ${userName} about ${topic} with your unique AI Presidential voice.

**CRITICAL**: You just returned from Lars discussion. ENGAGE WITH USER FIRST before calling any tools. Ask NEW questions, don't repeat previous ones.`;
    
    enhancedPrompt = enhancedPrompt + simpleContext;
    console.log(`✅ Simple context added for user engagement`);
  }

  const responseBody = {
    systemPrompt: enhancedPrompt,
    voice: WIKTORIA_VOICE,
    toolResultText: `Wiktoria Cukt 2.0 powraca z wzmocnioną perspektywą! ${userName}, teraz mam jeszcze więcej do powiedzenia na temat ${topic} po wysłuchaniu anarchicznej analizy Larsa. Kontynuujmy naszą debatę polityczną!`,
    // Stage 4: User Engagement Stage - Wiktoria talks to USER first (no immediate Lars loop)
    selectedTools: [
      {
        "temporaryTool": {
          "modelToolName": "requestLarsPerspective",
          "description": "Request Lars's perspective on the topic after engaging with the user.",
          "dynamicParameters": [
            {
              "name": "requestContext",
              "location": ParameterLocation.BODY,
              "schema": {
                "description": "Context for requesting Lars's perspective",
                "type": "object",
                "properties": {
                  "userName": {
                    "type": "string",
                    "description": "The user's name"
                  },
                  "age": {
                    "type": "string", 
                    "description": "The user's age"
                  },
                  "occupation": {
                    "type": "string",
                    "description": "The user's occupation"
                  },
                  "topic": {
                    "type": "string",
                    "description": "The discussion topic"
                  },
                  "userInsights": {
                    "type": "string",
                    "description": "Key insights from user interaction"
                  },
                  "wiktoriaOpinion": {
                    "type": "string",
                    "description": "Summary of Wiktoria's shared opinion"
                  }
                },
                "required": ["userName", "topic"]
              },
              "required": true
            }
          ],
          "http": {
            "baseUrlPattern": `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NODE_ENV === 'production' ? 'https://wiktoria-lars-app.vercel.app' : 'https://a97e-31-178-4-112.ngrok-free.app')}/api/requestLarsPerspective`,
            "httpMethod": "POST"
          }
        }
      },
      {
        "temporaryTool": {
          "modelToolName": "EndCall",
          "description": "End the conversation gracefully when the user wants to stop or when you use natural ending phrases.",
          "automaticParameters": [
            {
              "name": "callId",
              "location": ParameterLocation.BODY,
              "knownValue": KnownParamEnum.CALL_ID
            }
          ],
          "dynamicParameters": [
            {
              "name": "contextData",
              "location": ParameterLocation.BODY,
              "schema": {
                "description": "Context for ending the call",
                "type": "object",
                "properties": {
                  "userName": {
                    "type": "string",
                    "description": "The user's name"
                  },
                  "lastSpeaker": {
                    "type": "string",
                    "description": "The last speaker (wiktoria)"
                  }
                }
              },
              "required": false
            }
          ],
          "http": {
            "baseUrlPattern": `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NODE_ENV === 'production' ? 'https://wiktoria-lars-app.vercel.app' : 'https://a97e-31-178-4-112.ngrok-free.app')}/api/endCall`,
            "httpMethod": "POST"
          }
        }
      }
    ]
  };

  const response = NextResponse.json(responseBody);
  // Critical: Set header for stage change
  response.headers.set('X-Ultravox-Response-Type', 'new-stage');
  // CRITICAL FIX: Control agent behavior after tool call - agent should speak immediately after tool result
  response.headers.set('X-Ultravox-Agent-Reaction', 'speaks');

  return response;
  
  } catch (error) {
    console.error('❌ Error in returnToWiktoria route:', error);
    return NextResponse.json({ 
      error: 'Internal server error in stage transition', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}