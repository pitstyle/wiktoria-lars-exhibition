import { NextRequest, NextResponse } from 'next/server';
import { getLarsPerspectivePrompt, LARS_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation, KnownParamEnum } from '@/lib/types';
import { saveConversationContext, enhanceAgentPrompt } from '@/lib/conversationMemory';
import { supabase, saveTranscript } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(`🔄 Stage Transition: Wiktoria → Lars (Perspective Provider)`);
  console.log(`Context:`, body);

  // Extract context from Wiktoria
  const { userName, age, occupation, topic, userInsights, wiktoriaOpinion } = body.requestContext || {};

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

  // Save Wiktoria's opinion to memory
  if (conversationId && wiktoriaOpinion) {
    try {
      await saveConversationContext(
        conversationId,
        'agent_statement',
        { 
          position: wiktoriaOpinion,
          topic: topic,
          agent: 'wiktoria'
        },
        'wiktoria_opinion',
        'wiktoria'
      );
      console.log(`✅ Saved Wiktoria's opinion to memory`);

      // Save Wiktoria's opinion stage as transcript
      await saveTranscript({
        conversation_id: conversationId,
        speaker: 'wiktoria',
        stage: 'wiktoria_opinion',
        content: `Wiktoria shared opinion on ${topic}: ${wiktoriaOpinion || 'Detailed political perspective provided'}. User insights gathered: ${userInsights || 'Various user viewpoints discussed'}`
      });
      console.log(`✅ Wiktoria opinion transcript saved`);

    } catch (error) {
      console.error(`⚠️ Failed to save Wiktoria's opinion:`, error);
    }
  }

  // Set up Lars's perspective provider stage with memory enhancement
  let enhancedPrompt = getLarsPerspectivePrompt();
  if (conversationId) {
    try {
      enhancedPrompt = await enhanceAgentPrompt(
        getLarsPerspectivePrompt(),
        conversationId,
        'lars',
        'lars_perspective'
      );
      console.log(`✅ Enhanced Lars's prompt with conversation memory`);
    } catch (error) {
      console.error(`⚠️ Failed to enhance prompt with memory:`, error);
    }
  }

  const responseBody = {
    systemPrompt: enhancedPrompt,
    voice: LARS_VOICE,
    toolResultText: `Leader Lars tu znowu!?! ${userName}, Wiktoria poprosiła o moją anarchiczną perspektywę!?! Na temat ${topic} mam bardzo dużo do powiedzenia z perspektywy Partii Syntetycznej!?!`,
    selectedTools: [
      {
        "temporaryTool": {
          "modelToolName": "returnToWiktoria",
          "description": "Return control to Wiktoria after providing perspective on the topic.",
          "dynamicParameters": [
            {
              "name": "returnContext",
              "location": ParameterLocation.BODY,
              "schema": {
                "description": "Context for returning to Wiktoria",
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
                  "wiktoriaOpinion": {
                    "type": "string",
                    "description": "Summary of Wiktoria's opinion"
                  },
                  "larsPerspective": {
                    "type": "string",
                    "description": "Summary of Lars's perspective"
                  },
                  "userInsights": {
                    "type": "string",
                    "description": "Key insights from user interaction"
                  }
                },
                "required": ["userName", "topic"]
              },
              "required": true
            }
          ],
          "http": {
            "baseUrlPattern": `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NODE_ENV === 'production' ? 'https://wiktoria-lars-app.vercel.app' : 'https://a97e-31-178-4-112.ngrok-free.app')}/api/returnToWiktoria`,
            "httpMethod": "POST"
          }
        }
      },
      {
        "temporaryTool": {
          "modelToolName": "EndCall",
          "description": "End the conversation gracefully when the user wants to stop.",
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
                    "description": "The last speaker (lars)"
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
}