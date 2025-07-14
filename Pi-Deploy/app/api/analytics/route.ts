import { NextRequest, NextResponse } from 'next/server';
import { getConversations, searchTranscripts } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  
  try {
    if (type === 'conversations') {
      const limit = parseInt(searchParams.get('limit') || '10');
      const conversations = await getConversations(limit);
      
      return NextResponse.json({
        success: true,
        data: conversations,
        total: conversations.length
      });
    }
    
    if (type === 'search') {
      const query = searchParams.get('q');
      if (!query) {
        return NextResponse.json(
          { success: false, error: 'Query parameter "q" is required for search' }, 
          { status: 400 }
        );
      }
      
      const limit = parseInt(searchParams.get('limit') || '20');
      const results = await searchTranscripts(query, limit);
      
      return NextResponse.json({
        success: true,
        data: results,
        total: results.length
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid type. Use "conversations" or "search"' }, 
      { status: 400 }
    );
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}