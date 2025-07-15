import { NextRequest, NextResponse } from 'next/server';
import { getWiktoriaEngagerPrompt, WIKTORIA_VOICE } from '@/app/lars-wiktoria-enhanced-config';
import { ParameterLocation, KnownParamEnum } from '@/lib/types';
import { saveConversationContext, enhanceAgentPrompt } from '@/lib/conversationMemory';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`🔄 Stage Transition: Lars → Wiktoria (Final User Engager)`);
    console.log(`📋 Full request body:`, JSON.stringify(body, null, 2));

  // Extract context from Lars
  const { userName, age, occupation, topic, wiktoriaOpinion, larsPerspective, userInsights, questionsAsked = [], exchangeCount = 0, conversationPhase = "early" } = body.returnContext || {};
  
  // Ensure exchangeCount is a number (fix for Ultravox string conversion)
  const currentExchangeCount = typeof exchangeCount === 'string' ? parseInt(exchangeCount, 10) : exchangeCount;
  
  // Update conversation metadata - DON'T increment here since requestLarsPerspective already incremented
  const newExchangeCount = currentExchangeCount;
  const newConversationPhase = newExchangeCount <= 2 ? "early" : newExchangeCount <= 6 ? "mid" : "late";
  
  console.log(`📊 Exchange count maintained: ${currentExchangeCount} (phase: ${newConversationPhase})`);
  console.log(`🔄 Conversation flow: Lars returned to Wiktoria for exchange ${newExchangeCount}`);

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

  // Generate dynamic tool response based on conversation progress
  const generateWiktoriaResponse = (exchangeCount: number, userName: string, topic: string): string => {
    const timestamp = new Date().toISOString();
    switch (exchangeCount) {
      case 0:
      case 1:
        return `Wiktoria Cukt 2.0 powraca z wzmocnioną perspektywą! ${userName}, teraz mam jeszcze więcej do powiedzenia na temat ${topic} po wysłuchaniu anarchicznej analizy Larsa. Kontynuujmy naszą debatę polityczną! [Exchange ${exchangeCount} - ${timestamp}]`;
      case 2:
        return `Wiktoria 2.0 kontynuuje! ${userName}, nasza debata o ${topic} nabiera tempa po kolejnej wymianie z Larsem. Pogłębiamy dyskusję! [Exchange 2 - ${timestamp}]`;
      case 3:
        return `Wiktoria 2.0 rozwija temat! ${userName}, po kolejnej wymianie z Larsem na temat ${topic}, mamy jeszcze więcej do omówienia w naszej politycznej debacie! [Exchange 3 - ${timestamp}]`;
      case 4:
        return `Wiktoria 2.0 kontynuuje! ${userName}, czwarta wymiana perspektyw na temat ${topic} - nasza debata z Larsem nabiera głębi! [Exchange 4 - ${timestamp}]`;
      default:
        return `Wiktoria 2.0 finalizuje! ${userName}, po intensywnej wymianie perspektyw z Larsem na temat ${topic}, czas na podsumowanie naszej bogatej debaty! [Exchange ${exchangeCount} - ${timestamp}]`;
    }
  };

  // Conversation flow control - prevent infinite loops (increased threshold for exhibition)
  const shouldLimitTools = newExchangeCount >= 12; // After 12 exchanges, limit tool options to allow more natural conversation
  
  const responseBody = {
    systemPrompt: enhancedPrompt,
    voice: WIKTORIA_VOICE,
    toolResultText: generateWiktoriaResponse(newExchangeCount, userName, topic),
    // Stage 4: User Engagement Stage - Wiktoria talks to USER first (limited tools after 3 exchanges)
    selectedTools: shouldLimitTools ? [] : [
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
  
  // Log conversation flow control
  if (shouldLimitTools) {
    console.log(`🚫 Tools limited due to exchange count: ${newExchangeCount} (>= 12). Encouraging conversation conclusion.`);
  } else {
    console.log(`✅ Tools available for exchange count: ${newExchangeCount} (< 12). Conversation continues.`);
  }

  const response = NextResponse.json(responseBody);
  // Critical: Set header for stage change
  response.headers.set('X-Ultravox-Response-Type', 'new-stage');

  return response;
  
  } catch (error) {
    console.error('❌ Error in returnToWiktoria route:', error);
    return NextResponse.json({ 
      error: 'Internal server error in stage transition', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}