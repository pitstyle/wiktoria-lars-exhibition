import { NextRequest, NextResponse } from 'next/server';
import { failsafeCompiler } from '@/lib/failsafeTranscriptCompiler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'compile':
        console.log('🔧 Manual transcript compilation triggered via API');
        const stats = await failsafeCompiler.forceCompilation();
        
        return NextResponse.json({
          message: 'Compilation completed',
          stats,
          timestamp: new Date().toISOString()
        });

      case 'status':
        const currentStats = failsafeCompiler.getStats();
        
        return NextResponse.json({
          message: 'Compiler status retrieved',
          stats: currentStats,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "compile" or "status"' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Error in transcript recovery API:', error);
    
    return NextResponse.json(
      { 
        error: 'Transcript recovery failed',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return current compiler status
    const stats = failsafeCompiler.getStats();
    
    return NextResponse.json({
      message: 'Failsafe transcript compiler status',
      stats,
      timestamp: new Date().toISOString(),
      endpoints: {
        forceCompile: 'POST /api/transcript-recovery with { "action": "compile" }',
        getStatus: 'POST /api/transcript-recovery with { "action": "status" }',
        statusCheck: 'GET /api/transcript-recovery'
      }
    });

  } catch (error) {
    console.error('❌ Error getting compiler status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get compiler status',
        details: (error as Error).message 
      },
      { status: 500 }
    );
  }
}