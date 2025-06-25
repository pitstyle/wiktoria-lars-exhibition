import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database Types
export interface Conversation {
  id: string
  ultravox_call_id: string
  user_name: string
  topic: string
  start_time: string
  end_time?: string
  total_messages: number
}

export interface Transcript {
  id: string
  conversation_id: string
  speaker: 'lars' | 'wiktoria' | 'user'
  stage: string
  content: string
  timestamp: string
}

// Database Operations
export async function saveConversation(data: {
  ultravox_call_id: string;
  user_name: string;
  topic: string;
}): Promise<Conversation> {
  const { data: conversation, error } = await supabase
    .from('conversations')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error saving conversation:', error)
    throw error
  }
  
  return conversation
}

export async function saveTranscript(data: {
  conversation_id: string;
  speaker: 'lars' | 'wiktoria' | 'user';
  stage: string;
  content: string;
}): Promise<void> {
  const { error } = await supabase
    .from('transcripts')
    .insert({
      ...data,
      timestamp: new Date().toISOString()
    })

  if (error) {
    console.error('Error saving transcript:', error)
    throw error
  }
}

export async function updateConversationEnd(
  conversationId: string,
  totalMessages: number
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ 
      end_time: new Date().toISOString(),
      total_messages: totalMessages 
    })
    .eq('id', conversationId)

  if (error) {
    console.error('Error updating conversation end:', error)
    throw error
  }
}

export async function getConversations(limit: number = 10): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('start_time', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching conversations:', error)
    throw error
  }

  return data || []
}

export async function searchTranscripts(query: string, limit: number = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('transcripts')
    .select('*, conversations(*)')
    .ilike('content', `%${query}%`)
    .limit(limit)

  if (error) {
    console.error('Error searching transcripts:', error)
    throw error
  }

  return data || []
}