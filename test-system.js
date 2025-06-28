const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSystem() {
  try {
    // Create a test conversation
    console.log('🏗️ Creating test conversation...');
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        ultravox_call_id: '5326b844-4410-4c5f-81f0-104d2adaa631',
        user_name: 'Tadeusz',
        topic: 'jak nie pracować'
      })
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Create error:', createError);
      return;
    }
    
    console.log('✅ Conversation created:', conversation.id);
    
    // Test our API
    console.log('🚀 Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/fetch-ultravox-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: '5326b844-4410-4c5f-81f0-104d2adaa631',
        conversationId: conversation.id
      })
    });
    
    const result = await response.json();
    console.log('🚀 API Result:', result);
    
    // Check database
    console.log('💾 Checking database...');
    const { data: updated, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation.id)
      .single();
      
    if (fetchError) {
      console.log('❌ Fetch error:', fetchError);
      return;
    }
    
    console.log('💾 Database record:');
    console.log('  - Full transcript saved:', updated.full_transcript ? 'YES' : 'NO');
    console.log('  - Recording URL saved:', updated.recording_url ? 'YES' : 'NO');
    console.log('  - Transcript messages:', updated.full_transcript?.results?.length || 0);
    if (updated.recording_url) {
      console.log('  - Recording URL:', updated.recording_url.substring(0, 80) + '...');
    }
    
    console.log('✅ System test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSystem();