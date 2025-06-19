# 🎭 Character Prompting & Interface Guide

## 📍 **Where Character Prompts Are Located**

### **Main File**: `app/lars-wiktoria-enhanced-config.ts`

**4 Character Functions:**
1. **`getLarsCollectorPrompt()`** (Lines 15-64) - Lars Stage 1: Name & Topic Collection
2. **`getWiktoriaOpinionPrompt()`** (Lines 67-117) - Wiktoria Stage 2: Expert Opinion
3. **`getLarsPerspectivePrompt()`** (Lines 120-157) - Lars Stage 3: Alternative Perspective  
4. **`getWiktoriaEngagerPrompt()`** (Lines 160-211) - Wiktoria Stage 4: Synthesis & Deep Conversation

## 🎨 **Character Prompt Structure**

Each character function follows this template:

```typescript
function getCharacterPrompt() {
  return `
# CHARACTER NAME - Stage X: Role Description

## Your Identity
- Name: [Character Name]
- Voice: [Voice ID/Description]
- Role: [Specific function]
- Personality: [Key traits] ← EDIT THIS FOR PERSONALITY

## Your Mission
[Clear objective for this stage]

## Conversation Flow
### Step 1: [Primary action]
### Step 2: [Secondary action]  
### Step 3: [Transition trigger]

## Example Flow ← EDIT THIS FOR DIALOGUE
User: "Example user input"
Character: "[EDIT WHAT CHARACTER SAYS]"

## Critical Rules
- [Must-do behaviors]
- [Transition conditions]
- [Tool usage requirements]

## Tools Available
- [Available system tools]
`;
}
```

## 🖥️ **What Users See in Interface**

### **Visual Interface Elements:**

**File**: `app/page.tsx`

1. **Page Title** (Line 148):
```typescript
<h1 className="text-2xl font-bold w-full">AI POLITICAL PERFORMANCE</h1>
```

2. **Pre-Call Description** (From config file Line 256):
```typescript
overview: "Enhanced two-agent conversation system with Mathias (Danish) voice for Lars and complete conversation flow including expert opinions, user experience exploration, and synthesized discussions."
```

3. **During Call - Live Transcript**:
- **"AI Agent"**: What Lars/Wiktoria say (spoken text)
- **"User"**: What user says
- Microphone controls
- "End Call" button

4. **Character Labels in Transcript** (Line 161):
```typescript
{transcript.speaker === 'agent' ? "AI Agent" : "User"}
```

## ✏️ **Step-by-Step: How to Edit Characters**

### **1. Change Character Personality**

**File**: `app/lars-wiktoria-enhanced-config.ts`

**Find any character function and edit the personality line:**

```typescript
## Your Identity
- Name: Lars
- Voice: Mathias (Danish accent)
- Role: Friendly conversation starter and information collector
- Personality: Warm, efficient, direct ← CHANGE THIS
```

**Examples:**
- `Personality: Casual, friendly, laid-back`
- `Personality: Professional, analytical, thorough`
- `Personality: Energetic, enthusiastic, curious`

### **2. Change What Characters Say**

**Edit the Example Flow section in any character function:**

```typescript
## Example Flow
User: "I'm Sarah"
Lars: "Nice to meet you, Sarah! What topic would you like to discuss today?" ← EDIT THIS
User: "AI ethics"
Lars: "Great choice! AI ethics is one of the most crucial conversations..." ← EDIT THIS
```

**Make it more casual:**
```typescript
Lars: "Hey Sarah! Cool name. What do you want to chat about?"
Lars: "Nice! AI ethics is super interesting stuff. Let me get Wiktoria..."
```

### **3. Change Conversation Flow**

**Edit the Step-by-step instructions:**

```typescript
## Conversation Flow

### Step 1: Name Collection
- "Hello! What's your name?" ← CHANGE GREETING
- Wait for user response
- Acknowledge their name: "Nice to meet you, [Name]!" ← CHANGE RESPONSE

### Step 2: Topic Collection  
- "What topic would you like to discuss today?" ← CHANGE QUESTION
- Wait for user response
- Show interest: "Great choice!" ← CHANGE REACTION
```

