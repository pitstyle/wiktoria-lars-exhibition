'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioIntroPlayer, AudioIntroConfig, AudioIntroCallbacks } from '@/lib/audioIntro';
import { getModeConfig } from '@/lib/exhibitionMode';

interface AudioIntroLoopProps {
  /** Whether the intro loop should be active */
  enabled: boolean;
  /** Called when intro should be paused (e.g., voice detected) */
  onPause?: () => void;
  /** Called when intro is resumed */
  onResume?: () => void;
  /** Custom audio source path */
  audioSrc?: string;
  /** Custom configuration */
  config?: Partial<AudioIntroConfig>;
  /** Show visual controls and feedback */
  showControls?: boolean;
}

export default function AudioIntroLoop({
  enabled,
  onPause,
  onResume,
  audioSrc,
  config,
  showControls = false
}: AudioIntroLoopProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [audioSupported, setAudioSupported] = useState(true);
  const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
  
  const playerRef = useRef<AudioIntroPlayer | null>(null);
  
  // Get exhibition mode configuration
  const modeConfig = getModeConfig();
  
  // Determine audio source - use existing file  
  const finalAudioSrc = audioSrc || '/wiktoria_start01.mp3'; // Use existing audio file
  
  // Audio configuration with exhibition optimizations
  const finalConfig: Partial<AudioIntroConfig> = {
    audioSrc: finalAudioSrc,
    volume: modeConfig.mode === 'exhibition' ? 0.8 : 0.6,
    loopDelay: 3000, // 3 seconds between loops
    fadeDuration: 800,
    maxLoops: 0, // Infinite loops for exhibition
    ...config
  };

  // Audio callbacks
  const audioCallbacks: AudioIntroCallbacks = {
    onLoopStart: useCallback((count: number) => {
      console.log(`🔊 Audio intro loop ${count} started`);
      setLoopCount(count);
      setIsPlaying(true);
    }, []),
    
    onLoopEnd: useCallback((count: number) => {
      console.log(`🔊 Audio intro loop ${count} ended`);
    }, []),
    
    onError: useCallback((error: Error) => {
      console.error('❌ Audio intro error:', error);
      
      // For exhibition mode on Raspberry Pi, ignore autoplay errors
      if (error.message.includes('play() failed because the user didn\'t interact') || 
          error.message.includes('NotAllowedError')) {
        console.log('🔊 Audio autoplay blocked - continuing anyway for exhibition mode');
        return; // Don't set error state, just continue
      }
      
      setError(error.message);
      setIsInitialized(false);
      setIsPlaying(false);
      
      // Check if it's a file not found error - use fallback
      if (error.message.includes('Failed to load audio')) {
        console.log('🔊 Trying fallback audio source...');
        tryFallbackAudio();
      }
    }, []),
    
    onVolumeChange: useCallback((newVolume: number) => {
      setVolume(newVolume);
    }, [])
  };

  // Try fallback audio if main source fails
  const tryFallbackAudio = useCallback(async () => {
    if (finalAudioSrc !== '/wiktoria_start01.mp3') {
      try {
        console.log('🔊 Trying fallback audio: wiktoria_start01.mp3');
        const fallbackConfig = { ...finalConfig, audioSrc: '/wiktoria_start01.mp3' };
        
        if (playerRef.current) {
          playerRef.current.destroy();
        }
        
        playerRef.current = new AudioIntroPlayer(fallbackConfig, audioCallbacks);
        await playerRef.current.initialize();
        setIsInitialized(true);
        setError(null);
        console.log('✅ Fallback audio initialized successfully');
      } catch (fallbackError) {
        console.error('❌ Fallback audio also failed:', fallbackError);
        setError('No audio files available for intro loop');
        setAudioSupported(false);
      }
    }
  }, [finalConfig, audioCallbacks, finalAudioSrc]);

  // Initialize audio player
  const initializePlayer = useCallback(async () => {
    try {
      setError(null);
      console.log('🔊 Initializing audio intro player...');
      
      // Check if audio is supported
      if (typeof window === 'undefined' || !window.Audio) {
        throw new Error('Audio not supported in this environment');
      }
      
      // Create and initialize player
      playerRef.current = new AudioIntroPlayer(finalConfig, audioCallbacks);
      await playerRef.current.initialize();
      
      setIsInitialized(true);
      console.log('✅ Audio intro player initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize audio intro player:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize audio player');
      setIsInitialized(false);
    }
  }, [finalConfig, audioCallbacks]);

  // Enable audio with user interaction
  const enableAudioWithInteraction = useCallback(async () => {
    try {
      setNeedsUserInteraction(false);
      setError(null);
      
      // Try to start the loop now that we have user interaction
      if (playerRef.current && isInitialized) {
        await playerRef.current.startLoop();
        setIsPlaying(true);
        setIsPaused(false);
        console.log('🔊 Audio intro loop started after user interaction');
      }
    } catch (error) {
      console.error('❌ Failed to enable audio:', error);
      setError(error instanceof Error ? error.message : 'Failed to enable audio');
    }
  }, [isInitialized]);

  // Start intro loop
  const startIntroLoop = useCallback(async () => {
    if (playerRef.current && isInitialized && !isPlaying) {
      try {
        await playerRef.current.startLoop();
        setIsPlaying(true);
        setIsPaused(false);
        console.log('🔊 Audio intro loop started');
      } catch (error) {
        console.error('❌ Failed to start intro loop:', error);
        setError(error instanceof Error ? error.message : 'Failed to start audio loop');
      }
    }
  }, [isInitialized, isPlaying]);

  // Stop intro loop
  const stopIntroLoop = useCallback(() => {
    if (playerRef.current && isPlaying) {
      playerRef.current.stopLoop();
      setIsPlaying(false);
      setIsPaused(false);
      setLoopCount(0);
      console.log('🔊 Audio intro loop stopped');
    }
  }, [isPlaying]);

  // Pause intro loop
  const pauseIntroLoop = useCallback(() => {
    if (playerRef.current && isPlaying && !isPaused) {
      playerRef.current.pauseLoop();
      setIsPaused(true);
      onPause?.();
      console.log('🔊 Audio intro loop paused');
    }
  }, [isPlaying, isPaused, onPause]);

  // Resume intro loop
  const resumeIntroLoop = useCallback(() => {
    if (playerRef.current && isPlaying && isPaused) {
      playerRef.current.resumeLoop();
      setIsPaused(false);
      onResume?.();
      console.log('🔊 Audio intro loop resumed');
    }
  }, [isPlaying, isPaused, onResume]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  }, []);

  // Handle enabled state changes
  useEffect(() => {
    if (enabled && isInitialized && !isPlaying) {
      startIntroLoop();
    } else if (!enabled && isPlaying) {
      stopIntroLoop();
    }
  }, [enabled, isInitialized, isPlaying, startIntroLoop, stopIntroLoop]);

  // Initialize on mount
  useEffect(() => {
    if (enabled && !isInitialized && audioSupported) {
      initializePlayer();
    }
  }, [enabled, isInitialized, audioSupported, initializePlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

  // Auto-pause on voice activation (external control)
  const pauseForVoice = useCallback(() => {
    pauseIntroLoop();
  }, [pauseIntroLoop]);

  // Auto-resume after voice ends (external control)  
  const resumeAfterVoice = useCallback(() => {
    resumeIntroLoop();
  }, [resumeIntroLoop]);

  // Expose control methods via ref (for parent components to control)
  // This allows ExhibitionInterface to pause/resume audio intro

  // Don't render controls if not requested
  if (!showControls) {
    return null;
  }

  return (
    <div className="audio-intro-controls">
      {/* Audio Status Display */}
      {enabled && (
        <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                !audioSupported 
                  ? 'bg-gray-400'
                  : error 
                    ? 'bg-red-500'
                    : isPlaying && !isPaused 
                      ? 'bg-green-500 animate-pulse' 
                      : isPaused
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
              }`}
            />
            <span className="text-sm font-medium">
              {!audioSupported 
                ? 'Audio Not Supported'
                : error 
                  ? 'Audio Error'
                  : isPlaying && !isPaused 
                    ? `Playing Loop ${loopCount}` 
                    : isPaused
                      ? 'Paused'
                      : 'Ready'
              }
            </span>
          </div>

          {/* Volume Control */}
          {isInitialized && (
            <div className="flex items-center space-x-2">
              <span className="text-sm">Volume:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-gray-600">
                {Math.round(volume * 100)}%
              </span>
            </div>
          )}

          {/* Manual Controls */}
          {isInitialized && (
            <div className="flex space-x-2">
              {!isPlaying ? (
                <button
                  onClick={startIntroLoop}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                >
                  Start
                </button>
              ) : (
                <>
                  {!isPaused ? (
                    <button
                      onClick={pauseIntroLoop}
                      className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                    >
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={resumeIntroLoop}
                      className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={stopIntroLoop}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          <div className="font-medium">Audio Intro Error:</div>
          <div className="text-sm">{error}</div>
          {!audioSupported && (
            <div className="text-xs mt-1">
              Audio playback is not supported in this environment
            </div>
          )}
        </div>
      )}

      {/* Exhibition Mode Info */}
      {modeConfig.mode === 'exhibition' && enabled && (
        <div className="mt-2 p-2 bg-blue-100 border border-blue-300 rounded text-blue-700 text-xs">
          Exhibition Mode: Audio intro loop active - pauses automatically when voice detected
        </div>
      )}

      {/* Development Info */}
      {modeConfig.mode === 'web' && enabled && (
        <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded text-gray-700 text-xs">
          Development Mode: Manual audio intro testing
        </div>
      )}
    </div>
  );
}