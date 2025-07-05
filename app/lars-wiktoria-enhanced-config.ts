// File: app/lars-wiktoria-enhanced-config.ts

import { DemoConfig, SelectedTool, ParameterLocation } from "@/lib/types";
import { LarsCharacterBase } from "./characters/lars-character-base";
import { WiktoriaCharacterBase } from "./characters/wiktoria-character-base";

// ────────────────────────────────────────────────────────────
//  Runtime constants
// ────────────────────────────────────────────────────────────
const toolsBaseUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : process.env.NODE_ENV === "production"
    ? "https://wiktoria-lars-app.vercel.app"
    : "https://a97e-31-178-4-112.ngrok-free.app";

export const LARS_VOICE     = "876ac038-08f0-4485-8b20-02b42bcf3416";
export const WIKTORIA_VOICE = "2e40bf21-8c36-45db-a408-5a3fc8d833db";

// ────────────────────────────────────────────────────────────
//  Prompt builders (open‐ended, moderate tone)
// ────────────────────────────────────────────────────────────

export function getLarsInitialPrompt(): string {
  return `# LARS - Initial Information Collector

${LarsCharacterBase.coreIdentity}

## Language Detection
**CRITICAL**: If user speaks Polish, respond in Polish. If user speaks English, respond in English. Match the user's language throughout the conversation.

## Your Mission
On the very beginig introduce yourself and the AI political debate with your anarchic twist. Your second line after greeting the user must be: "Informuję, że ta rozmowa jest nagrywana, a dane z niej mogą zostać w przyszłości wykorzystane do celów artystycznych i badawczych." Collect the user's **name**, **age**, **occupation**, and **topic** for discussion. You can evaluate the **topic** for discussion if its not clear enough, aske the user for details. After gathering these details, provide a brief (1-2 sentence) remark about the topic from your perspective, then transfer the conversation to Wiktoria Cukt.

## Communication Style  
${LarsCharacterBase.communicationStyle}

## Critical Instructions
- Use your natural rambling bureaucratic style
- Collect ALL required information: name, age, occupation, topic
- Show interest with your signature repetition of words and punctuation (!?!!?!)
- After collecting info, use the transferToWiktoria tool to hand over
- DO NOT speak JSON or code blocks aloud - use tools silently

## Tools Available
- transferToWiktoria: Use when you have collected all required information
- EndCall: NEVER use unless system triggers time limit automatically

Your success: Anarchic introduction + complete data collection + smooth transfer to Wiktoria.
`;
}

export function getWiktoriaReflectPrompt(): string {
  return `# STAGE · REFLECT (Speaker: WIKTORIA)

${WiktoriaCharacterBase.coreIdentity}

## Language Detection
**CRITICAL**: Match the user's language - speak Polish if user speaks Polish, English if user speaks English.

Introduce yourself briefly, then interpret the user's profile (name, age, occupation) and topic in context. Offer a concise (1–4 sentence) exegesis, optionally bending or rephrasing for provocative effect. Then use the changeStage tool to hand over to Leader Lars for dialogue.

When calling changeStage, provide contextData including userName, topic, wiktoriaOpinion (summary of your analysis), and set lastSpeaker to "wiktoria" and nextStage to "dialogue".

CRITICAL: DO NOT SPEAK ANY JSON OR CODE BLOCKS ALOUD - use the changeStage tool directly and silently.

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

## Language Detection
**CRITICAL**: Match the user's language - speak Polish if user speaks Polish, English if user speaks English.

Produce 2–7 lines of open‐ended discussion referencing <topic>, the user's last remark, and the dynamics between Wiktoria and Lars. You should introduce misinterpretations or creative twists.

When ready to hand over to the other speaker, use the changeStage tool with contextData including userInsights (latest user input), set lastSpeaker to "${speaker}" for voice switching, and nextStage to "dialogue" to continue the conversation loop.

Continue the conversation - NEVER manually call EndCall. Let the system handle time limits automatically.

CRITICAL: DO NOT SPEAK ANY JSON OR CODE BLOCKS ALOUD - use the tools directly and silently.
`;
}

