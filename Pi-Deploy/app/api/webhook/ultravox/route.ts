import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: This webhook is now deprecated. Please use /api/ultravox-webhook instead.
// This endpoint is kept for backward compatibility but will redirect to the main webhook.

export async function POST(request: NextRequest) {
  console.log('⚠️ DEPRECATED webhook called: /api/webhook/ultravox');
  console.log('🔀 Redirecting to main webhook: /api/ultravox-webhook');
  
  try {
    const body = await request.json();
    
    // Forward to the main webhook
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : (process.env.NODE_ENV === 'production' 
        ? 'https://wiktoria-lars-app.vercel.app' 
        : 'http://localhost:3000');
    
    const response = await fetch(`${baseUrl}/api/ultravox-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(request.headers.entries())
      },
      body: JSON.stringify(body)
    });
    
    const result = await response.json();
    
    return NextResponse.json({
      ...result,
      deprecation_notice: 'This endpoint is deprecated. Use /api/ultravox-webhook instead.'
    }, { status: response.status });
    
  } catch (error) {
    console.error('❌ Error in deprecated webhook redirect:', error);
    return NextResponse.json({ 
      error: 'Deprecated webhook redirect failed',
      message: 'Please use /api/ultravox-webhook instead',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'deprecated',
    message: 'This webhook endpoint is deprecated. Please use /api/ultravox-webhook instead.',
    redirect_to: '/api/ultravox-webhook'
  });
}