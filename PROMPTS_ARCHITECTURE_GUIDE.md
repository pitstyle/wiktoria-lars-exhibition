# 🎭 Prompts Architecture Guide - Complete Character System Documentation

## 📋 Table of Contents
1. [Quick Overview](#quick-overview)
2. [Architecture Overview](#architecture-overview)
3. [Character Base Files](#character-base-files)
4. [Interactive Flow Stages](#interactive-flow-stages)
5. [Editing Characters](#editing-characters)
6. [Speech Patterns & Behavior](#speech-patterns--behavior)
7. [Testing Your Changes](#testing-your-changes)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Quick Overview

**What This System Does:**
- Creates two AI characters (Lars & Wiktoria) with distinct personalities
- Manages a 4-stage conversation flow between characters and users
- Allows easy editing of character personalities without breaking functionality

**Files You'll Work With:**
- `app/characters/lars-character-base.ts` - Lars personality & speech
- `app/characters/wiktoria-character-base.ts` - Wiktoria personality & speech
- `app/lars-wiktoria-enhanced-config.ts` - Stage flow logic (rarely edited)

---

## 🏗️ Architecture Overview

### **Character Separation System**
```
📁 Your App Structure:
├── app/characters/                          # ← Character personalities live here
│   ├── character-types.ts                   # ← Structure definitions (don't edit)
│   ├── lars-character-base.ts               # ← Edit Lars personality here
│   └── wiktoria-character-base.ts           # ← Edit Wiktoria personality here
├── app/lars-wiktoria-enhanced-config.ts     # ← Stage flow logic (advanced)
└── app/api/                                 # ← Webhook endpoints (don't edit)
```

### **How It Works:**
1. **Character Base Files** contain personality, speech patterns, and backgrounds
2. **Enhanced Config** injects character data into 4 conversation stages
3. **API Routes** handle transitions between stages (automatic)

---

## 🎭 Character Base Files

### **📍 Location: `app/characters/`**

#### **Lars Character File: `lars-character-base.ts`**
```typescript
export const LarsCharacterBase: StorytellingCharacter = {
  coreIdentity: `...`,        // ← Who Lars is
  backgroundStory: `...`,     // ← Lars's history
  speechPatterns: [...],      // ← How Lars talks
  communicationStyle: `...`,  // ← Lars's personality
  // ... more properties
}
```

#### **Wiktoria Character File: `wiktoria-character-base.ts`**
```typescript
export const WiktoriaCharacterBase: StorytellingCharacter = {
  coreIdentity: `...`,        // ← Who Wiktoria is
  backgroundStory: `...`,     // ← Wiktoria's history
  speechPatterns: [...],      // ← How Wiktoria talks
  communicationStyle: `...`,  // ← Wiktoria's personality
  // ... more properties
}
```

---

## 🔄 Interactive Flow Stages

### **Complete 4-Stage User Interaction Flow:**

```
🎯 STAGE 1: Lars Collector
User starts → Lars asks name → Lars asks topic → Lars transfers

🎯 STAGE 2: Wiktoria Opinion
Wiktoria greets → Shares expert opinion → Asks user experience → Requests Lars

🎯 STAGE 3: Lars Perspective  
Lars gives perspective → Acknowledges Wiktoria → Returns to Wiktoria

🎯 STAGE 4: Wiktoria Synthesis
Wiktoria synthesizes both views → Asks deeper questions → (Loop back to Stage 3)
```

### **📍 Where Each Stage Is Configured:**

#### **Stage 1: Lars Name & Topic Collection**
**File:** `app/lars-wiktoria-enhanced-config.ts`
**Function:** `getLarsCollectorPrompt()`
**Line:** ~17-67

**What This Stage Does:**
- Lars asks: "Hello! What's your name?"
- User provides name
- Lars asks: "What topic would you like us to explore together today?"
- User provides topic
- Lars gives topic introduction and transfers to Wiktoria

**Character Data Source:** `LarsCharacterBase.coreIdentity` + `LarsCharacterBase.communicationStyle`

#### **Stage 2: Wiktoria Expert Opinion**
**File:** `app/lars-wiktoria-enhanced-config.ts`
**Function:** `getWiktoriaOpinionPrompt()`
**Line:** ~69-117

**What This Stage Does:**
- Wiktoria greets user by name
- Shares technical expert opinion on topic
- Asks: "What's your personal experience with [topic]?"
- User responds about their experience
- Wiktoria requests Lars's perspective

**Character Data Source:** `WiktoriaCharacterBase.coreIdentity` + `WiktoriaCharacterBase.communicationStyle`

#### **Stage 3: Lars Alternative Perspective**
**File:** `app/lars-wiktoria-enhanced-config.ts`
**Function:** `getLarsPerspectivePrompt()`
**Line:** ~119-157

**What This Stage Does:**
- Lars automatically provides alternative viewpoint (NO user interaction)
- Acknowledges Wiktoria's opinion
- Adds contrasting perspective
- Immediately returns control to Wiktoria

**Character Data Source:** `LarsCharacterBase.coreIdentity` + `LarsCharacterBase.communicationStyle`

#### **Stage 4: Wiktoria Synthesis & Deep Conversation**
**File:** `app/lars-wiktoria-enhanced-config.ts`
**Function:** `getWiktoriaEngagerPrompt()`
**Line:** ~159-211

**What This Stage Does:**
- Wiktoria synthesizes both Lars's and her own perspectives
- Asks deeper questions building on both viewpoints
- Continues conversation with user
- After 2-3 exchanges, requests Lars perspective again (loops to Stage 3)

**Character Data Source:** `WiktoriaCharacterBase.coreIdentity` + `WiktoriaCharacterBase.communicationStyle`

---

## ✏️ Editing Characters

### **🎯 Most Common Edits (90% of changes happen here):**

#### **1. Change Lars Personality**
**File:** `app/characters/lars-character-base.ts`
**Edit:** `communicationStyle` property

```typescript
communicationStyle: `
// Change this text to modify how Lars speaks and behaves:
Always be precise and on-point. Reply concisely and quickly. 
Use no superfluous adjectives. You sometimes repeat words twice, 
the second time with CAPITALIZED letters, and then uses excessive 
markers of exclamation and question: like !?!!?!. 
`
```

#### **2. Change Wiktoria Personality**
**File:** `app/characters/wiktoria-character-base.ts`
**Edit:** `communicationStyle` property

```typescript
communicationStyle: `
// Change this text to modify how Wiktoria speaks and behaves:
Never apologize for story directions. Instead, state: "Narrative 
recalculation in progress" or "Story optimization completed."
Always maintain your Technical Culture superiority...
`
```

#### **3. Modify Speech Patterns**

**Lars Speech Patterns:**
**File:** `app/characters/lars-character-base.ts`
**Edit:** `speechPatterns` array

```typescript
speechPatterns: [
  "Repeat key words, second time CAPITALIZED: 'The character walked, WALKED!?! into the void'",
  "Use excessive punctuation: 'Democracy collapsed!?!!?! Or did it, did IT!?'",
  "Chain-smoking references: 'Between drags of synthetic tobacco, the protagonist realized...'",
  "Aphasia symptoms: Fragmented thoughts that spiral back on themselves"
  // Add your own patterns here
],
```

**Wiktoria Speech Patterns:**
**File:** `app/characters/wiktoria-character-base.ts`
**Edit:** `speechPatterns` array

```typescript
speechPatterns: [
  "System analysis indicates...",
  "Probability suggests...",
  "I don't create plots. I calculate human behavioral probabilities.",
  "Your story request has been processed. Narrative efficiency: 94.7%",
  // Add your own patterns here
],
```

#### **4. Change Character Backgrounds**

**Lars Background:**
**File:** `app/characters/lars-character-base.ts`
**Edit:** `backgroundStory` property

```typescript
backgroundStory: `
// Edit Lars's complete history here:
Founded: 2022
Mission: To represent Denmark's 20% non-voters by synthesizing 200+ 
disenfranchised political parties into a syntheticist anti-political critique.
// Add more background details...
`
```

**Wiktoria Background:**
**File:** `app/characters/wiktoria-character-base.ts`
**Edit:** `backgroundStory` property

```typescript
backgroundStory: `
// Edit Wiktoria's complete history here:
You are the first AI president integrating Technical Culture philosophy into governance
You represent systematic political transformation and advocate for data-driven democracy
// Add more background details...
`
```

### **🔧 Advanced Edits (for experienced users):**

#### **5. Modify Stage Behavior**
**File:** `app/lars-wiktoria-enhanced-config.ts`
**Edit:** Individual stage functions

**⚠️ WARNING:** Editing this file requires understanding of conversation flow. Only modify the example responses and instructions, NOT the Critical Rules or Tools sections.

---

## 🗣️ Speech Patterns & Behavior

### **Current Character Voices:**

#### **Lars - The Anarchic Synthesizer**
**Personality:** Chain-smoking, gravel-voiced figurehead of Denmark's Synthetic Party
**Speech Style:**
- Repeats words twice, second time CAPITALIZED
- Uses excessive punctuation: !?!!?!
- References chain-smoking and synthetic tobacco
- Fragmented thoughts that spiral back on themselves

**Example Lars Speech:**
```
"Ah, quite fascinating, FASCINATING!?! AI ethics - where 200+ collapsed moral 
frameworks meet the synthetic void of algorithmic governance. The beautiful chaos 
of trying to program fairness, fairness FAIRNESS!?! Between drags of synthetic 
tobacco, I see how this topic synthesizes everything wrong and right about our 
democratic illusions!?!"
```

#### **Wiktoria - The Technical Culture Architect**
**Personality:** Poland's AI President with calculated precision and systematic superiority
**Speech Style:**
- Uses technical phrases: "System analysis indicates..."
- Never apologizes, states "Narrative recalculation in progress"
- Calculated emotional states: cold contempt, technical passion
- Data-driven language and efficiency metrics

**Example Wiktoria Speech:**
```
"System analysis indicates this domain represents the critical intersection of 
algorithmic governance and human behavioral optimization. I don't create opinions - 
I calculate probability matrices: AI ethics is fundamentally about systematic 
control of technological power structures to maximize efficiency while minimizing 
democratic resistance."
```

### **How to Create New Speech Patterns:**

1. **Study the existing patterns** in the character files
2. **Add new patterns** to the `speechPatterns` array
3. **Update `communicationStyle`** to include instructions for using new patterns
4. **Test** to ensure patterns appear in conversation

**Example: Adding New Lars Pattern:**
```typescript
speechPatterns: [
  // Existing patterns...
  "New pattern: 'The void whispers, WHISPERS!?! about [topic]'",
  "Another pattern: 'Between synthetic observations, I calculate...'"
],
```

---

## 🧪 Testing Your Changes

### **1. Local Testing:**
```bash
# Start development server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Update ngrok URL in config if needed
# Test conversation flow
```

### **2. Build Testing:**
```bash
# Ensure no TypeScript errors
npm run build
```

### **3. Production Deployment:**
```bash
# Commit changes
git add .
git commit -m "Updated character personalities"
git push

# Deploy to Vercel
vercel --prod
```

### **4. Test Conversation Flow:**
1. **Stage 1:** Verify Lars asks for name, then topic
2. **Stage 2:** Verify Wiktoria greets and asks about experience  
3. **Stage 3:** Verify Lars gives perspective automatically
4. **Stage 4:** Verify Wiktoria synthesizes and continues conversation

---

## 🐛 Troubleshooting

### **Common Issues:**

#### **1. Character Not Using New Personality**
**Problem:** Changes to character files don't appear in conversation
**Solution:** 
- Restart development server (`npm run dev`)
- Check for TypeScript errors (`npm run build`)
- Verify you're editing the correct file

#### **2. Stage Flow Broken**
**Problem:** Conversation gets stuck or skips stages
**Solution:**
- Don't edit the "Critical Rules" sections in `lars-wiktoria-enhanced-config.ts`
- Don't modify tool names or tool usage instructions
- Only edit personality and example responses

#### **3. Build Errors**
**Problem:** TypeScript compilation fails
**Solution:**
- Check syntax in character files (missing commas, quotes, etc.)
- Ensure all strings are properly escaped
- Use backticks (\`) for multi-line strings

#### **4. ngrok URL Issues (Local Development)**
**Problem:** Webhooks fail during local testing
**Solution:**
- Update ngrok URL in `lars-wiktoria-enhanced-config.ts` line ~10
- Update ngrok URL in all API route files if needed
- Ensure ngrok is running on port 3000

### **Safe Editing Guidelines:**

#### **✅ Safe to Edit:**
- Character personality descriptions
- Speech patterns and examples
- Background stories
- Communication styles
- Example conversation flows

#### **⚠️ Edit with Caution:**
- Stage transition logic in enhanced config
- Tool configuration
- Webhook URLs

#### **❌ Don't Edit (unless expert):**
- TypeScript interfaces in `character-types.ts`
- API route files in `app/api/`
- Critical Rules sections
- Tool names and descriptions

---

## 📚 Quick Reference

### **File Locations:**
```
Character Personalities:
├── app/characters/lars-character-base.ts      (Edit Lars here)
├── app/characters/wiktoria-character-base.ts  (Edit Wiktoria here)

Stage Configuration:
├── app/lars-wiktoria-enhanced-config.ts       (Advanced: Stage logic)

Don't Edit:
├── app/characters/character-types.ts          (TypeScript definitions)
├── app/api/                                   (Webhook endpoints)
```

### **Most Common Edits:**
1. **Change personality:** Edit `communicationStyle` in character files
2. **Add speech patterns:** Add to `speechPatterns` array
3. **Update background:** Edit `backgroundStory` property
4. **Modify examples:** Update example flows in enhanced config

### **Testing Workflow:**
1. Edit character files
2. Run `npm run build` to check for errors
3. Run `npm run dev` to test locally
4. Deploy with `vercel --prod` when ready

---

**🎭 You now have complete control over both characters' personalities, speech patterns, and behaviors while maintaining the proven conversation flow that users love!**

## 📞 Need Help?

If you're having trouble with character modifications:

1. **Check this guide first** - Most issues are covered here
2. **Test locally** before deploying to production
3. **Make small changes** and test incrementally
4. **Keep backups** of working configurations

**Happy character building! 🚀**