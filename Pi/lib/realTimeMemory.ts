import { supabase } from './supabase'
import { saveConversationContext, checkTopicRepetition, checkQuestionRepetition } from './conversationMemory'

// Real-time conversation tracking for ongoing conversations
export class ConversationTracker {
  private conversationId: string
  private recentQuestions: Set<string> = new Set()
  private recentTopics: Set<string> = new Set()
  private agentStatements: { [agent: string]: string[] } = { lars: [], wiktoria: [] }

  constructor(conversationId: string) {
    this.conversationId = conversationId
    this.loadRecentContext()
  }

  private async loadRecentContext() {
    try {
      // Load recent transcripts to populate context
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('*')
        .eq('conversation_id', this.conversationId)
        .order('timestamp', { ascending: false })
        .limit(20)

      transcripts?.forEach(transcript => {
        if (transcript.content.startsWith('[CONTEXT:question_asked]')) {
          try {
            const match = transcript.content.match(/\[CONTEXT:question_asked\] (.*)/)
            if (match) {
              const data = JSON.parse(match[1])
              this.recentQuestions.add(data.question.toLowerCase())
            }
          } catch (e) {
            console.warn('Failed to parse question context:', e)
          }
        }
      })
    } catch (error) {
      console.error('Failed to load conversation context:', error)
    }
  }

  // Track when an agent asks a question
  async trackQuestion(
    question: string, 
    askedBy: 'lars' | 'wiktoria',
    stage: string
  ): Promise<{ shouldAvoid: boolean, reason?: string }> {
    const questionLower = question.toLowerCase()
    
    // Check if question was recently asked
    if (this.recentQuestions.has(questionLower)) {
      return { 
        shouldAvoid: true, 
        reason: 'Question was recently asked in this conversation' 
      }
    }

    // Check for similar questions in the database
    const repetitionCheck = await checkQuestionRepetition(this.conversationId, question)
    if (repetitionCheck.isRepeat) {
      return { 
        shouldAvoid: true, 
        reason: `Similar question asked ${repetitionCheck.previouslyAsked} times before` 
      }
    }

    // Track the question
    this.recentQuestions.add(questionLower)
    await saveConversationContext(
      this.conversationId,
      'question_asked',
      { 
        question,
        answered: false,
        similarity_checked: true
      },
      stage,
      askedBy
    )

    return { shouldAvoid: false }
  }

  // Track when a topic is discussed
  async trackTopic(
    topic: string,
    category: 'politics' | 'technology' | 'culture' | 'personal' | 'philosophy',
    stage: string,
    discussedBy: 'lars' | 'wiktoria' | 'user'
  ): Promise<{ shouldAvoid: boolean, reason?: string, suggestions?: string[] }> {
    const topicLower = topic.toLowerCase()

    // Check if topic was recently discussed
    if (this.recentTopics.has(topicLower)) {
      return { 
        shouldAvoid: true, 
        reason: 'Topic was recently discussed in this conversation',
        suggestions: [`Build upon previous discussion of ${topic}`, `Deepen the analysis of ${topic}`, `Connect ${topic} to new perspectives`]
      }
    }

    // Check for topic repetition in database
    const repetitionCheck = await checkTopicRepetition(this.conversationId, topic)
    if (repetitionCheck.isRepeat) {
      return { 
        shouldAvoid: true, 
        reason: `Topic discussed ${repetitionCheck.previousDiscussions} times before`,
        suggestions: [`Explore a different aspect of ${topic}`, `Connect ${topic} to current events`, `Ask for user's evolved opinion on ${topic}`]
      }
    }

    // Track the topic
    this.recentTopics.add(topicLower)
    await saveConversationContext(
      this.conversationId,
      'topic_covered',
      { 
        category,
        topic,
        depth: 1,
        discussedBy
      },
      stage,
      discussedBy
    )

    return { shouldAvoid: false }
  }

  // Track agent statements to prevent repetition
  async trackStatement(
    statement: string,
    agent: 'lars' | 'wiktoria',
    stage: string,
    context?: { topic?: string, position?: string }
  ): Promise<{ shouldAvoid: boolean, reason?: string }> {
    const recentStatements = this.agentStatements[agent] || []
    
    // Check for similar recent statements
    for (const recentStatement of recentStatements.slice(-5)) {
      if (this.calculateSimilarity(statement, recentStatement) > 0.7) {
        return { 
          shouldAvoid: true, 
          reason: `Similar statement recently made by ${agent}` 
        }
      }
    }

    // Track the statement
    this.agentStatements[agent].push(statement)
    
    // Keep only recent statements in memory
    if (this.agentStatements[agent].length > 10) {
      this.agentStatements[agent] = this.agentStatements[agent].slice(-8)
    }

    await saveConversationContext(
      this.conversationId,
      'agent_statement',
      { 
        statement,
        agent,
        ...context
      },
      stage,
      agent
    )

    return { shouldAvoid: false }
  }

  // Calculate similarity between two strings (simple word overlap)
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/)
    const words2 = str2.toLowerCase().split(/\s+/)
    
    const intersection = words1.filter(word => words2.includes(word))
    const uniqueWords = new Set<string>()
    words1.forEach(word => uniqueWords.add(word))
    words2.forEach(word => uniqueWords.add(word))
    const union = Array.from(uniqueWords)
    
    return intersection.length / union.length
  }

  // Get conversation summary for agents
  async getConversationSummary(): Promise<{
    questionsAsked: string[],
    topicsDiscussed: string[],
    agentPositions: { lars: string[], wiktoria: string[] },
    userPreferences: string[]
  }> {
    const memory = await this.loadFullMemory()
    
    return {
      questionsAsked: Array.from(this.recentQuestions),
      topicsDiscussed: Array.from(this.recentTopics),
      agentPositions: {
        lars: this.agentStatements.lars.slice(-3),
        wiktoria: this.agentStatements.wiktoria.slice(-3)
      },
      userPreferences: memory.userPreferences || []
    }
  }

  private async loadFullMemory() {
    try {
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('*')
        .eq('conversation_id', this.conversationId)
        .order('timestamp', { ascending: true })

      const memory = {
        userPreferences: [] as string[]
      }

      transcripts?.forEach(transcript => {
        if (transcript.content.startsWith('[CONTEXT:user_preference]')) {
          try {
            const match = transcript.content.match(/\[CONTEXT:user_preference\] (.*)/)
            if (match) {
              const data = JSON.parse(match[1])
              if (data.insights) {
                memory.userPreferences.push(data.insights)
              }
            }
          } catch (e) {
            console.warn('Failed to parse user preference:', e)
          }
        }
      })

      return memory
    } catch (error) {
      console.error('Failed to load full memory:', error)
      return { userPreferences: [] }
    }
  }
}

// Helper function to get or create conversation tracker
const trackers: Map<string, ConversationTracker> = new Map()

export function getConversationTracker(conversationId: string): ConversationTracker {
  if (!trackers.has(conversationId)) {
    trackers.set(conversationId, new ConversationTracker(conversationId))
  }
  return trackers.get(conversationId)!
}

// Clean up old trackers (call periodically)
export function cleanupTrackers() {
  if (trackers.size > 50) {
    const oldestKeys = Array.from(trackers.keys()).slice(0, trackers.size - 30)
    oldestKeys.forEach(key => trackers.delete(key))
  }
}