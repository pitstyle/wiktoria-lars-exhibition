import { NextRequest, NextResponse } from 'next/server';
import { getLarsPerspectivePrompt, LARS_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(`🔄 Stage Transition: Wiktoria → Lars (Perspective Provider)`);
  console.log(`Context:`, body);

  // Extract context from Wiktoria
  const { userName, age, occupation, topic, userInsights, wiktoriaOpinion } = body.requestContext || {};

  // Set up Lars's perspective provider stage
  const responseBody = {
    systemPrompt: getLarsPerspectivePrompt(),
    voice: LARS_VOICE,
    toolResultText: `[AGENT: LARS] (Lars joining for perspective) I'm ready to share my thoughts on ${topic} with you and Wiktoria.`,
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

  return response;
}