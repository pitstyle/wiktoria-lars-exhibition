import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionStatus } = body;
    
    console.log('🚨 terminateSession tool called:', sessionStatus);
    
    // Extract call ID from headers
    const callId = request.headers.get('x-ultravox-call-id');
    
    if (!callId) {
      console.error('❌ No call ID found in headers');
      return NextResponse.json(
        { error: 'Call ID required' },
        { status: 400 }
      );
    }

    // Emergency transcript save - try multiple methods
    try {
      console.log('🔄 Attempting emergency transcript save...');
      
      // Try the endCall route first
      const endCallResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/endCall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          callId,
          status: 'emergency_terminated',
          reason: sessionStatus.errorReason || 'Emergency session termination',
          forceTranscriptSave: true
        })
      });
      
      if (endCallResponse.ok) {
        console.log('✅ Emergency transcript save successful via endCall');
      } else {
        console.error('❌ Emergency transcript save failed via endCall:', await endCallResponse.text());
        
        // Try direct transcript save as backup
        const forceTranscriptResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/forceTranscriptSave`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            callId,
            emergencyMode: true,
            reason: 'terminateSession_fallback'
          })
        });
        
        if (forceTranscriptResponse.ok) {
          console.log('✅ Emergency transcript save successful via forceTranscriptSave');
        } else {
          console.error('❌ All transcript save methods failed');
        }
      }
      
    } catch (error) {
      console.error('❌ Critical error during emergency transcript save:', error);
    }

    // Always return success to allow session termination
    return NextResponse.json(
      { 
        message: "Sesja została natychmiast zakończona.",
        status: "session_terminated",
        emergencyMode: true,
        transcriptBackupAttempted: true
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
    console.error('❌ Critical error in terminateSession:', error);
    
    // Even on error, allow termination to proceed
    return NextResponse.json(
      { 
        message: "Sesja zakończona w trybie awaryjnym.",
        status: "emergency_terminated",
        error: true
      },
      { 
        status: 200,  // Return 200 to allow termination
        headers: {
          'X-Ultravox-Response-Type': 'end-call',
          'Content-Type': 'application/json'
        }
      }
    );
  }
}