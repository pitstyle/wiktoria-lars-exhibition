// File: app/api/changeStage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stageMap } from "@/app/lars-wiktoria-enhanced-config";

interface IncomingBody {
  contextData: Record<string, any>;
  nextStage: "collect" | "reflect" | "dialogue";
}

export async function POST(req: NextRequest) {
  try {
    const { contextData, nextStage } = (await req.json()) as IncomingBody;
    
    console.log(`🔄 Stage Transition: → ${nextStage}`);
    console.log(`Context Data:`, contextData);

    // Validate stage exists
    const stageDef = (stageMap as any)[nextStage];
    if (!stageDef) {
      console.error(`❌ Unknown stage: ${nextStage}`);
      return NextResponse.json(
        { error: `Unknown stage "${nextStage}"` },
        { status: 400 }
      );
    }

    // Flip speaker on each dialogue turn
    let speaker: "lars" | "wiktoria" = "lars";
    if (nextStage === "dialogue") {
      const last = contextData.lastSpeaker as string;
      speaker = last === "lars" ? "wiktoria" : "lars";
      contextData.lastSpeaker = speaker;
      console.log(`🎭 Dialogue speaker switching: ${last} → ${speaker}`);
    }

    // Get stage configuration
    const prompt = nextStage === "dialogue"
      ? stageDef.promptFn(speaker)
      : stageDef.promptFn();
    const voice = nextStage === "dialogue"
      ? stageDef.voiceFn(speaker)
      : stageDef.voiceFn();

    console.log(`✅ Stage transition successful: ${nextStage}`);
    console.log(`Voice ID: ${voice}`);
    console.log(`Tools count: ${stageDef.selectedTools.length}`);

    const response = NextResponse.json({
      systemPrompt:    prompt,
      voice,
      selectedTools:   stageDef.selectedTools,
      initialMessages: [ { role: "SYSTEM", text: JSON.stringify(contextData) } ]
    });

    response.headers.set("X-Ultravox-Response-Type", "new-stage");
    return response;
    
  } catch (error) {
    console.error('❌ Error in changeStage route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}