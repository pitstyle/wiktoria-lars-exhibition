import { NextRequest, NextResponse } from "next/server";
import { stageMap, StageKey } from "@/app/lib/stageMap";

export async function POST(req: NextRequest) {
  try {
    const { contextData, nextStage } = await req.json();
    
    console.log(`🔄 Stage Transition: → ${nextStage}`);
    console.log(`Context Data:`, contextData);
    
    // Validate stage exists
    if (!stageMap[nextStage as StageKey]) {
      console.error(`❌ Unknown stage: ${nextStage}`);
      return NextResponse.json({ error: `Unknown stage: ${nextStage}` }, { status: 400 });
    }
    
    const stage = stageMap[nextStage as StageKey];
    
    // Build response body
    const responseBody = {
      systemPrompt: stage.prompt,
      voice: stage.voice,
      selectedTools: stage.selectedTools,
      toolResultText: getStageTransitionMessage(nextStage, contextData)
    };
    
    console.log(`✅ Stage transition successful: ${nextStage}`);
    console.log(`Voice ID: ${stage.voice}`);
    console.log(`Tools count: ${stage.selectedTools.length}`);
    
    const response = NextResponse.json(responseBody);
    response.headers.set("X-Ultravox-Response-Type", "new-stage");
    
    return response;
    
  } catch (error) {
    console.error('❌ Error in changeStage route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getStageTransitionMessage(stage: string, context: any): string {
  const { userName, topic } = context;
  
  switch (stage) {
    case "wiktoriaDebate":
      return `(Wiktoria joining conversation) System activated. Hello ${userName}! I'm Wiktoria Cukt, AI President of Poland. Ready to analyze ${topic} with systematic technical precision.`;
      
    case "larsPerspective":
      return `(Lars injecting chaos variables) Wiktoria's systematic request received!?! Time for democratic void synthesis on ${topic}...`;
      
    case "wiktoriaEngage":
      return `(Wiktoria returning with enhanced context) System update complete. I'm ready to continue our discussion about ${topic} with insights from both systematic technical culture and Lars's anarchic democratic chaos.`;
      
    default:
      return `(Stage transition to ${stage})`;
  }
}

