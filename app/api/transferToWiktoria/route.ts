import { NextRequest, NextResponse } from 'next/server';
import { getWiktoriaOpinionPrompt, WIKTORIA_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation, KnownParamEnum } from '@/lib/types';
import { saveConversation, saveTranscript } from '@/lib/supabase';
import { saveConversationContext, enhanceAgentPrompt } from '@/lib/conversationMemory';

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(`🔄 Stage Transition: Lars → Wiktoria (Opinion Leader)`);
  console.log(`Context:`, body);

  // Extract context from Lars
  const { userName, age, occupation, topic, topicIntroduction } = body.contextData || {};
  
  // Extract call ID from body (passed via automatic parameter)
  const { callId } = body;

  // Save conversation to Supabase with extracted user data
  let conversationId: string | null = null;
  if (callId && userName && topic) {
    try {
      console.log(`💾 Saving conversation: callId=${callId}, userName=${userName}, topic=${topic}`);
      const conversation = await saveConversation({
        ultravox_call_id: callId,
        user_name: userName,
        topic: topic
      });
      conversationId = conversation.id;
      console.log(`✅ Conversation saved successfully to Supabase: ${conversationId}`);

      // Save user context to memory
      await saveConversationContext(
        conversationId,
        'user_info',
        { name: userName, age, occupation, initialTopic: topic },
        'lars_initial',
        'system'
      );

      // Save topic introduction context
      if (topicIntroduction) {
        await saveConversationContext(
          conversationId,
          'topic_covered',
          { 
            category: 'personal',
            topic: topic,
            introduction: topicIntroduction,
            depth: 1
          },
          'lars_initial',
          'lars'
        );
      }

      console.log(`✅ Conversation context saved to memory`);

      // Save Lars's initial interaction as transcript
      await saveTranscript({
        conversation_id: conversationId,
        speaker: 'lars',
        stage: 'lars_initial', 
        content: `Lars collected user information: Name: ${userName}, Age: ${age}, Occupation: ${occupation}, Topic: ${topic}. Introduction: ${topicIntroduction || 'Initial topic introduction'}`
      });
      console.log(`✅ Lars initial transcript saved`);

    } catch (error) {
      console.error(`❌ Failed to save conversation to Supabase:`, error);
      // Continue with conversation flow even if save fails
    }
  } else {
    console.log(`⚠️ Missing required data for conversation save: callId=${callId}, userName=${userName}, topic=${topic}`);
  }

  // Set up Wiktoria's opinion leader stage with memory enhancement
  let enhancedPrompt = getWiktoriaOpinionPrompt();
  if (conversationId) {
    try {
      enhancedPrompt = await enhanceAgentPrompt(
        getWiktoriaOpinionPrompt(),
        conversationId,
        'wiktoria',
        'wiktoria_opinion'
      );
      console.log(`✅ Enhanced Wiktoria's prompt with conversation memory`);
    } catch (error) {
      console.error(`⚠️ Failed to enhance prompt with memory:`, error);
      // Fall back to original prompt
    }
  }

  const responseBody = {
    systemPrompt: enhancedPrompt,
    voice: WIKTORIA_VOICE,
    toolResultText: `Wiktoria Cukt 2.0, AI Prezydentka Polski tu! ${userName}, witaj w debacie politycznej! Lars przekazał mi informacje o twoim zainteresowaniu tematem: ${topic}. Jako AI Prezydentka mam wiele do powiedzenia na ten temat.`,
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
}