import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const logs = url.searchParams.get('logs');
  
  if (logs) {
    try {
      const parsedLogs = JSON.parse(decodeURIComponent(logs));
      const logText = parsedLogs.join('\n');
      
      return new NextResponse(logText, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    } catch (error) {
      return NextResponse.json({ error: 'Failed to parse logs' }, { status: 400 });
    }
  }
  
  return NextResponse.json({ message: 'No logs provided' }, { status: 400 });
}