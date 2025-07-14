import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    console.log('💾 Fetching last conversation and transcript...');
    
    // Get the most recent conversation with a real Ultravox call ID (UUID format)
    const { data: conversations, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .like('ultravox_call_id', '%-%-%-%-%')
      .order('start_time', { ascending: false })
      .limit(1);
    
    console.log('🔍 Database query result:', { conversations, error: fetchError });
    
    if (fetchError) {
      console.error('❌ Database error:', fetchError);
      return NextResponse.json({ error: 'Database error', details: fetchError }, { status: 500 });
    }
    
    if (!conversations || conversations.length === 0) {
      console.error('❌ No conversations found in database');
      return NextResponse.json({ error: 'No conversations found' }, { status: 404 });
    }
    
    const lastConversation = conversations[0];
    console.log('📞 Last conversation:', lastConversation.id);
    
    // Check if we have a ultravox_call_id to fetch from Ultravox
    if (!lastConversation.ultravox_call_id) {
      console.error('❌ No ultravox_call_id found for conversation');
      return NextResponse.json({ error: 'No ultravox_call_id found' }, { status: 400 });
    }
    
    // Fetch transcript from Ultravox API
    console.log('🔍 Fetching from Ultravox API...');
    const messagesResponse = await fetch(`https://api.ultravox.ai/api/calls/${lastConversation.ultravox_call_id}/messages`, {
      headers: {
        'X-API-Key': `${process.env.ULTRAVOX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!messagesResponse.ok) {
      console.error('❌ Failed to fetch from Ultravox:', messagesResponse.status);
      return NextResponse.json({ error: 'Failed to fetch from Ultravox' }, { status: 500 });
    }
    
    const transcriptData = await messagesResponse.json();
    console.log('📝 Transcript fetched, message count:', transcriptData.results?.length);
    
    // Save to full_transcript field
    const { data: updateData, error: updateError } = await supabase
      .from('conversations')
      .update({ 
        full_transcript: transcriptData
      })
      .eq('id', lastConversation.id)
      .select('id');
    
    console.log('📝 Update result:', { updateData, updateError });
    
    if (updateError) {
      console.error('❌ Failed to save transcript:', updateError);
      return NextResponse.json({ error: 'Failed to save transcript', details: updateError }, { status: 500 });
    }
    
    console.log('✅ Transcript saved successfully!');
    return NextResponse.json({ 
      success: true, 
      conversationId: lastConversation.id,
      messageCount: transcriptData.results?.length 
    });
    
  } catch (error) {
    console.error('❌ Error saving transcript:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}