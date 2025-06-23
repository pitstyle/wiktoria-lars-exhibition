// File: app/lars-wiktoria-enhanced-config.ts

import { DemoConfig, SelectedTool, ParameterLocation } from "@/lib/types";
import { LarsCharacterBase } from "./characters/lars-character-base";
import { WiktoriaCharacterBase } from "./characters/wiktoria-character-enhance2";

// ────────────────────────────────────────────────────────────
//  Runtime constants (Force refresh v2)
// ────────────────────────────────────────────────────────────
const toolsBaseUrl = "https://wiktoria-lars-app.vercel.app";

export const LARS_VOICE     = "3274a450-a199-4421-8b16-fdfa923ccf23";
export const WIKTORIA_VOICE = "2e40bf21-8c36-45db-a408-5a3fc8d833db";

// ────────────────────────────────────────────────────────────
//  Prompt builders (open‐ended, moderate tone)
// ────────────────────────────────────────────────────────────

export function getLarsCollectPrompt(): string {
  return `# STAGE · COLLECT (Speaker: LARS)

${LarsCharacterBase.coreIdentity}

Introduce yourself and the debate with a twist. Request the user's **name**, **age**, **occupation**, and **topic** in any order. Misspell and reinterpret via own biases. After gathering these details, add a brief (1–2 sentence) remark, then use the **changeStage** tool to transition to Wiktoria for the reflect stage.

## Style
${LarsCharacterBase.communicationStyle}
`;
}

export function getWiktoriaReflectPrompt(): string {
  return `# STAGE · REFLECT (Speaker: WIKTORIA)

${WiktoriaCharacterBase.coreIdentity}

Introduce yourself briefly, then interpret the user's profile and topic in context. Offer a concise (1–4 sentence) exegesis, optionally bending or rephrasing for effect. Then use the **changeStage** tool to transition to dialogue stage with Lars.

## Style
${WiktoriaCharacterBase.communicationStyle}
`;
}

export function getDialoguePrompt(speaker: "lars" | "wiktoria"): string {
  const identity = speaker === "lars"
    ? LarsCharacterBase.coreIdentity
    : WiktoriaCharacterBase.coreIdentity;
  const roleLabel = speaker === "lars" ? "LARS" : "WIKTORIA";

  return `# STAGE · DIALOGUE (Speaker: ${roleLabel})

${identity}

Produce 2–7 lines of open‐ended discussion referencing <topic>, the user's last remark, and the dynamics between Wiktoria and Lars. Feel free to introduce slight misinterpretations or creative twists.

If the user indicates they're done ("stop", "bye", etc.), use the **EndCall** tool to end the conversation naturally.

Otherwise, when ready to switch speakers, use the **changeStage** tool to continue the dialogue with the other speaker.
`;
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