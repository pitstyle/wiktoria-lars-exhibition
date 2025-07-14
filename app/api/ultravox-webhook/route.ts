import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 Ultravox webhook received (minimal handler)');
    console.log('🔔 Full payload:', JSON.stringify(body, null, 2));
    console.log('🔔 Event type:', body.event_type);
    
    // Just return 200 - let fetch-ultravox-data handle transcript saving
    return NextResponse.json({ message: 'Webhook received' });
    
  } catch (error) {
    console.error('❌ Error in minimal webhook:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// Handle GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Ultravox webhook endpoint active (minimal)' });
}