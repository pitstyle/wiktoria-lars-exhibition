import { NextRequest, NextResponse } from 'next/server';
import { getWiktoriaEngagerPrompt, WIKTORIA_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(`🔄 Stage Transition: Lars → Wiktoria (Final User Engager)`);
  console.log(`Context:`, body);

  // Extract context from Lars
  const { userName, topic, wiktoriaOpinion, larsPerspective, userInsights } = body.returnContext || {};

  // Set up Wiktoria's final user engagement stage with looping capability
  const responseBody = {
    systemPrompt: getWiktoriaEngagerPrompt(),
    voice: WIKTORIA_VOICE,
    toolResultText: `(Wiktoria returning with enhanced context) I'm ready to continue our discussion about ${topic} with insights from both Lars and myself.`,
    // Include tool for requesting Lars perspective again to create conversation loop
    selectedTools: [
      {
        "temporaryTool": {
          "modelToolName": "requestLarsPerspective",
          "description": "Request Lars's perspective on the topic after engaging with the user for 2-3 exchanges.",
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
                  "topic": {
                    "type": "string",
                    "description": "The discussion topic"
                  },
                  "userInsights": {
                    "type": "string",
                    "description": "Key insights from recent user interaction"
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
            "baseUrlPattern": `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://a97e-31-178-4-112.ngrok-free.app'}/api/requestLarsPerspective`,
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