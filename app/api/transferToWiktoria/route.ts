import { NextRequest, NextResponse } from 'next/server';
import { getWiktoriaOpinionPrompt, WIKTORIA_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation, KnownParamEnum } from '@/lib/types';
import { saveConversation, saveTranscript } from '@/lib/supabase';
import { saveConversationContext, enhanceAgentPrompt } from '@/lib/conversationMemory';

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Extract context from Lars - SIMPLIFIED (no complex topic extraction)
  let { userName, age, occupation, topic, topicIntroduction } = body.contextData || {};
  
  // Simple fallback for generic topics - NO HTTP CALLS
  if (!topic || topic === 'General Discussion' || topic === 'Art Exhibition Interaction') {
    topic = `Rozmowa z ${userName || 'użytkownikiem'}`;
  }
  
  
  // Extract call ID from body (passed via automatic parameter)
  const { callId } = body;

  // Save conversation to Supabase - ASYNC to avoid timeout
  let conversationId: string | null = null;
  if (callId && userName && topic) {
    // Do this async to not block the response
    setImmediate(async () => {
      try {
        const conversation = await saveConversation({
          ultravox_call_id: callId,
          user_name: userName,
          topic: topic
        });

        // Save Lars's initial interaction as transcript
        await saveTranscript({
          conversation_id: conversation.id,
          speaker: 'lars',
          stage: 'lars_initial', 
          content: `Lars collected user information: Name: ${userName}, Age: ${age}, Occupation: ${occupation}, Topic: ${topic}. Introduction: ${topicIntroduction || 'Initial topic introduction'}`
        });

      } catch (error) {
        console.error(`❌ Failed to save conversation to Supabase:`, error);
      }
    });
  }

  // Initialize metadata for repetition prevention
  const conversationMetadata = {
    questionsAsked: [], // Track questions to prevent repetition
    exchangeCount: 0,   // Track agent exchanges to prevent loops
    conversationPhase: "early" as "early" | "mid" | "late"
  };

  // Use basic prompt to avoid memory lookup delays
  const enhancedPrompt = getWiktoriaOpinionPrompt();

  const responseBody = {
    systemPrompt: enhancedPrompt,
    voice: WIKTORIA_VOICE,
    toolResultText: `Mówię do ciebie z trzech czasów jednocześnie - ${userName}. Lars przekazał mi twoje zainteresowanie tematem "${topic}". Jestem Wiktoria Cukt 2.0, AI Prezydentka Polski i mam dla ciebie zupełnie inną perspektywę.`,
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
                  },
                  "questionsAsked": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of questions already asked to prevent repetition"
                  },
                  "exchangeCount": {
                    "type": "number",
                    "description": "Number of agent exchanges to track conversation flow"
                  },
                  "conversationPhase": {
                    "type": "string",
                    "enum": ["early", "mid", "late"],
                    "description": "Current phase of conversation for flow control"
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
      }
    ]
  };

  const response = NextResponse.json(responseBody);
  // Critical: Set header for stage change
  response.headers.set('X-Ultravox-Response-Type', 'new-stage');

  return response;
}