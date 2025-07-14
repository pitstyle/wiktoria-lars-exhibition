import { supabase, saveFullTranscript } from './supabase';

interface IncompleteConversation {
  id: string;
  ultravox_call_id: string;
  start_time: string;
  end_time?: string;
  full_transcript?: any;
  user_name?: string;
  topic?: string;
}

interface CompilerStats {
  totalScanned: number;
  incompleteFound: number;
  successfulSaves: number;
  failedSaves: number;
  errors: string[];
}

export class FailsafeTranscriptCompiler {
  private isRunning = false;
  private lastRunTime: Date | null = null;
  private stats: CompilerStats = {
    totalScanned: 0,
    incompleteFound: 0,
    successfulSaves: 0,
    failedSaves: 0,
    errors: []
  };

  constructor() {
    console.log('🛡️ FailsafeTranscriptCompiler initialized');
  }

  // Main compilation method - runs every 30 seconds
  async compileIncompleteTranscripts(): Promise<CompilerStats> {
    if (this.isRunning) {
      console.log('⚠️ Compiler already running, skipping this cycle');
      return this.stats;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();
    
    // Reset stats for this run
    this.stats = {
      totalScanned: 0,
      incompleteFound: 0,
      successfulSaves: 0,
      failedSaves: 0,
      errors: []
    };

    try {
      console.log('🔍 Starting failsafe transcript compilation...');
      
      // Find conversations without full transcripts from the last 24 hours
      const { data: incompleteConversations, error: queryError } = await supabase
        .from('conversations')
        .select('id, ultravox_call_id, start_time, end_time, full_transcript, user_name, topic')
        .is('full_transcript', null)
        .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('start_time', { ascending: false })
        .limit(50); // Process max 50 at a time

      if (queryError) {
        this.stats.errors.push(`Query error: ${queryError.message}`);
        console.error('❌ Error querying incomplete conversations:', queryError);
        return this.stats;
      }

      this.stats.totalScanned = incompleteConversations?.length || 0;
      console.log(`📊 Found ${this.stats.totalScanned} conversations to scan`);

      if (!incompleteConversations || incompleteConversations.length === 0) {
        console.log('✅ No incomplete transcripts found - all good!');
        return this.stats;
      }

      this.stats.incompleteFound = incompleteConversations.length;
      console.log(`🔧 Found ${this.stats.incompleteFound} incomplete transcripts to process`);

      // Process each incomplete conversation
      for (const conversation of incompleteConversations) {
        await this.processIncompleteConversation(conversation as IncompleteConversation);
      }

      console.log(`✅ Compilation complete - Success: ${this.stats.successfulSaves}, Failed: ${this.stats.failedSaves}`);
      
    } catch (error) {
      console.error('❌ Critical error in failsafe compiler:', error);
      this.stats.errors.push(`Critical error: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }

    return this.stats;
  }

  private async processIncompleteConversation(conversation: IncompleteConversation): Promise<void> {
    console.log(`🔧 Processing incomplete conversation: ${conversation.id} (Call: ${conversation.ultravox_call_id})`);
    
    try {
      let transcriptSaved = false;
      let fullTranscript = null;
      let recordingUrl = null;

      // METHOD 1: Try Ultravox API directly
      if (conversation.ultravox_call_id) {
        try {
          console.log(`🔄 Attempt 1: Fetching from Ultravox API for call ${conversation.ultravox_call_id}`);
          
          const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${conversation.ultravox_call_id}/messages`, {
            headers: {
              'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
            },
          });

          if (messagesResponse.ok) {
            fullTranscript = await messagesResponse.json();
            console.log(`✅ Ultravox API success: ${fullTranscript.results?.length || 0} messages`);
            
            // Try to get recording URL
            try {
              const callResponse = await fetch(`https://api.ultravox.ai/api/calls/${conversation.ultravox_call_id}`, {
                headers: { 'X-API-Key': `${process.env.ULTRAVOX_API_KEY}` }
              });
              if (callResponse.ok) {
                const callData = await callResponse.json();
                recordingUrl = callData.recordingUrl || `https://api.ultravox.ai/api/calls/${conversation.ultravox_call_id}/recording`;
              }
            } catch (recordingError) {
              console.warn('⚠️ Recording URL fetch failed:', (recordingError as Error).message);
            }
            
            await saveFullTranscript(conversation.id, fullTranscript, recordingUrl);
            transcriptSaved = true;
            this.stats.successfulSaves++;
            console.log(`✅ Transcript saved via Ultravox API for conversation ${conversation.id}`);
            
          } else {
            console.warn(`⚠️ Ultravox API failed: ${messagesResponse.status}`);
          }
        } catch (apiError) {
          console.warn(`⚠️ Ultravox API error for ${conversation.ultravox_call_id}:`, (apiError as Error).message);
        }
      }

      // METHOD 2: Try manual compilation from existing transcripts
      if (!transcriptSaved) {
        try {
          console.log(`🔄 Attempt 2: Manual compilation from transcripts for conversation ${conversation.id}`);
          
          const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : (process.env.NODE_ENV === 'production' 
              ? 'https://wiktoria-lars-app.vercel.app' 
              : 'http://localhost:3000');
              
          const compileResponse = await fetch(`${baseUrl}/api/compileTranscript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId: conversation.id })
          });
          
          if (compileResponse.ok) {
            transcriptSaved = true;
            this.stats.successfulSaves++;
            console.log(`✅ Transcript saved via manual compilation for conversation ${conversation.id}`);
          } else {
            console.warn(`⚠️ Manual compilation failed for ${conversation.id}:`, await compileResponse.text());
          }
        } catch (compileError) {
          console.warn(`⚠️ Manual compilation error for ${conversation.id}:`, (compileError as Error).message);
        }
      }

      // METHOD 3: Create recovery transcript from available data
      if (!transcriptSaved) {
        try {
          console.log(`🔄 Attempt 3: Creating recovery transcript for conversation ${conversation.id}`);
          
          // Get existing individual transcripts for this conversation
          const { data: existingTranscripts } = await supabase
            .from('transcripts')
            .select('speaker, content, timestamp, stage')
            .eq('conversation_id', conversation.id)
            .order('timestamp', { ascending: true });
          
          const recoveryTranscript = {
            results: [
              {
                role: 'system',
                text: `Recovery transcript created by failsafe compiler. Original call: ${conversation.ultravox_call_id || 'unknown'}`,
                timestamp: conversation.start_time
              },
              ...(existingTranscripts || []).map(t => ({
                role: t.speaker === 'user' ? 'user' : 'assistant',
                text: t.content,
                timestamp: t.timestamp,
                speaker: t.speaker,
                stage: t.stage
              })),
              {
                role: 'system',
                text: `Conversation involved: ${conversation.user_name || 'unknown user'}, Topic: ${conversation.topic || 'unknown topic'}`,
                timestamp: conversation.end_time || new Date().toISOString()
              }
            ],
            callId: conversation.ultravox_call_id,
            source: 'failsafe_recovery',
            recoveryTime: new Date().toISOString(),
            messageCount: existingTranscripts?.length || 0
          };
          
          await saveFullTranscript(conversation.id, recoveryTranscript, undefined);
          transcriptSaved = true;
          this.stats.successfulSaves++;
          console.log(`✅ Recovery transcript created for conversation ${conversation.id} with ${existingTranscripts?.length || 0} messages`);
          
        } catch (recoveryError) {
          console.error(`❌ Recovery transcript failed for ${conversation.id}:`, recoveryError);
        }
      }

      // METHOD 4: Last resort - empty transcript marker
      if (!transcriptSaved) {
        try {
          console.log(`🔄 Attempt 4: Creating empty transcript marker for conversation ${conversation.id}`);
          
          const emptyTranscript = {
            error: 'No transcript data could be recovered',
            callId: conversation.ultravox_call_id,
            recoveryAttempts: ['ultravox_api_failed', 'manual_compilation_failed', 'recovery_transcript_failed'],
            source: 'failsafe_empty_marker',
            timestamp: new Date().toISOString(),
            conversationMetadata: {
              userName: conversation.user_name,
              topic: conversation.topic,
              startTime: conversation.start_time,
              endTime: conversation.end_time
            }
          };
          
          await saveFullTranscript(conversation.id, emptyTranscript, undefined);
          this.stats.successfulSaves++;
          console.log(`✅ Empty transcript marker saved for conversation ${conversation.id}`);
          
        } catch (emptyError) {
          console.error(`❌ Even empty transcript marker failed for ${conversation.id}:`, emptyError);
          this.stats.failedSaves++;
          this.stats.errors.push(`Total failure for conversation ${conversation.id}: ${(emptyError as Error).message}`);
        }
      }

    } catch (error) {
      console.error(`❌ Error processing conversation ${conversation.id}:`, error);
      this.stats.failedSaves++;
      this.stats.errors.push(`Conversation ${conversation.id}: ${(error as Error).message}`);
    }
  }

  // Periodic monitoring method
  async startPeriodicCompilation(intervalSeconds: number = 30): Promise<void> {
    console.log(`🔄 Starting periodic transcript compilation every ${intervalSeconds} seconds`);
    
    const runCompilation = async () => {
      try {
        const stats = await this.compileIncompleteTranscripts();
        
        if (stats.incompleteFound > 0) {
          console.log(`📊 Periodic compilation stats: ${stats.successfulSaves}/${stats.incompleteFound} successful`);
        }
        
        if (stats.errors.length > 0) {
          console.error('❌ Compilation errors:', stats.errors);
        }
        
      } catch (error) {
        console.error('❌ Error in periodic compilation:', error);
      }
    };

    // Run immediately
    await runCompilation();
    
    // Then run periodically
    setInterval(runCompilation, intervalSeconds * 1000);
  }

  // Get current stats
  getStats(): CompilerStats & { lastRunTime: Date | null, isRunning: boolean } {
    return {
      ...this.stats,
      lastRunTime: this.lastRunTime,
      isRunning: this.isRunning
    };
  }

  // Manual trigger for testing
  async forceCompilation(): Promise<CompilerStats> {
    console.log('🔧 Manual compilation triggered');
    return await this.compileIncompleteTranscripts();
  }
}

// Global instance
export const failsafeCompiler = new FailsafeTranscriptCompiler();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  // Start compilation with 30-second intervals
  failsafeCompiler.startPeriodicCompilation(30);
  console.log('🛡️ Failsafe transcript compiler started in production mode');
}