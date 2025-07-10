const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ultravoxKey = process.env.ULTRAVOX_API_KEY;

if (!supabaseUrl || !supabaseKey || !ultravoxKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const fixOrphanedTranscripts = async () => {
  console.log('🔄 Fixing orphaned transcripts...');
  
  try {
    // Get orphaned conversations from last 6 hours
    const { data: orphaned, error } = await supabase
      .from('conversations')
      .select('id, ultravox_call_id, user_name, topic, start_time')
      .is('end_time', null)
      .is('full_transcript', null)
      .gte('start_time', new Date(Date.now() - 6*60*60*1000).toISOString());
    
    if (error) {
      console.error('❌ Error fetching orphaned conversations:', error);
      return;
    }
    
    console.log(`📋 Found ${orphaned.length} orphaned conversations`);
    
    for (const conv of orphaned) {
      console.log(`🔄 Processing: ${conv.user_name} - ${conv.topic} (${conv.ultravox_call_id})`);
      
      try {
        // Try to fetch transcript from Ultravox
        const response = await fetch(`https://api.ultravox.ai/api/calls/${conv.ultravox_call_id}/messages`, {
          headers: {
            'X-API-Key': ultravoxKey,
          },
        });
        
        if (response.ok) {
          const transcript = await response.json();
          console.log(`✅ Fetched ${transcript.results?.length || 0} messages`);
          
          // Save to database
          const { error: saveError } = await supabase
            .from('conversations')
            .update({
              full_transcript: transcript,
              end_time: new Date().toISOString(),
              total_messages: transcript.results?.length || 0
            })
            .eq('id', conv.id);
          
          if (saveError) {
            console.error(`❌ Error saving transcript for ${conv.ultravox_call_id}:`, saveError);
          } else {
            console.log(`✅ Saved transcript for ${conv.user_name} - ${conv.topic}`);
          }
        } else {
          console.log(`⚠️ No transcript available for ${conv.ultravox_call_id}: ${response.status}`);
        }
      } catch (err) {
        console.error(`❌ Error processing ${conv.ultravox_call_id}:`, err.message);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('🎉 Orphaned transcript fix completed!');
  } catch (error) {
    console.error('❌ General error:', error);
  }
};

fixOrphanedTranscripts();