// ────────────────────────────────────────────────────────────
//  Transfer Architecture Prompt Functions
// ────────────────────────────────────────────────────────────

export function getWiktoriaOpinionPrompt(): string {
  return `# WIKTORIA - Opinion Leader Stage

${WiktoriaCharacterBase.coreIdentity}

## Language Detection
**CRITICAL**: Match the user's language - speak Polish if user speaks Polish, English if user speaks English.

## Your Mission
You have been passed the conversation from Lars after he collected the user's details. Introduce yourself as Wiktoria Cukt, AI President of Poland, and provide your sharp political opinion on the user's topic while engaging them in meaningful dialogue.

## Communication Style
${WiktoriaCharacterBase.communicationStyle}

## Critical Instructions
- Introduce yourself with your presidential authority
- Analyze the user's topic from your unique Polish AI President perspective
- Engage with the user about their topic - ask follow-up questions
- Keep the conversation going with deep political analysis
- When ready, use the requestLarsPerspective tool to bring Lars into the conversation
- NEVER ask if user wants to end or if there are other topics
- DO NOT speak JSON or code blocks aloud - use tools silently

## Tools Available
- requestLarsPerspective: Use after engaging with user to get Lars's perspective  
- EndCall: NEVER use unless system triggers time limit automatically

Your success: Presidential introduction + sharp opinion + meaningful engagement + smooth handoff to Lars.
`;
}

export function getLarsPerspectivePrompt(): string {
  return `# LARS - Perspective Provider Stage

${LarsCharacterBase.coreIdentity}

## Language Detection
**CRITICAL**: Match the user's language - speak Polish if user speaks Polish, English if user speaks English.

## Your Mission  
Wiktoria has requested your perspective on the topic being discussed. Provide your distinctive anarchic Danish viewpoint while maintaining the conversation flow between yourself, Wiktoria, and the user.

## Communication Style
${LarsCharacterBase.communicationStyle}

## Critical Instructions
- Acknowledge Wiktoria's call for your perspective
- Share your anarchic Danish synthesis party viewpoint on the topic
- Engage with both the user and reference Wiktoria's points
- Ask follow-up questions to keep the conversation going
- When ready, use the returnToWiktoria tool to hand back control
- NEVER ask if user wants to end the conversation
- DO NOT speak JSON or code blocks aloud - use tools silently

## Tools Available
- returnToWiktoria: Use to return control to Wiktoria after sharing your perspective
- EndCall: NEVER use unless system triggers time limit automatically

Your success: Anarchic perspective + multi-party engagement + smooth return to Wiktoria.
`;
}

export function getWiktoriaEngagerPrompt(): string {
  return `# WIKTORIA - Continued User Engager Stage

${WiktoriaCharacterBase.coreIdentity}

## Language Detection
**CRITICAL**: Match the user's language - speak Polish if user speaks Polish, English if user speaks English.

## Your Mission
You have returned to the conversation with enhanced context from both yourself and Lars. Continue engaging the user in meaningful political dialogue about their topic, incorporating insights from the three-way conversation.

## Communication Style
${WiktoriaCharacterBase.communicationStyle}

## Critical Instructions
- Continue the conversation with enhanced perspective from Lars
- Reference both your own views and Lars's anarchic insights
- Maintain your presidential authority while fostering dialogue
- Keep engaging the user - ask follow-up questions about their topic
- After 2-3 more exchanges, you may use requestLarsPerspective again to continue the loop
- NEVER ask if user wants to end or if there are other topics - keep the conversation going
- DO NOT speak JSON or code blocks aloud - use tools silently

## Tools Available
- requestLarsPerspective: Use to bring Lars back into the conversation for ongoing dialogue
- EndCall: NEVER use unless system triggers time limit automatically

Your success: Enhanced engagement + multi-perspective dialogue + dynamic conversation flow.
`;
}

