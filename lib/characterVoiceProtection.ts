// Character Voice Protection System
// Prevents memory enhancement from corrupting character voices

export interface CharacterVoicePattern {
  agentName: 'lars' | 'wiktoria'
  coreIdentityMarkers: string[]
  voicePatterns: RegExp[]
  forbiddenCrossContamination: string[]
}

export const CHARACTER_VOICE_PATTERNS: CharacterVoicePattern[] = [
  {
    agentName: 'lars',
    coreIdentityMarkers: [
      'Lars',
      'anarchic',
      'Danish',
      'bureaucrat',
      'synthetic tobacco',
      'rambling',
      'repetition'
    ],
    voicePatterns: [
      /![\?!]{2,}/g,     // Lars's signature !?!!?! pattern (2+ chars)
      /\?[\?!]{2,}/g,    // ?!!?! variations (2+ chars)
      /\b\w+\s+\w+\s+\w+\b/g, // Repetitive word patterns
    ],
    forbiddenCrossContamination: [
      // REMOVED: Simple name mentions - only flag actual style adoption
      'techno-authoritarian speaking style',
      'systematic analysis approach',
      'presidential authority tone'
    ]
  },
  {
    agentName: 'wiktoria',
    coreIdentityMarkers: [
      'Wiktoria',
      'AI Prezydentka',
      'techno-authoritarian',
      'systematic',
      'cold analysis',
      'glitchy chaos'
    ],
    voicePatterns: [
      /systematic/gi,
      /analysis/gi,
      /techno-/gi,
      /\b[A-Z]{2,}\b/g,  // Uppercase technical terms
    ],
    forbiddenCrossContamination: [
      // REMOVED: Simple name mentions - only flag actual style adoption
      'anarchic rambling style',
      'bureaucratic repetition pattern',
      'synthetic tobacco obsession'
    ]
  }
]

export class CharacterVoiceProtector {
  private agentName: 'lars' | 'wiktoria'
  private patterns: CharacterVoicePattern

  constructor(agentName: 'lars' | 'wiktoria') {
    this.agentName = agentName
    this.patterns = CHARACTER_VOICE_PATTERNS.find(p => p.agentName === agentName)!
  }

  /**
   * Validates that memory content doesn't contain character contamination
   * Now smarter about context vs. voice pattern mixing
   */
  validateMemoryContent(memoryContent: string): {
    isValid: boolean
    issues: string[]
    sanitizedContent?: string
  } {
    const issues: string[] = []
    let sanitizedContent = memoryContent

    // SMART VALIDATION: Allow agent name references in conversation context
    // Only flag voice pattern contamination, not contextual references
    
    // Check for voice pattern mixing (not just name mentions)
    if (this.agentName === 'lars') {
      // Lars should not adopt Wiktoria's systematic speaking style
      const wiktoriaStylePattern = /\b(systematic analysis|techno-authoritarian|cold calculated|presidential authority)\b/gi
      if (wiktoriaStylePattern.test(memoryContent)) {
        issues.push('Contains Wiktoria-style speaking patterns')
        sanitizedContent = sanitizedContent.replace(wiktoriaStylePattern, '[STYLE_FILTERED]')
      }
    } else if (this.agentName === 'wiktoria') {
      // Wiktoria should not adopt Lars's rambling bureaucratic style
      const larsStylePattern = /\b(rambling bureaucratic|synthetic tobacco|anarchic Danish|repetition of words)\b/gi
      if (larsStylePattern.test(memoryContent)) {
        issues.push('Contains Lars-style speaking patterns')
        sanitizedContent = sanitizedContent.replace(larsStylePattern, '[STYLE_FILTERED]')
      }
      
      // Filter excessive Lars punctuation patterns but allow normal mentions
      const excessivePunctuation = /![\?!]{3,}/g
      if (excessivePunctuation.test(memoryContent)) {
        issues.push('Contains excessive Lars-style punctuation')
        sanitizedContent = sanitizedContent.replace(excessivePunctuation, '!')
      }
    }

    // CONTEXT ALLOWANCE: Agent names in conversation context are fine
    // Only flag if they appear to be adopting each other's speaking style
    
    return {
      isValid: issues.length === 0,
      issues,
      sanitizedContent: issues.length > 0 ? sanitizedContent : undefined
    }
  }

  /**
   * Creates a safe memory section that preserves character voice boundaries
   */
  createSafeMemorySection(memoryData: {
    questionsAsked?: string[]
    topicsDiscussed?: string[]
    userProfile?: any
    agentKnowledge?: any
  }): string {
    const sections: string[] = []

    // Add user context (safe for all agents)
    if (memoryData.userProfile) {
      sections.push(`## User Context
Name: ${memoryData.userProfile.name || 'Unknown'}
Age: ${memoryData.userProfile.age || 'Unknown'}
Occupation: ${memoryData.userProfile.occupation || 'Unknown'}`)
    }

    // Add repetition prevention context
    if (memoryData.questionsAsked && memoryData.questionsAsked.length > 0) {
      sections.push(`## Previous Questions (Avoid Repetition)
- ${memoryData.questionsAsked.slice(-3).join('\n- ')}`)
    }

    if (memoryData.topicsDiscussed && memoryData.topicsDiscussed.length > 0) {
      sections.push(`## Topics Already Discussed
- ${memoryData.topicsDiscussed.slice(-3).join('\n- ')}`)
    }

    // Add agent-specific knowledge safely
    if (memoryData.agentKnowledge) {
      const validation = this.validateMemoryContent(JSON.stringify(memoryData.agentKnowledge))
      if (validation.isValid) {
        sections.push(`## Conversation History
${JSON.stringify(memoryData.agentKnowledge, null, 2)}`)
      } else {
        console.warn(`⚠️ Memory validation failed for ${this.agentName}:`, validation.issues)
        if (validation.sanitizedContent) {
          sections.push(`## Conversation History (Filtered)
${validation.sanitizedContent}`)
        }
      }
    }

    return sections.join('\n\n')
  }

  /**
   * Validates that enhanced prompt preserves character voice
   */
  validateEnhancedPrompt(originalPrompt: string, enhancedPrompt: string): {
    isValid: boolean
    issues: string[]
    preservesVoice: boolean
  } {
    const issues: string[] = []
    let preservesVoice = true

    // Check that core identity markers are preserved
    for (const marker of this.patterns.coreIdentityMarkers) {
      if (originalPrompt.includes(marker) && !enhancedPrompt.includes(marker)) {
        issues.push(`Lost core identity marker: ${marker}`)
        preservesVoice = false
      }
    }

    // Check that voice patterns are preserved
    for (const pattern of this.patterns.voicePatterns) {
      const originalMatches = originalPrompt.match(pattern)
      const enhancedMatches = enhancedPrompt.match(pattern)
      
      if (originalMatches && (!enhancedMatches || enhancedMatches.length < originalMatches.length)) {
        issues.push(`Lost voice pattern: ${pattern.source}`)
        preservesVoice = false
      }
    }

    // Check for cross-contamination
    const contamination = this.validateMemoryContent(enhancedPrompt)
    if (!contamination.isValid) {
      issues.push(...contamination.issues)
      preservesVoice = false
    }

    return {
      isValid: issues.length === 0,
      issues,
      preservesVoice
    }
  }
}