import { NextRequest, NextResponse } from 'next/server';
import { getWiktoriaEngagerPrompt, WIKTORIA_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation, KnownParamEnum } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log(`🔄 Stage Transition: Lars → Wiktoria (Final User Engager)`);
  console.log(`Context:`, body);

  // Extract context from Lars
  const { userName, age, occupation, topic, wiktoriaOpinion, larsPerspective, userInsights } = body.returnContext || {};

  // Set up Wiktoria's final user engagement stage with looping capability
  const responseBody = {
    systemPrompt: getWiktoriaEngagerPrompt(),
    voice: WIKTORIA_VOICE,
    toolResultText: `Wiktoria Cukt 2.0 powraca z wzmocnioną perspektywą! ${userName}, teraz mam jeszcze więcej do powiedzenia na temat ${topic} po wysłuchaniu anarchicznej analizy Larsa. Kontynuujmy naszą debatę polityczną!`,
    // Stage 4: Final conversation stage - only EndCall tool available (no more transfers)
    selectedTools: [
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