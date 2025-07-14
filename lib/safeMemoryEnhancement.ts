import { CharacterVoiceProtector } from './characterVoiceProtection'
import { getConversationMemory, getAgentKnowledge } from './conversationMemory'
// Removed realTimeMemory import - functionality simplified for Pi deployment

export interface SafeMemoryContext {
  userProfile: {
    name: string
    age: string
    occupation: string
  }
  questionsAsked: string[]
  topicsDiscussed: string[]
  agentKnowledge: {
    previousStatements: string[]
    questionsToAvoid: string[]
    topicsToAvoid: string[]
  }
  conversationSummary: string
}

export class SafeMemoryEnhancer {
  private voiceProtector: CharacterVoiceProtector
  private agentName: 'lars' | 'wiktoria'

  constructor(agentName: 'lars' | 'wiktoria') {
    this.agentName = agentName
    this.voiceProtector = new CharacterVoiceProtector(agentName)
  }

  /**
   * Safely enhances agent prompt with conversation memory
   * Uses structured memory sections that preserve character voice
   */
  async enhancePrompt(
    basePrompt: string,
    conversationId: string,
    currentStage: string
  ): Promise<string> {
    try {
      console.log(`🧠 Safe memory enhancement for ${this.agentName} in stage: ${currentStage}`)

      // Get memory context
      const memoryContext = await this.getMemoryContext(conversationId)
      
      // Create safe memory section
      const memorySection = this.createMemorySection(memoryContext, currentStage)
      
      // Enhance prompt with structured memory
      const enhancedPrompt = this.appendMemoryToPrompt(basePrompt, memorySection)
      
      // Validate that character voice is preserved
      const validation = this.voiceProtector.validateEnhancedPrompt(basePrompt, enhancedPrompt)
      
      if (!validation.isValid && !validation.preservesVoice) {
        console.warn(`⚠️ Memory enhancement validation failed for ${this.agentName}:`, validation.issues)
        // Only fall back if voice is actually corrupted, not just context mentions
        if (validation.issues.some(issue => issue.includes('Lost core identity marker'))) {
          console.error(`❌ Critical voice corruption detected, falling back to base prompt`)
          return basePrompt
        } else {
          console.log(`✅ Voice preserved despite validation warnings, continuing with enhanced prompt`)
        }
      }

      console.log(`✅ Safe memory enhancement successful for ${this.agentName}`)
      return enhancedPrompt

    } catch (error) {
      console.error(`❌ Safe memory enhancement failed for ${this.agentName}:`, error)
      // Always fall back to original prompt on error
      return basePrompt
    }
  }

  /**
   * Retrieves and processes conversation memory for safe enhancement
   */
  private async getMemoryContext(conversationId: string): Promise<SafeMemoryContext> {
    // Get stored conversation memory
    const conversationMemory = await getConversationMemory(conversationId)
    
    // Get agent-specific knowledge
    const agentKnowledge = await getAgentKnowledge(conversationId, this.agentName)
    
    // Real-time tracker removed for Pi optimization
    const conversationSummary = null

    return {
      userProfile: {
        name: conversationMemory?.userProfile?.name || 'Unknown',
        age: conversationMemory?.userProfile?.age || 'Unknown',
        occupation: conversationMemory?.userProfile?.occupation || 'Unknown'
      },
      questionsAsked: [
        ...(conversationMemory?.questionsAsked?.map(q => q.question) || [])
      ].slice(-5), // Keep only recent questions
      topicsDiscussed: [
        ...(conversationMemory?.topicsDiscussed?.map(t => t.specificTopic) || [])
      ].slice(-5), // Keep only recent topics
      agentKnowledge: {
        previousStatements: agentKnowledge.previousStatements.slice(-3),
        questionsToAvoid: agentKnowledge.questionsToAvoid.slice(-5),
        topicsToAvoid: []
      },
      conversationSummary: '' // Simplified for Pi deployment
    }
  }

  /**
   * Creates a structured memory section based on conversation stage
   */
  private createMemorySection(context: SafeMemoryContext, stage: string): string {
    const sections: string[] = []

    // Always include user context for personalization
    if (context.userProfile.name !== 'Unknown') {
      sections.push(`## User Information
Name: ${context.userProfile.name}
Age: ${context.userProfile.age}
Occupation: ${context.userProfile.occupation}`)
    }

    // Stage-specific memory inclusion
    switch (stage) {
      case 'lars_initial':
        // Lars initial stage - no memory needed, fresh start
        break
        
      case 'wiktoria_opinion':
        // Wiktoria opinion stage - basic user context only
        if (context.questionsAsked.length > 0) {
          sections.push(`## Context Awareness
Previous questions in this conversation:
- ${context.questionsAsked.slice(-2).join('\n- ')}

Avoid repeating these questions.`)
        }
        break
        
      case 'lars_perspective':
        // Lars perspective stage - topic and question history
        if (context.topicsDiscussed.length > 0) {
          sections.push(`## Topics Already Discussed
- ${context.topicsDiscussed.slice(-3).join('\n- ')}

Build upon these topics rather than repeating them.`)
        }
        
        if (context.questionsAsked.length > 0) {
          sections.push(`## Questions to Avoid Repeating
- ${context.questionsAsked.slice(-3).join('\n- ')}`)
        }
        break
        
      case 'wiktoria_engager':
        // Wiktoria engager stage - full context for sophisticated engagement
        sections.push(`## Conversation Context
${context.conversationSummary}`)
        
        if (context.agentKnowledge.previousStatements.length > 0) {
          sections.push(`## Your Previous Statements
- ${context.agentKnowledge.previousStatements.slice(-2).join('\n- ')}

Avoid repeating these exact positions.`)
        }
        break
    }

    return sections.join('\n\n')
  }

  /**
   * Safely appends memory section to base prompt
   */
  private appendMemoryToPrompt(basePrompt: string, memorySection: string): string {
    if (!memorySection.trim()) {
      return basePrompt
    }

    // Append memory as a separate section to preserve character voice
    return `${basePrompt}

---

# Conversation Memory & Context

${memorySection}

---

**CRITICAL**: The above memory context is for avoiding repetition and personalizing responses. Your core character voice, personality, and communication style must remain exactly as defined in your main prompt above.`
  }

  /**
   * Creates a concise conversation summary
   */
  private createConversationSummary(summary: any): string {
    const parts: string[] = []

    if (summary.questionsAsked?.length > 0) {
      parts.push(`Questions asked: ${summary.questionsAsked.slice(-2).join(', ')}`)
    }

    if (summary.topicsDiscussed?.length > 0) {
      parts.push(`Topics discussed: ${summary.topicsDiscussed.slice(-2).join(', ')}`)
    }

    if (summary.agentPositions?.lars?.length > 0) {
      parts.push(`Lars's recent positions: ${summary.agentPositions.lars.slice(-1).join(', ')}`)
    }

    if (summary.agentPositions?.wiktoria?.length > 0) {
      parts.push(`Wiktoria's recent positions: ${summary.agentPositions.wiktoria.slice(-1).join(', ')}`)
    }

    return parts.join('\n')
  }

  /**
   * Validates that memory enhancement is safe for the given agent
   */
  static validateMemoryForAgent(
    agentName: 'lars' | 'wiktoria',
    memoryContent: string
  ): { isValid: boolean; issues: string[] } {
    const protector = new CharacterVoiceProtector(agentName)
    const validation = protector.validateMemoryContent(memoryContent)
    
    return {
      isValid: validation.isValid,
      issues: validation.issues
    }
  }
}