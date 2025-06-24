import { NextRequest, NextResponse } from 'next/server';
import { getWiktoriaOpinionPrompt, WIKTORIA_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(`🔄 Stage Transition: Lars → Wiktoria (Opinion Leader)`);
  console.log(`Context:`, body);

  // Extract context from Lars
  const { userName, age, occupation, topic, topicIntroduction } = body.contextData || {};

  // Set up Wiktoria's opinion leader stage
  const responseBody = {
    systemPrompt: getWiktoriaOpinionPrompt(),
    voice: WIKTORIA_VOICE,
    toolResultText: `(Wiktoria joining conversation) Hello ${userName}! I'm ready to discuss ${topic} with you and Lars.`,
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
      }
    ]
  };

  const response = NextResponse.json(responseBody);
  // Critical: Set header for stage change
  response.headers.set('X-Ultravox-Response-Type', 'new-stage');

  return response;
}