import { NextRequest, NextResponse } from 'next/server';
import { getLarsTheatricalPerspectivePrompt, LARS_VOICE } from '@/app/lars-wiktoria-theatrical-config';
import { ParameterLocation } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(`🔄 Stage Transition: Wiktoria → Lars (Perspective Provider)`);
  console.log(`Context:`, body);

  // Extract context from Wiktoria
  const { userName, topic, userInsights, wiktoriaOpinion } = body.requestContext || {};

  // Set up Lars's perspective provider stage
  const responseBody = {
    systemPrompt: getLarsTheatricalPerspectivePrompt(),
    voice: LARS_VOICE,
    toolResultText: `(Lars joining for perspective) I'm ready to share my thoughts on ${topic}.`,
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
            "baseUrlPattern": `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://1457-31-178-4-112.ngrok-free.app'}/api/returnToWiktoria`,
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