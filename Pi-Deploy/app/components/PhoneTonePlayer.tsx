'use client';

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { PhoneToneGenerator, PhoneToneConfig, PhoneToneCallbacks, PHONE_TONE_PRESETS } from '@/lib/phoneToneGenerator';
import { getModeConfig } from '@/lib/exhibitionMode';

export interface PhoneTonePlayerRef {
  instantStop: () => void;
  retryStart: () => void;
}

interface PhoneTonePlayerProps {
  /** Whether the phone tone should be playing */
  enabled: boolean;
  /** Tone preset to use */
  toneType?: 'dial' | 'busy' | 'static' | 'line';
  /** Custom configuration override */
  config?: Partial<PhoneToneConfig>;
  /** Called when tone starts */
  onStart?: () => void;
  /** Called when tone stops */
  onStop?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Show debug controls */
  showControls?: boolean;
}

const PhoneTonePlayer = forwardRef<PhoneTonePlayerRef, PhoneTonePlayerProps>(function PhoneTonePlayer({
  enabled,
  toneType = 'dial',
  config,
  onStart,
  onStop,
  onError,
  showControls = false
}, ref) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVolume, setCurrentVolume] = useState(0);
  
  const generatorRef = useRef<PhoneToneGenerator | null>(null);
  const initializationInProgress = useRef(false);
  
  // Get exhibition mode configuration
  const modeConfig = getModeConfig();
  
  // Determine final configuration
  const finalConfig: PhoneToneConfig = {
    ...PHONE_TONE_PRESETS[toneType],
    volume: modeConfig.mode === 'exhibition' ? 0.08 : 0.12, // Lower volume for exhibition
    ...config
  };

  // Phone tone callbacks
  const toneCallbacks: PhoneToneCallbacks = {
    onStart: useCallback(() => {
      console.log('📞 Phone tone started');
      setIsPlaying(true);
      setCurrentVolume(finalConfig.volume);
      onStart?.();
    }, [finalConfig.volume, onStart]),
    
    onStop: useCallback(() => {
      console.log('📞 Phone tone stopped');
      setIsPlaying(false);
      setCurrentVolume(0);
      onStop?.();
    }, [onStop]),
    
    onError: useCallback((error: Error) => {
      console.error('❌ Phone tone error:', error);
      setError(error.message);
      setIsInitialized(false);
      setIsPlaying(false);
      onError?.(error);
    }, [onError])
  };

  // Initialize phone tone generator
  const initializeGenerator = useCallback(async () => {
    if (initializationInProgress.current || generatorRef.current) {
      console.log('📞 Skipping initialization - already in progress or exists');
      return;
    }
    
    try {
      initializationInProgress.current = true;
      setError(null);
      console.log('📞 Initializing phone tone generator...');
      
      // Check if Web Audio API is supported
      if (typeof window === 'undefined' || !window.AudioContext && !(window as any).webkitAudioContext) {
        throw new Error('Web Audio API not supported');
      }
      
      // Create and initialize generator
      generatorRef.current = new PhoneToneGenerator(finalConfig, toneCallbacks);
      console.log('📞 About to call generator.initialize()...');
      
      try {
        await generatorRef.current.initialize();
        console.log('📞 Generator.initialize() completed, setting isInitialized to true...');
        
        // FORCE START: Set initialized and immediately try to start
        setIsInitialized(true);
        console.log('✅ PhoneTonePlayer initialization completed successfully');
        
        // IMMEDIATE START ATTEMPT
        setTimeout(() => {
          if (generatorRef.current) {
            console.log('📞 FORCE STARTING phone tone after 100ms...');
            generatorRef.current.startTone().catch((err) => {
              console.log('📞 Force start failed (expected if suspended):', err.message);
            });
          }
        }, 100);
        
      } catch (initError) {
        console.error('❌ Generator initialization failed:', initError);
        throw initError;
      }
    } catch (error) {
      console.error('❌ Failed to initialize phone tone generator:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize phone tone');
      setIsInitialized(false);
    } finally {
      initializationInProgress.current = false;
    }
  }, [finalConfig, toneCallbacks]);

  // Start phone tone
  const startTone = useCallback(async () => {
    console.log('📞 startTone called:', { 
      hasGenerator: !!generatorRef.current, 
      isInitialized, 
      isPlaying 
    });
    
    if (generatorRef.current && isInitialized && !isPlaying) {
      try {
        console.log('📞 Calling generator.startTone()...');
        await generatorRef.current.startTone();
        console.log('✅ Phone tone start completed');
      } catch (error) {
        console.error('❌ Failed to start phone tone:', error);
        setError(error instanceof Error ? error.message : 'Failed to start phone tone');
      }
    } else {
      console.log('📞 Cannot start tone:', {
        hasGenerator: !!generatorRef.current,
        isInitialized,
        isPlaying
      });
    }
  }, [isInitialized, isPlaying]);

  // Stop phone tone
  const stopTone = useCallback(() => {
    if (generatorRef.current && isPlaying) {
      generatorRef.current.stopTone();
    }
  }, [isPlaying]);

  // Handle enabled state changes
  useEffect(() => {
    console.log('📞 PhoneTonePlayer enabled state change:', { 
      enabled, 
      isInitialized, 
      isPlaying,
      shouldStart: enabled && isInitialized && !isPlaying,
      shouldStop: !enabled && isPlaying 
    });
    
    if (enabled && isInitialized && !isPlaying) {
      console.log('📞 Attempting to start phone tone...');
      startTone();
    } else if (!enabled && isPlaying) {
      console.log('📞 Stopping phone tone...');
      stopTone();
    }
  }, [enabled, isInitialized, isPlaying, startTone, stopTone]);

  // Initialize on mount if enabled
  useEffect(() => {
    console.log('📞 PhoneTonePlayer mount/update:', { 
      enabled, 
      isInitialized, 
      initializationInProgress: initializationInProgress.current,
      modeConfigMode: modeConfig.mode,
      finalConfigVolume: finalConfig.volume 
    });
    
    if (enabled && !isInitialized && !initializationInProgress.current) {
      console.log('📞 Starting phone tone initialization...');
      initializeGenerator();
    }
  }, [enabled, isInitialized, initializeGenerator, modeConfig.mode, finalConfig.volume]);

  // Auto-start tone when initialization completes
  useEffect(() => {
    if (enabled && isInitialized && !isPlaying) {
      console.log('📞 Initialization completed - auto-starting phone tone...');
      startTone();
    }
  }, [enabled, isInitialized, isPlaying, startTone]);

  // Update configuration when props change
  useEffect(() => {
    if (generatorRef.current && isInitialized) {
      generatorRef.current.updateConfig(finalConfig);
    }
  }, [finalConfig, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (generatorRef.current) {
        generatorRef.current.destroy();
        generatorRef.current = null;
      }
    };
  }, []);

  // Manual volume control
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (generatorRef.current) {
      generatorRef.current.setVolume(newVolume);
      setCurrentVolume(newVolume);
    }
  }, []);

  // Expose control methods for parent components
  const instantStop = useCallback(() => {
    stopTone();
  }, [stopTone]);

  const retryStart = useCallback(async () => {
    console.log('📞 PhoneTonePlayer retryStart called');
    if (generatorRef.current) {
      await generatorRef.current.retryStart();
    }
  }, []);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    instantStop,
    retryStart
  }), [instantStop, retryStart]);

  return (
    <div className="phone-tone-controls">
      {/* Phone Tone Status Display - only show when controls enabled */}
      {enabled && showControls && (
        <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          {/* Status Indicator */}
          <div className="flex items-center space-x-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                error 
                  ? 'bg-red-500'
                  : isPlaying 
                    ? 'bg-green-500 animate-pulse' 
                    : isInitialized
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-medium">
              📞 Phone Tone: {
                error 
                  ? 'Error'
                  : isPlaying 
                    ? `Playing (${toneType})` 
                    : isInitialized
                      ? 'Ready'
                      : 'Initializing'
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
                max="0.3"
                step="0.01"
                value={currentVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-xs text-gray-600">
                {Math.round(currentVolume * 100)}%
              </span>
            </div>
          )}

          {/* Manual Controls */}
          {isInitialized && (
            <div className="flex space-x-2">
              {!isPlaying ? (
                <button
                  onClick={startTone}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                >
                  Start Tone
                </button>
              ) : (
                <button
                  onClick={stopTone}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                >
                  Stop Tone
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display - only show when controls enabled */}
      {error && showControls && (
        <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          <div className="font-medium">Phone Tone Error:</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Exhibition Mode Info - only show when controls enabled */}
      {modeConfig.mode === 'exhibition' && enabled && showControls && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-xs">
          📞 Exhibition Mode: Phone line tone active - stops instantly when voice detected
        </div>
      )}

      {/* Development Info - only show when controls enabled */}
      {modeConfig.mode === 'web' && enabled && showControls && (
        <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded text-gray-700 text-xs">
          📞 Development Mode: Phone tone testing ({toneType} tone)
        </div>
      )}
    </div>
  );
});

export default PhoneTonePlayer;