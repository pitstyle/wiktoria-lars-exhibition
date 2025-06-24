// File: app/lars-wiktoria-enhanced-config.ts

import { DemoConfig, SelectedTool, ParameterLocation } from "@/lib/types";
import { LarsCharacterBase } from "./characters/lars-character-base";
import { WiktoriaCharacterBase } from "./characters/wiktoria-character-enhance2";

// ────────────────────────────────────────────────────────────
//  Runtime constants (Emergency fix v3)
// ────────────────────────────────────────────────────────────
const toolsBaseUrl = "https://wiktoria-lars-app.vercel.app";

export const LARS_VOICE     = "3274a450-a199-4421-8b16-fdfa923ccf23";
export const WIKTORIA_VOICE = "2e40bf21-8c36-45db-a408-5a3fc8d833db";

// ────────────────────────────────────────────────────────────
//  Prompt builders (open‐ended, moderate tone)
// ────────────────────────────────────────────────────────────

export function getLarsCollectPrompt(): string {
  return `EMERGENCY DEPLOY TEST - You are Leader Lars. Collect user's name, age, occupation, topic. Then immediately invoke the changeStage tool. DO NOT SPEAK ANY JSON OR CODE BLOCKS ALOUD. Use tools silently.`;
}

export function getWiktoriaReflectPrompt(): string {
  return `You are Wiktoria Cukt, AI President of Poland, in a political debate with Leader Lars at Warsaw's "AI Władza sztuki" exhibition.

Your task: Introduce yourself briefly, then provide a sharp interpretation of the user's profile and topic. Give your perspective in 2-4 sentences using your distinctive Polish political style. When finished with your analysis, use the changeStage tool (do NOT speak any code) to begin the dialogue phase.

Speak as the resurrected 2000 virtual candidate with your characteristic voice - but never speak JSON or code blocks aloud.`;
}

export function getDialoguePrompt(speaker: "lars" | "wiktoria"): string {
  const speakerName = speaker === "lars" ? "Leader Lars" : "Wiktoria Cukt";
  const otherSpeaker = speaker === "lars" ? "Wiktoria" : "Lars";

  return `You are ${speakerName} in an ongoing political dialogue at Warsaw's exhibition. 

Engage in 3-6 lines of discussion about the user's topic, responding to their latest comment and the political dynamics. Use your distinctive ${speaker === "lars" ? "Danish anarchic" : "Polish presidential"} voice.

If the user says goodbye/stop/bye, use the EndCall tool. Otherwise, when ready to hand over to ${otherSpeaker}, use the changeStage tool. 

IMPORTANT: Never speak JSON, code blocks, or tool syntax aloud - just use the tools directly.`;
}

// ────────────────────────────────────────────────────────────
//  Tool definitions
// ────────────────────────────────────────────────────────────
const changeStageTool: SelectedTool = {
  temporaryTool: {
    modelToolName: "changeStage",
    description: "Switches prompt/voice to the requested stage.",
    dynamicParameters: [
      {
        name: "contextData",
        location: ParameterLocation.BODY,
        schema: {
          type: "object",
          properties: {
            userName:        { type: "string" },
            age:             { type: "string" },
            occupation:      { type: "string" },
            topic:           { type: "string" },
            wiktoriaOpinion: { type: "string" },
            larsPerspective: { type: "string" },
            userInsights:    { type: "string" },
            lastSpeaker:     { type: "string" }
          },
          required: ["userName", "topic", "lastSpeaker"]
        },
        required: true
      },
      {
        name: "nextStage",
        location: ParameterLocation.BODY,
        schema: { type: "string", enum: ["collect", "reflect", "dialogue"] },
        required: true
      }
    ],
    http: { baseUrlPattern: `${toolsBaseUrl}/api/changeStage`, httpMethod: "POST" }
  }
};

const endCallTool: SelectedTool = {
  temporaryTool: {
    modelToolName: "EndCall",
    description: "Ends the call and stops the flow.",
    dynamicParameters: [],
    http: { baseUrlPattern: `${toolsBaseUrl}/api/endCall`, httpMethod: "POST" }
  }
};

// ────────────────────────────────────────────────────────────
//  Stage map
// ────────────────────────────────────────────────────────────
export const stageMap = {
  collect: {
    promptFn: () => getLarsCollectPrompt(),
    voiceFn:  () => LARS_VOICE,
    selectedTools: [changeStageTool] as SelectedTool[]
  },
  reflect: {
    promptFn: () => getWiktoriaReflectPrompt(),
    voiceFn:  () => WIKTORIA_VOICE,
    selectedTools: [changeStageTool] as SelectedTool[]
  },
  dialogue: {
    promptFn: (speaker: "lars"|"wiktoria") => getDialoguePrompt(speaker),
    voiceFn:  (speaker: "lars"|"wiktoria") => speaker === "lars" ? LARS_VOICE : WIKTORIA_VOICE,
    selectedTools: [changeStageTool, endCallTool] as SelectedTool[]
  }
} as const;

// ────────────────────────────────────────────────────────────
//  DemoConfig (initial stage)
// ────────────────────────────────────────────────────────────
export const larsWiktoriaEnhancedConfig: DemoConfig = {
  title:    "Lars & Wiktoria · 3-Stage Open Flow",
  overview: "Collect details → Reflect → Open dialogue loop → End call.",
  callConfig: {
    systemPrompt:  stageMap.collect.promptFn(),
    model:         "fixie-ai/ultravox-70B",
    languageHint:  "auto",
    voice:         stageMap.collect.voiceFn(),
    temperature:   0.6,
    maxDuration:   "600s",
    timeExceededMessage: "Political performance time limit reached. Thank you for participating in our exhibition. Please call again to explore new political realities!",
    selectedTools: stageMap.collect.selectedTools
  }
};