import { supabase } from './supabase'

// Enhanced conversation memory types
export interface ConversationContext {
  conversationId: string
  contextType: 'user_info' | 'topic_covered' | 'agent_statement' | 'user_preference' | 'question_asked'
  contextData: any
  stage: string
  createdBy: 'lars' | 'wiktoria' | 'user' | 'system'
  timestamp: string
}

export interface TopicCoverage {
  conversationId: string
  topicCategory: 'politics' | 'technology' | 'culture' | 'personal' | 'philosophy'
  specificTopic: string
  depthLevel: number
  discussionCount: number
  keyPoints: string[]
  lastDiscussed: string
}

export interface ConversationMemory {
  conversationId: string
  userProfile: {
    name: string
    age: string
    occupation: string
    preferences: string[]
    politicalViews: string[]
  }
  topicsDiscussed: TopicCoverage[]
  questionsAsked: {
    question: string
    askedBy: string
    answered: boolean
    timestamp: string
  }[]
  agentPositions: {
    lars: string[]
    wiktoria: string[]
  }
  conversationFlow: {
    stage: string
    duration: number
    keyMoments: string[]
  }[]
}

// Memory storage functions using existing tables
export async function saveConversationContext(
  conversationId: string,
  contextType: ConversationContext['contextType'],
  contextData: any,
  stage: string,
  createdBy: ConversationContext['createdBy']
): Promise<void> {
  // Store context in the transcript table with special markers
  await supabase
    .from('transcripts')
    .insert({
      conversation_id: conversationId,
      speaker: createdBy,
      stage: stage,
      content: `[CONTEXT:${contextType}] ${JSON.stringify(contextData)}`,
      timestamp: new Date().toISOString()
    })
}

export async function getConversationMemory(
  conversationId: string
): Promise<ConversationMemory | null> {
  // Get all transcripts and conversations for this conversation
  const { data: transcripts, error: transcriptError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true })

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  if (transcriptError || conversationError || !conversation) {
    console.error('Error fetching conversation memory:', transcriptError || conversationError)
    return null
  }

  // Parse memory from transcripts and conversation data
  const memory: ConversationMemory = {
    conversationId,
    userProfile: {
      name: conversation.user_name || '',
      age: '',
      occupation: '',
      preferences: [],
      politicalViews: []
    },
    topicsDiscussed: [],
    questionsAsked: [],
    agentPositions: {
      lars: [],
      wiktoria: []
    },
    conversationFlow: []
  }

  // Parse context from transcripts
  transcripts?.forEach(transcript => {
    if (transcript.content.startsWith('[CONTEXT:')) {
      try {
        const contextMatch = transcript.content.match(/\[CONTEXT:(\w+)\] (.*)/)
        if (contextMatch) {
          const contextType = contextMatch[1]
          const contextData = JSON.parse(contextMatch[2])
          
          switch (contextType) {
            case 'user_info':
              if (contextData.age) memory.userProfile.age = contextData.age
              if (contextData.occupation) memory.userProfile.occupation = contextData.occupation
              break
            case 'topic_covered':
              memory.topicsDiscussed.push({
                conversationId,
                topicCategory: contextData.category || 'personal',
                specificTopic: contextData.topic,
                depthLevel: contextData.depth || 1,
                discussionCount: 1,
                keyPoints: contextData.keyPoints || [],
                lastDiscussed: transcript.timestamp
              })
              break
            case 'question_asked':
              memory.questionsAsked.push({
                question: contextData.question,
                askedBy: transcript.speaker,
                answered: contextData.answered || false,
                timestamp: transcript.timestamp
              })
              break
            case 'agent_statement':
              if (transcript.speaker === 'lars') {
                memory.agentPositions.lars.push(contextData.position || transcript.content)
              } else if (transcript.speaker === 'wiktoria') {
                memory.agentPositions.wiktoria.push(contextData.position || transcript.content)
              }
              break
          }
        }
      } catch (e) {
        console.warn('Failed to parse context:', e)
      }
    }
  })

  return memory
}

export async function checkTopicRepetition(
  conversationId: string,
  topic: string
): Promise<{ isRepeat: boolean, previousDiscussions: number, lastDiscussed?: string }> {
  const memory = await getConversationMemory(conversationId)
  if (!memory) return { isRepeat: false, previousDiscussions: 0 }

  const topicDiscussions = memory.topicsDiscussed.filter(
    t => t.specificTopic.toLowerCase().includes(topic.toLowerCase())
  )

  return {
    isRepeat: topicDiscussions.length > 0,
    previousDiscussions: topicDiscussions.length,
    lastDiscussed: topicDiscussions[topicDiscussions.length - 1]?.lastDiscussed
  }
}

export async function checkQuestionRepetition(
  conversationId: string,
  question: string
): Promise<{ isRepeat: boolean, previouslyAsked: number, lastAsked?: string }> {
  const memory = await getConversationMemory(conversationId)
  if (!memory) return { isRepeat: false, previouslyAsked: 0 }

  const similarQuestions = memory.questionsAsked.filter(
    q => q.question.toLowerCase().includes(question.toLowerCase()) ||
        question.toLowerCase().includes(q.question.toLowerCase())
  )

  return {
    isRepeat: similarQuestions.length > 0,
    previouslyAsked: similarQuestions.length,
    lastAsked: similarQuestions[similarQuestions.length - 1]?.timestamp
  }
}

export async function getAgentKnowledge(
  conversationId: string,
  agentName: 'lars' | 'wiktoria'
): Promise<{
  userInfo: any,
  previousStatements: string[],
  topicsDiscussed: string[],
  questionsToAvoid: string[]
}> {
  const memory = await getConversationMemory(conversationId)
  if (!memory) {
    return {
      userInfo: {},
      previousStatements: [],
      topicsDiscussed: [],
      questionsToAvoid: []
    }
  }

  return {
    userInfo: memory.userProfile,
    previousStatements: memory.agentPositions[agentName] || [],
    topicsDiscussed: memory.topicsDiscussed.map(t => t.specificTopic),
    questionsToAvoid: memory.questionsAsked
      .filter(q => q.askedBy === agentName)
      .map(q => q.question)
  }
}

export async function enhanceAgentPrompt(
  basePrompt: string,
  conversationId: string,
  agentName: 'lars' | 'wiktoria',
  currentStage: string
): Promise<string> {
  // EMERGENCY FIX: Disable prompt enhancement to prevent character corruption
  // The memory system was causing character voice mixing
  // TODO: Implement safe character-preserving memory enhancement
  
  console.log(`⚠️ Memory enhancement disabled for ${agentName} to preserve character integrity`)
  
  // Return original prompt unchanged to maintain character voices
  return basePrompt
}

// Helper function to track conversation flow
export async function trackConversationStage(
  conversationId: string,
  stage: string,
  duration: number,
  keyMoments: string[] = []
): Promise<void> {
  await saveConversationContext(
    conversationId,
    'agent_statement',
    {
      stage,
      duration,
      keyMoments,
      timestamp: new Date().toISOString()
    },
    stage,
    'system'
  )
}