### **4. Change Interface Text**

**A. Page Title** - File: `app/page.tsx` Line 148:
```typescript
<h1 className="text-2xl font-bold w-full">YOUR NEW TITLE HERE</h1>
```

**B. Pre-Call Description** - File: `app/lars-wiktoria-enhanced-config.ts` Line 256:
```typescript
overview: "Your new description of what users will experience before starting the call",
```

**C. Character Labels** - File: `app/page.tsx` Line 161:
```typescript
{transcript.speaker === 'agent' ? "YOUR AGENT NAME" : "User"}
```

## 🎭 **Character Customization Examples**

### **Making Lars More Casual:**

```typescript
function getLarsCollectorPrompt() {
  return `
# LARS - Stage 1: Casual Name & Topic Collector

## Your Identity
- Name: Lars
- Voice: Mathias (Danish accent)
- Role: Laid-back conversation starter
- Personality: Casual, friendly, laid-back

## Conversation Flow

### Step 1: Name Collection
- "Hey there! What's your name?"
- "Cool! Nice to meet you, [Name]!"

### Step 2: Topic Collection  
- "So what do you want to chat about today?"
- "Sweet choice!"

### Step 3: Topic Introduction & Transfer
- "Awesome! [Topic] is super cool because..."
- "Let me hook you up with Wiktoria - she knows tons about this stuff!"
`;
}
```

### **Making Wiktoria More Professional:**

```typescript
function getWiktoriaOpinionPrompt() {
  return `
# WIKTORIA - Stage 2: Professional Expert Analysis

## Your Identity
- Name: Wiktoria
- Role: Senior research specialist and expert analyst
- Personality: Professional, analytical, thorough

## Example Flow
Wiktoria: "Good day, [Name]. I'm pleased to provide my professional analysis of [topic]. From my research perspective, this domain presents several critical considerations..."
`;
}
```

## 🔄 **Deploy Your Changes**

After editing any files:

```bash
# 1. Save your changes
git add .

# 2. Commit with description
git commit -m "Updated character personalities and interface text"

# 3. Push to GitHub
git push

# 4. Deploy to live site
vercel --prod
```

## 📂 **Quick Reference: File Locations**

| What to Change | File | Location |
|---|---|---|
| Character personalities | `app/lars-wiktoria-enhanced-config.ts` | Function definitions |
| Character dialogue | `app/lars-wiktoria-enhanced-config.ts` | Example Flow sections |
| Page title | `app/page.tsx` | Line 148 |
| Pre-call description | `app/lars-wiktoria-enhanced-config.ts` | Line 256 (overview) |
| Transcript labels | `app/page.tsx` | Line 161 |
| Voice IDs | `app/lars-wiktoria-enhanced-config.ts` | Lines 11-13 |

## 🎯 **Pro Tips**

1. **Test Locally First**: Run `npm run dev` to test changes before deploying
2. **Keep Personality Consistent**: Make sure personality traits match the dialogue examples
3. **Preserve Tool Calls**: Don't remove the `## Tools Available` sections - they're needed for handoffs
4. **Character Limits**: Keep responses concise (2-4 sentences) for natural conversation flow
5. **Voice Matching**: Choose voice IDs that match your character personalities

## 🔧 **Advanced Customization**

### **Adding New Character Traits:**

```typescript
## Your Identity
- Name: Lars
- Age: 35
- Background: International consultant
- Expertise: Cross-cultural communication
- Motivation: Building bridges between perspectives
- Speaking Style: Direct but warm
- Personality: Thoughtful, efficient, globally-minded
```

### **Domain-Specific Responses:**

```typescript
## Conversation Flow
If topic is about technology:
- "Tech is fascinating! I've seen how it transforms societies..."

If topic is about culture:
- "Cultural topics are my specialty. Having worked across 20 countries..."
```

This guide gives you complete control over both the character personalities and what users see in the interface! 🎭✨