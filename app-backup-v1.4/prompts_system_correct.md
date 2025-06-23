Actually, you're missing several important files! The current prompt architecture is more complex:

  🔍 Complete Prompt Architecture (Corrected)

  Files That Define Agent Prompts:

  ✅ Character Personality Files (what you mentioned):

  - app/characters/lars-character-base.ts - Lars personality & speech
  - app/characters/wiktoria-character-enhance2.ts - Wiktoria personality (enhanced version)

  🚨 MAIN STAGE CONFIGURATION (most important):

  - app/lars-wiktoria-enhanced-config-dynamic.ts - CURRENT ACTIVE CONFIG (stage flow + character injection)
  - app/lars-wiktoria-enhanced-config-backup.ts - Original backup version
  - app/lars-wiktoria-enhanced-config.ts - Previous hardcoded version

  🔌 API Route Files (also contain prompts):

  - app/api/transferToWiktoria/route.ts - Uses getWiktoriaOpinionPrompt()
  - app/api/requestLarsPerspective/route.ts - Uses getLarsPerspectivePrompt()
  - app/api/returnToWiktoria/route.ts - Uses getWiktoriaEngagerPrompt()

  📄 Alternative Character Files:

  - app/characters/wiktoria-character-base.ts - Original Wiktoria (not currently used)
  - app/characters/wiktoria-character-enhance.ts - Alternative version

  🔥 Key Point: The Stage Config is CRITICAL

  The app/lars-wiktoria-enhanced-config-dynamic.ts file is actually the MOST IMPORTANT for prompts because it:

  1. Imports character data from character files
  2. Builds the actual prompts that agents use (getLarsCollectorPrompt(), etc.)
  3. Defines conversation flow logic
  4. Injects character personalities into stage-specific contexts

  📊 Prompt Assembly Process:

  Character Files → Stage Config → API Routes → Agents
       ↓              ↓             ↓           ↓
  Personality → Flow Logic → Stage Prompts → Live Conversation

  So to answer your question: No, there are actually 6+ files that define agent prompts, with the stage configuration being the most critical for actual behavior!