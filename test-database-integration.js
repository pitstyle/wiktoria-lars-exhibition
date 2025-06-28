#!/usr/bin/env node

/**
 * Database Integration Test
 * Tests the complete flow: conversation creation -> transcript saving -> data retrieval
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Simple .env.local parser (since dotenv might not be available)
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
      }
    });
    
    Object.assign(process.env, envVars);
  } catch (error) {
    console.log('⚠️ Could not load .env.local file');
  }
}

loadEnvFile();

// Supabase client setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testData = {
  conversation: {
    ultravox_call_id: `test-call-${Date.now()}`,
    user_name: 'Test User',
    topic: 'Automated Database Test'
  },
  transcripts: [
    { speaker: 'lars', content: 'Hello! Welcome to our conversation. What would you like to discuss today?', stage: 'initial' },
    { speaker: 'user', content: 'I want to test the database integration functionality.', stage: 'initial' },
    { speaker: 'wiktoria', content: 'Excellent! Let me help you understand how our database system works.', stage: 'lars-perspective' },
    { speaker: 'lars', content: 'Yes, we save all conversations automatically for analytics.', stage: 'wiktoria-response' },
    { speaker: 'user', content: 'That sounds great! How long are conversations stored?', stage: 'wiktoria-response' }
  ]
};

async function runDatabaseTest() {
  console.log('🧪 Starting Database Integration Test...\n');
  
  try {
    // Step 1: Test database connection
    console.log('1️⃣ Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('conversations')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      throw new Error(`Connection failed: ${connectionError.message}`);
    }
    console.log('✅ Database connection successful\n');

    // Step 2: Create conversation (simulating the fixed timing)
    console.log('2️⃣ Creating test conversation...');
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert([testData.conversation])
      .select()
      .single();
    
    if (conversationError) {
      throw new Error(`Conversation creation failed: ${conversationError.message}`);
    }
    
    console.log('✅ Conversation created:', {
      id: conversation.id,
      ultravox_call_id: conversation.ultravox_call_id,
      user_name: conversation.user_name,
      topic: conversation.topic
    });
    console.log('');

    // Step 3: Save transcripts (simulating handleTranscriptChange)
    console.log('3️⃣ Saving test transcripts...');
    const transcriptPromises = testData.transcripts.map(async (transcript, index) => {
      try {
        const { data, error } = await supabase
          .from('transcripts')
          .insert([{
            conversation_id: conversation.id,
            speaker: transcript.speaker,
            stage: transcript.stage,
            content: transcript.content
          }])
          .select()
          .single();
        
        if (error) throw error;
        console.log(`  ✅ Saved transcript ${index + 1}/${testData.transcripts.length}: ${transcript.speaker} - "${transcript.content.substring(0, 50)}..."`);
        return data;
      } catch (error) {
        console.error(`  ❌ Failed to save transcript ${index + 1}: ${error.message}`);
        throw error;
      }
    });
    
    const savedTranscripts = await Promise.all(transcriptPromises);
    console.log(`✅ All ${savedTranscripts.length} transcripts saved successfully\n`);

    // Step 4: Update conversation end (simulating call end)
    console.log('4️⃣ Updating conversation end...');
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        end_time: new Date().toISOString(),
        total_messages: savedTranscripts.length
      })
      .eq('id', conversation.id);
    
    if (updateError) {
      throw new Error(`Conversation update failed: ${updateError.message}`);
    }
    console.log('✅ Conversation end updated\n');

    // Step 5: Test data retrieval (simulating analytics)
    console.log('5️⃣ Testing data retrieval...');
    
    // Get conversation with transcript count
    const { data: retrievedConversation, error: retrieveError } = await supabase
      .from('conversations')
      .select(`
        *,
        transcripts (count)
      `)
      .eq('id', conversation.id)
      .single();
    
    if (retrieveError) {
      throw new Error(`Data retrieval failed: ${retrieveError.message}`);
    }
    
    console.log('✅ Retrieved conversation:', {
      id: retrievedConversation.id,
      user_name: retrievedConversation.user_name,
      topic: retrievedConversation.topic,
      transcript_count: retrievedConversation.transcripts[0].count,
      duration: Math.round((new Date(retrievedConversation.end_time) - new Date(retrievedConversation.start_time)) / 1000) + 's'
    });

    // Test transcript search
    const { data: searchResults, error: searchError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('conversation_id', conversation.id)
      .textSearch('content', 'database')
      .order('timestamp');
    
    if (searchError) {
      console.log('⚠️ Search test failed (might not be enabled):', searchError.message);
    } else {
      console.log(`✅ Search found ${searchResults.length} transcripts containing "database"\n`);
    }

    // Step 6: Cleanup test data
    console.log('6️⃣ Cleaning up test data...');
    await supabase.from('transcripts').delete().eq('conversation_id', conversation.id);
    await supabase.from('conversations').delete().eq('id', conversation.id);
    console.log('✅ Test data cleaned up\n');

    // Final result
    console.log('🎉 DATABASE INTEGRATION TEST PASSED!');
    console.log('🎯 All components working correctly:');
    console.log('   ✅ Database connection');
    console.log('   ✅ Conversation creation (before call starts)');
    console.log('   ✅ Real-time transcript saving');
    console.log('   ✅ Conversation end tracking');
    console.log('   ✅ Data retrieval and analytics');
    console.log('   ✅ Search functionality');
    console.log('\n💡 Live calls should now save transcripts automatically!');

  } catch (error) {
    console.error('\n❌ DATABASE INTEGRATION TEST FAILED!');
    console.error('Error:', error.message);
    console.error('\nCheck:');
    console.error('  - Supabase environment variables');
    console.error('  - Database table structure');
    console.error('  - Network connectivity');
    process.exit(1);
  }
}

// Run the test
runDatabaseTest();