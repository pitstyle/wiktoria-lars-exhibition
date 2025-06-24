// File: app/api/changeStage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stageMap } from "@/app/lars-wiktoria-enhanced-config";

interface IncomingBody {
  contextData: Record<string, any>;
  nextStage: "collect" | "reflect" | "dialogue";
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 changeStage route called');
    
    const { contextData, nextStage } = (await req.json()) as IncomingBody;
    
    console.log(`🔄 Stage Transition: → ${nextStage}`);
    console.log(`Context Data:`, JSON.stringify(contextData, null, 2));

    // Check if stageMap is accessible
    console.log('📋 Available stages:', Object.keys(stageMap));

    // Validate stage exists
    const stageDef = (stageMap as any)[nextStage];
    if (!stageDef) {
      console.error(`❌ Unknown stage: ${nextStage}`);
      return NextResponse.json(
        { error: `Unknown stage "${nextStage}". Available: ${Object.keys(stageMap).join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`✅ Stage definition found for: ${nextStage}`);

    // Flip speaker on each dialogue turn
    let speaker: "lars" | "wiktoria" = "lars";
    if (nextStage === "dialogue") {
      const last = contextData.lastSpeaker as string;
      speaker = last === "lars" ? "wiktoria" : "lars";
      contextData.lastSpeaker = speaker;
      console.log(`🎭 Dialogue speaker switching: ${last} → ${speaker}`);
    }

    console.log(`🎤 Getting prompt and voice for stage: ${nextStage}`);

    // Get stage configuration with detailed error handling
    let prompt: string;
    let voice: string;
    
    try {
      if (nextStage === "dialogue") {
        console.log(`🎭 Getting dialogue config for speaker: ${speaker}`);
        prompt = stageDef.promptFn(speaker);
        voice = stageDef.voiceFn(speaker);
      } else {
        console.log(`🎯 Getting standard config for stage: ${nextStage}`);
        prompt = stageDef.promptFn();
        voice = stageDef.voiceFn();
      }
      console.log(`✅ Prompt and voice generated successfully`);
    } catch (configError) {
      console.error(`❌ Error getting stage configuration:`, configError);
      throw new Error(`Failed to get stage configuration: ${configError}`);
    }

    console.log(`✅ Stage transition successful: ${nextStage}`);
    console.log(`Voice ID: ${voice}`);
    console.log(`Tools count: ${stageDef.selectedTools?.length || 0}`);

    const response = NextResponse.json({
      systemPrompt:    prompt,
      voice,
      selectedTools:   stageDef.selectedTools || [],
      initialMessages: [ { role: "SYSTEM", text: JSON.stringify(contextData) } ]
    });

    response.headers.set("X-Ultravox-Response-Type", "new-stage");
    return response;
    
  } catch (error) {
    console.error('❌ Error in changeStage route:', error);
    console.error('❌ Error stack:', (error as Error).stack);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}