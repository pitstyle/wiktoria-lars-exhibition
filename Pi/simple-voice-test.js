#!/usr/bin/env node

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY || 's0ybpQ0H.nIiU1cIDzg26xUu4y6otRzIUMtFg07EH';

async function testCall() {
  console.log('Testing Ultravox API...');
  
  try {
    // Minimal call creation
    const response = await fetch('https://api.ultravox.ai/api/calls', {
      method: 'POST',
      headers: {
        'X-API-Key': ULTRAVOX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemPrompt: "You are Lars. Say hello in Polish and ask for the user's name.",
        model: 'fixie-ai/ultravox-70B',
        voice: '876ac038-08f0-4485-8b20-02b42bcf3416',
        languageHint: 'pl'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error ${response.status}:`, errorText);
      return;
    }

    const call = await response.json();
    console.log('✅ Call created successfully!');
    console.log('Call ID:', call.callId);
    console.log('Join URL:', call.joinUrl);
    
  } catch (error) {
    console.error('Failed:', error);
  }
}

testCall();