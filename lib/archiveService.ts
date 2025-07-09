import { supabase, saveConversation, saveTranscript, updateConversationEnd, saveFullTranscript } from './supabase';

// Archive service that works in all environments
export class ArchiveService {
  private static instance: ArchiveService;
  private conversationCache: Map<string, { id: string; callId: string; transcriptEntries: any[] }> = new Map();

  private constructor() {}

  public static getInstance(): ArchiveService {
    if (!ArchiveService.instance) {
      ArchiveService.instance = new ArchiveService();
    }
    return ArchiveService.instance;
  }

  // Create or get conversation record
  async ensureConversation(callId: string, userName?: string, topic?: string): Promise<string> {
    console.log(`🔍 ensureConversation called with callId: ${callId}, userName: ${userName}, topic: ${topic}`);
    
    // Check if conversation already exists in cache (try both call ID formats)
    let cached = this.conversationCache.get(callId);
    
    // If not found, try to find by userName to handle different call ID formats
    if (!cached && userName && userName !== 'Unknown' && userName !== 'Anonymous User') {
      for (const [cachedCallId, cachedConv] of this.conversationCache.entries()) {
        // Check if there's a cached conversation for this user in recent time
        const timeDiff = Date.now() - new Date(cachedConv.transcriptEntries[0]?.timestamp || 0).getTime();
        if (timeDiff < 30 * 60 * 1000) { // 30 minutes
          // Try to get the actual conversation to check user name
          try {
            const { data: convData } = await supabase
              .from('conversations')
              .select('user_name')
              .eq('id', cachedConv.id)
              .single();
            
            if (convData?.user_name === userName) {
              console.log(`✅ Found cached conversation by userName: ${cachedConv.id}`);
              // Cache the new call ID to the same conversation
              this.conversationCache.set(callId, cachedConv);
              return cachedConv.id;
            }
          } catch (error) {
            // Continue searching
          }
        }
      }
    }
    
    if (cached) {
      console.log(`✅ Found cached conversation: ${cached.id}`);
      return cached.id;
    }

    try {
      // FIRST: Check if conversation exists in database by call ID
      const { data: existing, error: selectError } = await supabase
        .from('conversations')
        .select('id, user_name, topic, ultravox_call_id')
        .eq('ultravox_call_id', callId)
        .single();

      // SECOND: If not found by call ID, check for active conversations by user name
      // This prevents creating duplicates when Ultravox uses different call IDs
      if (!existing && userName && userName !== 'Unknown' && userName !== 'Anonymous User') {
        const { data: activeConversations, error: activeError } = await supabase
          .from('conversations')
          .select('id, user_name, topic, ultravox_call_id')
          .eq('user_name', userName)
          .is('end_time', null) // Only active conversations
          .gte('start_time', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
          .order('start_time', { ascending: false })
          .limit(1);

        if (activeConversations && activeConversations.length > 0) {
          const activeConv = activeConversations[0];
          console.log(`🚫 DUPLICATE PREVENTION: Found active conversation for ${userName}, using existing ${activeConv.id} instead of creating new one`);
          console.log(`🔗 Linking call IDs: existing=${activeConv.ultravox_call_id}, new=${callId}`);
          
          // DON'T update the ultravox_call_id - keep the original
          // Just cache the new call ID to link to the existing conversation
          this.conversationCache.set(callId, {
            id: activeConv.id,
            callId: activeConv.ultravox_call_id, // Use original call ID
            transcriptEntries: []
          });
          
          // Also cache the original call ID if not already cached
          if (!this.conversationCache.has(activeConv.ultravox_call_id)) {
            this.conversationCache.set(activeConv.ultravox_call_id, {
              id: activeConv.id,
              callId: activeConv.ultravox_call_id,
              transcriptEntries: []
            });
          }
          
          return activeConv.id;
        }
      }

      if (existing) {
        // Update existing conversation with name and topic if provided
        const updates: any = {};
        
        if (userName && userName !== 'Unknown' && userName !== 'Anonymous User' && 
            (!existing.user_name || existing.user_name === 'Unknown' || existing.user_name === 'Anonymous User')) {
          updates.user_name = userName;
        }
        
        if (topic && topic !== 'Unknown' && topic !== 'General Discussion' && 
            (!existing.topic || existing.topic === 'Unknown' || existing.topic === 'General Discussion')) {
          updates.topic = topic;
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('conversations')
            .update(updates)
            .eq('id', existing.id);
          
          console.log(`✅ Updated conversation ${existing.id} with:`, updates);
        }

        // Update cache
        this.conversationCache.set(callId, {
          id: existing.id,
          callId,
          transcriptEntries: []
        });
        return existing.id;
      }


      // Create new conversation
      const conversation = await saveConversation({
        ultravox_call_id: callId,
        user_name: userName || 'Anonymous User',
        topic: topic || 'General Discussion'
      });

      // Cache the conversation
      this.conversationCache.set(callId, {
        id: conversation.id,
        callId,
        transcriptEntries: []
      });

      console.log(`✅ Created conversation: ${conversation.id} for call: ${callId}`);
      return conversation.id;

    } catch (error) {
      console.error('Error ensuring conversation:', error);
      throw error;
    }
  }

  // Save transcript entry
  async saveTranscriptEntry(
    callId: string,
    speaker: 'lars' | 'wiktoria' | 'user',
    stage: string,
    content: string,
    userName?: string,
    topic?: string
  ): Promise<void> {
    try {
      // Ensure conversation exists
      const conversationId = await this.ensureConversation(callId, userName, topic);

      // Save transcript entry
      await saveTranscript({
        conversation_id: conversationId,
        speaker,
        stage,
        content
      });

      // Update cache
      const cached = this.conversationCache.get(callId);
      if (cached) {
        cached.transcriptEntries.push({
          speaker,
          stage,
          content,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`✅ Saved transcript entry: ${speaker} in ${stage}`);

    } catch (error) {
      console.error('Error saving transcript entry:', error);
      // Don't throw - we don't want to break the conversation flow
    }
  }

  // Save multiple transcript entries at once
  async saveTranscriptBatch(
    callId: string,
    entries: Array<{
      speaker: 'lars' | 'wiktoria' | 'user';
      stage: string;
      content: string;
    }>,
    userName?: string,
    topic?: string
  ): Promise<void> {
    try {
      // Ensure conversation exists
      const conversationId = await this.ensureConversation(callId, userName, topic);

      // Save all entries
      for (const entry of entries) {
        await saveTranscript({
          conversation_id: conversationId,
          ...entry
        });
      }

      console.log(`✅ Saved ${entries.length} transcript entries in batch`);

    } catch (error) {
      console.error('Error saving transcript batch:', error);
      // Don't throw - we don't want to break the conversation flow
    }
  }

  // Update conversation with final details
  async finalizeConversation(
    callId: string,
    fullTranscript?: any,
    recordingUrl?: string
  ): Promise<void> {
    try {
      const conversationId = await this.ensureConversation(callId);
      
      // Get conversation details for duplicate detection
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('user_name, topic')
        .eq('id', conversationId)
        .single();

      // Count total messages
      const cached = this.conversationCache.get(callId);
      const totalMessages = cached ? cached.transcriptEntries.length : 0;

      // Update conversation end
      await updateConversationEnd(conversationId, totalMessages);

      // Save full transcript if provided
      if (fullTranscript) {
        await saveFullTranscript(conversationId, fullTranscript, recordingUrl);
      }

      console.log(`✅ Finalized conversation: ${conversationId}`);

      // Clean up duplicates if we have user and topic info
      if (conversation && conversation.user_name && conversation.topic) {
        await this.mergeDuplicateConversations(conversation.user_name, conversation.topic);
      }

      // Clean up cache
      this.conversationCache.delete(callId);

    } catch (error) {
      console.error('Error finalizing conversation:', error);
      // Don't throw - we don't want to break the conversation flow
    }
  }

  // Archive conversation data from context
  async archiveFromContext(
    callId: string,
    contextData: {
      userName?: string;
      topic?: string;
      userInsights?: string;
      wiktoriaOpinion?: string;
      larsPerspective?: string;
      stage?: string;
      currentSpeaker?: 'lars' | 'wiktoria' | 'user';
    }
  ): Promise<void> {
    try {
      const { userName, topic, userInsights, wiktoriaOpinion, larsPerspective, stage, currentSpeaker } = contextData;

      // Ensure conversation exists
      await this.ensureConversation(callId, userName, topic);

      // Archive user insights if available
      if (userInsights && userInsights.length > 10) {
        await this.saveTranscriptEntry(
          callId,
          'user',
          stage || 'user_response',
          userInsights,
          userName,
          topic
        );
      }

      // Archive Wiktoria's opinion if available
      if (wiktoriaOpinion && wiktoriaOpinion.length > 10) {
        await this.saveTranscriptEntry(
          callId,
          'wiktoria',
          stage || 'wiktoria_opinion',
          wiktoriaOpinion,
          userName,
          topic
        );
      }

      // Archive Lars's perspective if available
      if (larsPerspective && larsPerspective.length > 10) {
        await this.saveTranscriptEntry(
          callId,
          'lars',
          stage || 'lars_perspective',
          larsPerspective,
          userName,
          topic
        );
      }

      console.log(`✅ Archived context data for conversation: ${callId}`);

    } catch (error) {
      console.error('Error archiving from context:', error);
      // Don't throw - we don't want to break the conversation flow
    }
  }

  // Get conversation statistics
  async getConversationStats(callId: string): Promise<any> {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select('*, transcripts(*)')
        .eq('ultravox_call_id', callId)
        .single();

      if (error) throw error;

      return {
        id: conversation.id,
        callId,
        userName: conversation.user_name,
        topic: conversation.topic,
        startTime: conversation.start_time,
        endTime: conversation.end_time,
        totalMessages: conversation.total_messages,
        transcriptEntries: conversation.transcripts?.length || 0
      };

    } catch (error) {
      console.error('Error getting conversation stats:', error);
      return null;
    }
  }

  // Merge duplicate conversations (cleanup method)
  async mergeDuplicateConversations(userName: string, topic: string): Promise<void> {
    try {
      // Find all conversations with same user and topic from recent period
      const { data: duplicates, error } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, user_name, topic, start_time, end_time, full_transcript, recording_url, total_messages')
        .eq('user_name', userName)
        .eq('topic', topic)
        .gte('start_time', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes
        .order('start_time', { ascending: true });

      if (error || !duplicates || duplicates.length < 2) {
        return; // No duplicates to merge
      }

      // Keep the first conversation as primary
      const primaryConv = duplicates[0];
      const duplicateConvs = duplicates.slice(1);

      console.log(`🔄 Merging ${duplicateConvs.length} duplicate conversations for ${userName} into ${primaryConv.id}`);

      for (const duplicate of duplicateConvs) {
        // Move all transcripts from duplicate to primary
        await supabase
          .from('transcripts')
          .update({ conversation_id: primaryConv.id })
          .eq('conversation_id', duplicate.id);

        // If primary doesn't have transcript but duplicate does, copy it
        if (!primaryConv.full_transcript && duplicate.full_transcript) {
          await supabase
            .from('conversations')
            .update({ 
              full_transcript: duplicate.full_transcript,
              recording_url: duplicate.recording_url,
              total_messages: duplicate.total_messages,
              end_time: duplicate.end_time
            })
            .eq('id', primaryConv.id);
        }

        // Delete the duplicate conversation
        await supabase
          .from('conversations')
          .delete()
          .eq('id', duplicate.id);

        console.log(`✅ Merged and deleted duplicate conversation: ${duplicate.id}`);
      }

    } catch (error) {
      console.error('Error merging duplicate conversations:', error);
    }
  }
}

// Export singleton instance
export const archiveService = ArchiveService.getInstance();