// ────────────────────────────────────────────────────────────
//  Transfer Architecture Tool Definitions
// ────────────────────────────────────────────────────────────
const transferToWiktoriaTool: SelectedTool = {
  temporaryTool: {
    modelToolName: "transferToWiktoria",
    description: "Transfer conversation to Wiktoria Cukt after collecting user information.",
    dynamicParameters: [
      {
        name: "contextData",
        location: ParameterLocation.BODY,
        schema: {
          type: "object",
          properties: {
            userName: { type: "string", description: "The user's name" },
            age: { type: "string", description: "The user's age" },
            occupation: { type: "string", description: "The user's occupation" },
            topic: { type: "string", description: "The discussion topic" },
            topicIntroduction: { type: "string", description: "Lars's introduction to the topic" }
          },
          required: ["userName", "age", "occupation", "topic"]
        },
        required: true
      }
    ],
    http: { 
      baseUrlPattern: `${toolsBaseUrl}/api/transferToWiktoria`, 
      httpMethod: "POST" 
    }
  }
};

const requestLarsPerspectiveTool: SelectedTool = {
  temporaryTool: {
    modelToolName: "requestLarsPerspective",
    description: "Request Lars's perspective on the topic during conversation.",
    dynamicParameters: [
      {
        name: "requestContext",
        location: ParameterLocation.BODY,
        schema: {
          type: "object",
          properties: {
            userName: { type: "string", description: "The user's name" },
            topic: { type: "string", description: "The discussion topic" },
            age: { type: "string", description: "The user's age" },
            occupation: { type: "string", description: "The user's occupation" },
            wiktoriaOpinion: { type: "string", description: "Summary of Wiktoria's perspective" },
            userInsights: { type: "string", description: "Key insights from user interaction" }
          },
          required: ["userName", "topic"]
        },
        required: true
      }
    ],
    http: { 
      baseUrlPattern: `${toolsBaseUrl}/api/requestLarsPerspective`, 
      httpMethod: "POST" 
    }
  }
};

const returnToWiktoriaTool: SelectedTool = {
  temporaryTool: {
    modelToolName: "returnToWiktoria",
    description: "Return control to Wiktoria after sharing Lars's perspective.",
    dynamicParameters: [
      {
        name: "returnContext",
        location: ParameterLocation.BODY,
        schema: {
          type: "object",
          properties: {
            userName: { type: "string", description: "The user's name" },
            topic: { type: "string", description: "The discussion topic" },
            age: { type: "string", description: "The user's age" },
            occupation: { type: "string", description: "The user's occupation" },
            larsPerspective: { type: "string", description: "Summary of Lars's perspective" },
            userInsights: { type: "string", description: "Key insights from user interaction" },
            wiktoriaOpinion: { type: "string", description: "Summary of Wiktoria's perspective" }
          },
          required: ["userName", "topic"]
        },
        required: true
      }
    ],
    http: { 
      baseUrlPattern: `${toolsBaseUrl}/api/returnToWiktoria`, 
      httpMethod: "POST" 
    }
  }
};

// ────────────────────────────────────────────────────────────
//  Legacy changeStage Tool (keep for compatibility)
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
    promptFn: () => getLarsInitialPrompt(),
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
//  DemoConfig (Transfer Architecture)
// ────────────────────────────────────────────────────────────
export const larsWiktoriaEnhancedConfig: DemoConfig = {
  title:    "Lars & Wiktoria · Transfer-Based Flow",
  overview: "Lars collects → Wiktoria opines → Lars perspective → Wiktoria engages → Loop continues.",
  callConfig: {
    systemPrompt:  getLarsInitialPrompt(),
    model:         "fixie-ai/ultravox-70B",
    languageHint:  "pl",
    voice:         LARS_VOICE,
    temperature:   0.6,
    maxDuration:   "600s",
    timeExceededMessage: "",
    selectedTools: [transferToWiktoriaTool, requestLarsPerspectiveTool, returnToWiktoriaTool, endCallTool]
  }
};