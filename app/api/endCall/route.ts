// File: app/api/endCall/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log('🔚 EndCall tool invoked - terminating conversation');
    
    // Parse context data if provided (for logging)
    try {
      const body = await req.json();
      console.log('EndCall context:', body.contextData || 'No context provided');
    } catch {
      // No body or invalid JSON - that's fine for EndCall
    }
    
    // Create response that signals Ultravox to end the call
    const response = NextResponse.json({
      message: "Thank you for participating in our political performance. The conversation has ended naturally. Feel free to call again anytime to explore new topics with Lars and Wiktoria!"
    });
    
    // Set header to indicate call should end
    response.headers.set("X-Ultravox-Response-Type", "end-call");
    
    console.log('✅ Call termination signal sent');
    return response;
    
  } catch (error) {
    console.error('❌ Error in endCall route:', error);
    return NextResponse.json({ error: 'Error ending call' }, { status: 500 });
  }
}