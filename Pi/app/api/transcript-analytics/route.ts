import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get transcript statistics (recent records first, fallback to id ordering)
    const { data: transcripts, error } = await supabase
      .from('transcripts')
      .select('content, speaker')
      .order('id', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Analyze transcript quality
    const analytics = {
      total: transcripts?.length || 0,
      byLength: {
        short: 0, // < 25 chars
        medium: 0, // 25-100 chars  
        long: 0, // > 100 chars
      },
      bySpeaker: {
        lars: 0,
        wiktoria: 0,
        user: 0,
      },
      completionIndicators: {
        withPunctuation: 0,
        withMultipleSentences: 0,
        fragments: 0,
      },
      samples: {
        complete: [] as string[],
        fragments: [] as string[],
      }
    };

    transcripts?.forEach(transcript => {
      const content = transcript.content;
      const length = content.length;
      
      // Length analysis
      if (length < 25) analytics.byLength.short++;
      else if (length <= 100) analytics.byLength.medium++;
      else analytics.byLength.long++;
      
      // Speaker analysis
      analytics.bySpeaker[transcript.speaker as keyof typeof analytics.bySpeaker]++;
      
      // Quality analysis
      const hasProperEnding = /[.!?]\s*$/.test(content);
      const hasMultipleSentences = (content.match(/[.!?]/g) || []).length >= 2;
      
      if (hasProperEnding) analytics.completionIndicators.withPunctuation++;
      if (hasMultipleSentences) analytics.completionIndicators.withMultipleSentences++;
      if (length < 25 || (!hasProperEnding && !hasMultipleSentences)) {
        analytics.completionIndicators.fragments++;
        if (analytics.samples.fragments.length < 5) {
          analytics.samples.fragments.push(content);
        }
      } else {
        if (analytics.samples.complete.length < 5) {
          analytics.samples.complete.push(content);
        }
      }
    });

    return NextResponse.json({
      success: true,
      analytics,
      qualityScore: Math.round((1 - analytics.completionIndicators.fragments / analytics.total) * 100),
      recommendations: analytics.completionIndicators.fragments > analytics.total * 0.3 
        ? ["High fragment rate detected - consider stricter filtering"]
        : ["Transcript quality looks good"]
    });

  } catch (error) {
    console.error('Error analyzing transcripts:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}