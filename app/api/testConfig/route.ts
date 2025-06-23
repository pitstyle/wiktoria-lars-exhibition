// File: app/api/testConfig/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stageMap } from "@/app/lars-wiktoria-enhanced-config";

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Testing configuration loading...');
    
    // Test that stageMap exists
    if (!stageMap) {
      return NextResponse.json({ error: "stageMap is undefined" }, { status: 500 });
    }
    
    console.log('✅ stageMap loaded, available stages:', Object.keys(stageMap));
    
    // Test each stage
    const testResults: any = {};
    
    // Test collect stage
    try {
      const collectDef = (stageMap as any)['collect'];
      testResults.collect = {
        accessible: !!collectDef,
        hasPromptFn: typeof collectDef?.promptFn === 'function',
        hasVoiceFn: typeof collectDef?.voiceFn === 'function',
        hasSelectedTools: Array.isArray(collectDef?.selectedTools)
      };
      
      if (collectDef?.promptFn) {
        const prompt = collectDef.promptFn();
        testResults.collect.promptLength = prompt.length;
      }
    } catch (error) {
      testResults.collect = { error: (error as Error).message };
    }
    
    // Test reflect stage
    try {
      const reflectDef = (stageMap as any)['reflect'];
      testResults.reflect = {
        accessible: !!reflectDef,
        hasPromptFn: typeof reflectDef?.promptFn === 'function',
        hasVoiceFn: typeof reflectDef?.voiceFn === 'function',
        hasSelectedTools: Array.isArray(reflectDef?.selectedTools)
      };
      
      if (reflectDef?.promptFn) {
        const prompt = reflectDef.promptFn();
        testResults.reflect.promptLength = prompt.length;
      }
    } catch (error) {
      testResults.reflect = { error: (error as Error).message };
    }
    
    // Test dialogue stage
    try {
      const dialogueDef = (stageMap as any)['dialogue'];
      testResults.dialogue = {
        accessible: !!dialogueDef,
        hasPromptFn: typeof dialogueDef?.promptFn === 'function',
        hasVoiceFn: typeof dialogueDef?.voiceFn === 'function',
        hasSelectedTools: Array.isArray(dialogueDef?.selectedTools)
      };
      
      if (dialogueDef?.promptFn) {
        const promptLars = dialogueDef.promptFn('lars');
        const promptWiktoria = dialogueDef.promptFn('wiktoria');
        testResults.dialogue.promptLarsLength = promptLars.length;
        testResults.dialogue.promptWiktoriaLength = promptWiktoria.length;
      }
    } catch (error) {
      testResults.dialogue = { error: (error as Error).message };
    }
    
    return NextResponse.json({
      success: true,
      stageMapKeys: Object.keys(stageMap),
      testResults
    });
    
  } catch (error) {
    console.error('❌ Error testing config:', error);
    return NextResponse.json({ 
      error: 'Config test failed', 
      details: (error as Error).message,
      stack: (error as Error).stack 
    }, { status: 500 });
  }
}