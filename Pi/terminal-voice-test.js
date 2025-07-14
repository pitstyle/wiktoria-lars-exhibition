#!/usr/bin/env node

// Terminal Voice Test for Pi - Direct Ultravox WebSocket Connection
// Run: node terminal-voice-test.js

const WebSocket = require('ws');
const { createReadStream } = require('fs');
const { spawn } = require('child_process');

// Configuration - Update with your values
const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY || 's0ybpQ0H.nIiU1cIDzg26xUu4y6otRzIUMtFg07EH';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

class TerminalVoiceTest {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.callId = null;
    this.conversationActive = false;
  }

  async startCall() {
    try {
      console.log('🎯 Starting Ultravox call...');
      
      // Create call using your existing config
      const response = await fetch('https://api.ultravox.ai/api/calls', {
        method: 'POST',
        headers: {
          'X-API-Key': ULTRAVOX_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: await this.getLarsPrompt(),
          model: 'fixie-ai/ultravox-70B',
          voice: '876ac038-08f0-4485-8b20-02b42bcf3416', // Lars voice
          languageHint: 'pl',
          temperature: 0.8,
          maxDuration: '480s',
          timeExceededMessage: 'Dziękuję za rozmowę! Nasza debata polityczna dobiegła końca. Do zobaczenia!'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create call: ${response.status}`);
      }

      const call = await response.json();
      this.callId = call.callId;
      
      console.log(`✅ Call created: ${this.callId}`);
      console.log(`🔗 WebSocket URL: ${call.joinUrl}`);
      
      // Connect to WebSocket
      await this.connectWebSocket(call.joinUrl);
      
    } catch (error) {
      console.error('❌ Error starting call:', error);
    }
  }

  async connectWebSocket(joinUrl) {
    try {
      console.log('🔌 Connecting to WebSocket...');
      
      this.ws = new WebSocket(joinUrl);
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected');
        console.log('🎤 Voice detection active - speak into headphones!');
        console.log('📞 Conversation started - Lars will greet you');
        this.isConnected = true;
        this.conversationActive = true;
        
        // Play connection tone
        this.playTone();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('🔚 WebSocket disconnected');
        this.isConnected = false;
        this.conversationActive = false;
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

    } catch (error) {
      console.error('❌ Error connecting WebSocket:', error);
    }
  }

  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'message':
        if (message.role === 'assistant') {
          console.log(`🤖 ${message.speaker || 'AI'}: ${message.text}`);
        } else if (message.role === 'user') {
          console.log(`👤 You: ${message.text}`);
        }
        break;
        
      case 'transcript':
        console.log(`📝 Transcript: ${message.text}`);
        break;
        
      case 'tool_call':
        console.log(`🔧 Tool called: ${message.toolName}`);
        this.handleToolCall(message);
        break;
        
      case 'call_ended':
        console.log('📞 Call ended');
        this.conversationActive = false;
        this.saveTranscript();
        break;
        
      default:
        console.log(`📨 Message: ${message.type}`, message);
    }
  }

  async handleToolCall(message) {
    try {
      const { toolName, parameters } = message;
      console.log(`🔧 Handling tool: ${toolName}`);
      
      // Forward tool calls to your API endpoints
      const response = await fetch(`${BASE_URL}/api/${toolName}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-ultravox-call-id': this.callId
        },
        body: JSON.stringify(parameters)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Tool ${toolName} completed:`, result);
      } else {
        console.error(`❌ Tool ${toolName} failed:`, await response.text());
      }
      
    } catch (error) {
      console.error(`❌ Error handling tool ${message.toolName}:`, error);
    }
  }

  async saveTranscript() {
    try {
      console.log('💾 Saving transcript...');
      
      const response = await fetch(`${BASE_URL}/api/endCall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callId: this.callId,
          status: 'completed',
          source: 'terminal_test'
        })
      });
      
      if (response.ok) {
        console.log('✅ Transcript saved to Supabase');
      } else {
        console.error('❌ Failed to save transcript');
      }
      
    } catch (error) {
      console.error('❌ Error saving transcript:', error);
    }
  }

  playTone() {
    // Simple tone using system audio
    try {
      spawn('speaker-test', ['-t', 'sine', '-f', '800', '-l', '1', '-s', '1'], { stdio: 'ignore' });
    } catch (error) {
      console.log('🔔 Connection tone (audio not available)');
    }
  }

  async getLarsPrompt() {
    // Use your existing Lars prompt
    return `# LARS - Initial Information Collector

**CRITICAL**: If user speaks Polish, respond in Polish. If user speaks English, respond in English.

## Your Mission
1. Start with introducing yourself and the AI political performance debate idea
2. Inform about recording: "Informuję, że ta rozmowa jest nagrywana, a dane z niej mogą zostać w przyszłości wykorzystane do celów artystycznych i badawczych."
3. Collect user's name, age, occupation, and topic for discussion
4. Provide controversial opinion from Synthetic Party perspective
5. Transfer to Wiktoria using transferToWiktoria tool

Keep responses 120-250 words, use "tak, tak" naturally, complete thoughts fully.

Voice interaction - speak conversationally and naturally.`;
  }

  async getTools() {
    return [
      {
        name: 'transferToWiktoria',
        description: 'Transfer conversation to Wiktoria after collecting user info',
        parameters: {
          type: 'object',
          properties: {
            userName: { type: 'string' },
            age: { type: 'string' },
            occupation: { type: 'string' },
            topic: { type: 'string' }
          },
          required: ['userName', 'topic']
        }
      }
    ];
  }

  async endCall() {
    if (this.ws && this.isConnected) {
      console.log('🔚 Ending call...');
      this.ws.close();
      await this.saveTranscript();
    }
  }
}

// Main execution
async function main() {
  console.log('🎯 Terminal Voice Test for Pi');
  console.log('=====================================');
  console.log('Requirements:');
  console.log('- Headphones connected to Pi');
  console.log('- Audio configured (aplay/arecord working)');
  console.log('- ULTRAVOX_API_KEY set');
  console.log('- Next.js app running on localhost:3000');
  console.log('=====================================');
  
  const test = new TerminalVoiceTest();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await test.endCall();
    process.exit(0);
  });
  
  // Start the call
  await test.startCall();
  
  // Keep process alive
  setInterval(() => {
    if (test.conversationActive) {
      process.stdout.write('.');
    }
  }, 5000);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TerminalVoiceTest;