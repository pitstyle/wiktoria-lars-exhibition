import { NextRequest, NextResponse } from 'next/server';
import { getLarsPerspectivePrompt, LARS_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation, KnownParamEnum } from '@/lib/types';
import { saveConversationContext, enhanceAgentPrompt } from '@/lib/conversationMemory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`🔄 Stage Transition: Wiktoria → Lars (Perspective Provider)`);
    console.log(`📋 Full request body:`, JSON.stringify(body, null, 2));

  // Extract context from Wiktoria
  const { userName, age, occupation, topic, userInsights, wiktoriaOpinion, questionsAsked = [], exchangeCount = 0, conversationPhase = "early" } = body.requestContext || {};
  
  // Ensure exchangeCount is a number (fix for Ultravox string conversion)
  const currentExchangeCount = typeof exchangeCount === 'string' ? parseInt(exchangeCount, 10) : exchangeCount;
  
  // Update exchange count and conversation phase
  const newExchangeCount = currentExchangeCount + 1;
  const newConversationPhase = newExchangeCount <= 1 ? "early" : newExchangeCount <= 2 ? "mid" : "late";

  // Use basic prompt to avoid memory lookup delays
  const enhancedPrompt = getLarsPerspectivePrompt();

  // Generate dynamic tool response based on conversation progress
  const generateLarsResponse = (exchangeCount: number, userName: string, topic: string): string => {
    const timestamp = new Date().toISOString();
    switch (exchangeCount) {
      case 1:
        return `Leader Lars tu znowu!?! ${userName}, Wiktoria poprosiła o moją anarchiczną perspektywę!?! Na temat ${topic} mam bardzo dużo do powiedzenia z perspektywy Partii Syntetycznej!?! [Exchange 1 - ${timestamp}]`;
      case 2:
        return `Lars kontynuuje dyskusję! ${userName}, powracam z dalszą anarchiczną analizą tematu ${topic}! Nasza debata się pogłębia!?! [Exchange 2 - ${timestamp}]`;
      case 3:
        return `Lars pogłębia analizę! ${userName}, dalsze anarchiczne rozważania na temat ${topic} - Partia Syntetyczna ma więcej do powiedzenia!?! [Exchange 3 - ${timestamp}]`;
      case 4:
        return `Lars kontynuuje! ${userName}, czwarty raz na temat ${topic} - nasza syntetyczna analiza nabiera głębi!?! [Exchange 4 - ${timestamp}]`;
      default:
        return `Lars finalnie! ${userName}, podsumowuję nasze długie rozważania o ${topic} - ostateczna perspektywa Partii Syntetycznej!?! [Exchange ${exchangeCount} - ${timestamp}]`;
    }
  };

  const responseBody = {
    systemPrompt: enhancedPrompt,
    voice: LARS_VOICE,
    toolResultText: generateLarsResponse(newExchangeCount, userName, topic),
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
            "baseUrlPattern": `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NODE_ENV === 'production' ? 'https://wiktoria-lars-app.vercel.app' : 'https://a97e-31-178-4-112.ngrok-free.app')}/api/returnToWiktoria`,
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
  } catch (error) {
    console.error('❌ Error in requestLarsPerspective route:', error);
    return NextResponse.json({ 
      error: 'Internal server error in Lars perspective', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}