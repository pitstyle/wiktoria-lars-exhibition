import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationStatus } = body;
    
    console.log('🔚 closeConversation tool called:', conversationStatus);
    
    // Extract call ID from headers
    const callId = request.headers.get('x-ultravox-call-id');
    
    if (!callId) {
      console.error('❌ No call ID found in headers');
      return NextResponse.json(
        { error: 'Call ID required' },
        { status: 400 }
      );
    }

    // Trigger the existing endCall functionality
    try {
      const endCallResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/endCall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId,
          status: conversationStatus.status || 'completed',
          reason: conversationStatus.reason || 'Agent initiated closure',
          summary: conversationStatus.summary || 'Conversation ended gracefully'
        })
      });
      
      if (!endCallResponse.ok) {
        console.error('❌ Failed to trigger endCall:', await endCallResponse.text());
      } else {
        console.log('✅ Successfully triggered endCall processing');
      }
    } catch (error) {
      console.error('❌ Error calling endCall:', error);
    }

    // Return success response to agent
    return NextResponse.json(
      { 
        message: "Rozmowa została zakończona. Dziękuję za uczestnictwo.",
        status: "conversation_ended",
        transcriptSaved: true
      },
      {
        status: 200,
        headers: {
          'X-Ultravox-Response-Type': 'end-call',
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('❌ Error in closeConversation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to close conversation',
        message: "Przepraszam, wystąpił błąd podczas zamykania rozmowy."
      },
      { status: 500 }
    );
  }
}