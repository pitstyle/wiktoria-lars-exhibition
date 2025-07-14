'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoiceActivityDetector, VoiceDetectionConfig, VoiceDetectionCallbacks } from '@/lib/voiceDetection';
import { getModeConfig } from '@/lib/exhibitionMode';

interface VoiceActivationProps {
  /** Called when voice activation should trigger a call */
  onVoiceActivation: () => void;
  /** Called when voice activity starts */
  onVoiceStart?: () => void;
  /** Called when voice activity ends */
  onVoiceEnd?: () => void;
  /** Called immediately when any voice is detected (for instant tone cutoff) */
  onVoiceDetected?: () => void;
  /** Whether voice activation is currently enabled */
  enabled: boolean;
  /** Whether a call is currently active (prevents auto-calling during calls) */
  isCallActive?: boolean;
  /** Optional custom VAD configuration */
  vadConfig?: Partial<VoiceDetectionConfig>;
  /** Show visual indicators */
  showVisualFeedback?: boolean;
}

export default function VoiceActivation({
  onVoiceActivation,
  onVoiceStart,
  onVoiceEnd,
  onVoiceDetected,
  enabled,
  isCallActive = false,
  vadConfig,
  showVisualFeedback = true
}: VoiceActivationProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const hasTriggeredActivation = useRef(false);
  const initializationInProgress = useRef(false);
  
  // Get exhibition mode configuration
  const modeConfig = getModeConfig();
  
  // Memoize VAD configuration to prevent recreation
  const finalVadConfig = React.useMemo(() => ({
    threshold: modeConfig.voiceThreshold || (modeConfig.mode === 'exhibition' ? 0.5 : 0.05), // Very high threshold for handset use
    minVoiceDuration: 150, // 150ms for single-word activation
    silenceTimeout: modeConfig.silenceTimeout || 3500,
    fftSize: 2048,
    voiceFrequencyMin: 300, // Handset frequency range (telephone quality)
    voiceFrequencyMax: 3400,
    ...vadConfig
  }), [modeConfig.voiceThreshold, modeConfig.silenceTimeout, modeConfig.mode, vadConfig]);

  // Memoize VAD callbacks to prevent recreation
  const vadCallbacks = React.useMemo(() => ({
    onVoiceStart: () => {
      console.log('🎤 Voice activity started');
      setIsVoiceActive(true);
      onVoiceStart?.();
      
      // Trigger call activation on first voice detection (only if no call is active)
      if (!hasTriggeredActivation.current && enabled && !isCallActive) {
        console.log('🚀 Triggering voice activation');
        hasTriggeredActivation.current = true;
        onVoiceActivation();
      } else if (isCallActive) {
        console.log('🚀 Voice detected but call already active - not triggering');
      }
    },
    
    onVoiceEnd: () => {
      console.log('🎤 Voice activity ended');
      setIsVoiceActive(false);
      onVoiceEnd?.();
    },
    
    onVoiceActivity: (level: number) => {
      setVoiceLevel(level);
      
      // Trigger instant tone cutoff on significant voice activity
      if (level > finalVadConfig.threshold && onVoiceDetected) {
        onVoiceDetected();
      }
    },
    
    onError: (error: Error) => {
      console.error('❌ Voice detection error:', error);
      setError(error.message);
      setIsInitialized(false);
      setIsListening(false);
    },
    
    onSilenceTimeout: () => {
      console.log('🔇 Silence timeout reached');
      // CRITICAL FIX: Only reset activation trigger if NO call is active
      // This prevents auto-calling during active conversations
      if (!isCallActive) {
        console.log('🔇 No call active - resetting activation trigger');
        hasTriggeredActivation.current = false;
      } else {
        console.log('🔇 Call is active - NOT resetting activation trigger to prevent auto-calling');
      }
    }
  }), [onVoiceStart, onVoiceActivation, enabled, onVoiceEnd, isCallActive]);

  // Initialize VAD with proper cleanup and state management
  const initializeVAD = useCallback(async () => {
    // Prevent multiple concurrent initializations
    if (initializationInProgress.current) {
      console.log('🎤 Initialization already in progress, skipping');
      return;
    }

    try {
      initializationInProgress.current = true;
      setError(null);
      setIsInitialized(false);
      setIsListening(false);
      
      console.log('🎤 Starting voice activation initialization...');
      
      // Check if we're in a browser environment
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        throw new Error('MediaDevices not supported in this environment');
      }
      
      // Check microphone permission
      let permissionState: PermissionState = 'prompt';
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissionState = permission.state;
      } catch (permError) {
        console.warn('⚠️ Permissions API not available, proceeding with prompt state');
      }
      
      setMicrophonePermission(permissionState);
      
      if (permissionState === 'denied') {
        throw new Error('Microphone permission denied');
      }
      
      // Clean up existing VAD
      if (vadRef.current) {
        console.log('🎤 Cleaning up existing VAD instance');
        try {
          vadRef.current.destroy();
        } catch (cleanupError) {
          console.warn('⚠️ Error during VAD cleanup:', cleanupError);
        }
        vadRef.current = null;
      }
      
      // Wait a bit to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create new VAD instance with fresh callbacks
      console.log('🎤 Creating new VoiceActivityDetector');
      const freshCallbacks = {
        onVoiceStart: () => {
          console.log('🎤 Voice activity started in callback');
          console.log('🚀 Activation trigger state:', { 
            hasTriggered: hasTriggeredActivation.current, 
            enabled,
            willTrigger: !hasTriggeredActivation.current && enabled 
          });
          setIsVoiceActive(true);
          onVoiceStart?.();
          
          if (!hasTriggeredActivation.current && enabled && !isCallActive) {
            console.log('🚀 TRIGGERING VOICE ACTIVATION NOW!');
            hasTriggeredActivation.current = true;
            onVoiceActivation();
          } else {
            console.log('🚀 NOT triggering - already triggered, disabled, or call active');
          }
        },
        onVoiceEnd: () => {
          console.log('🎤 Voice activity ended');
          setIsVoiceActive(false);
          onVoiceEnd?.();
        },
        onVoiceActivity: (level: number) => {
          setVoiceLevel(level);
        },
        onError: (error: Error) => {
          console.error('❌ Voice detection error:', error);
          setError(error.message);
          setIsInitialized(false);
          setIsListening(false);
        },
        onSilenceTimeout: () => {
          console.log('🔇 Silence timeout reached');
          // CRITICAL FIX: Only reset activation trigger if NO call is active
          if (!isCallActive) {
            console.log('🔇 No call active - resetting activation trigger');
            hasTriggeredActivation.current = false;
          } else {
            console.log('🔇 Call is active - NOT resetting activation trigger');
          }
        }
      };
      
      vadRef.current = new VoiceActivityDetector(finalVadConfig, freshCallbacks);
      
      console.log('🎤 Initializing VAD...');
      await vadRef.current.initialize();
      
      // Verify initialization was successful
      const vadInstance = vadRef.current;
      if (!vadInstance) {
        throw new Error('VAD instance is null after initialization');
      }
      
      setIsInitialized(true);
      console.log('✅ Voice activation initialized successfully');
      
      // Auto-start listening if enabled
      if (enabled) {
        setTimeout(() => {
          if (vadInstance && vadRef.current === vadInstance) {
            console.log('🎤 Auto-starting voice listening');
            try {
              vadInstance.startListening();
              setIsListening(true);
              console.log('✅ Voice listening started');
            } catch (startError) {
              console.error('❌ Failed to auto-start listening:', startError);
              setError('Failed to start voice listening');
            }
          }
        }, 200);
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize voice activation:', error);
      setError(error instanceof Error ? error.message : 'Failed to initialize voice detection');
      setIsInitialized(false);
      vadRef.current = null;
    } finally {
      initializationInProgress.current = false;
    }
  }, [finalVadConfig, enabled, onVoiceStart, onVoiceActivation, onVoiceEnd]);

  // Start listening
  const startListening = useCallback(() => {
    if (!vadRef.current) {
      console.warn('⚠️ VAD not available, cannot start listening');
      return;
    }
    
    if (!isInitialized) {
      console.warn('⚠️ VAD not initialized, cannot start listening');
      return;
    }
    
    if (isListening) {
      console.log('🎤 Already listening, skipping start');
      return;
    }
    
    try {
      vadRef.current.startListening();
      setIsListening(true);
      hasTriggeredActivation.current = false; // Reset trigger state
      console.log('🎤 Voice listening started successfully');
    } catch (error) {
      console.error('❌ Failed to start voice listening:', error);
      setError(error instanceof Error ? error.message : 'Failed to start listening');
      setIsListening(false);
    }
  }, [isInitialized, isListening]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (vadRef.current && isListening) {
      vadRef.current.stopListening();
      setIsListening(false);
      setIsVoiceActive(false);
      setVoiceLevel(0);
      console.log('🎤 Voice listening stopped');
    }
  }, [isListening]);

  // Reset activation trigger (call this when call ends)
  const resetActivationTrigger = useCallback(() => {
    console.log('🔄 Resetting activation trigger for new voice detection');
    hasTriggeredActivation.current = false;
  }, []);

  // Simple initialization effect
  useEffect(() => {
    if (enabled && !isInitialized && !initializationInProgress.current) {
      console.log('🎤 Triggering VAD initialization');
      initializeVAD();
    }
  }, [enabled, isInitialized, initializeVAD]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      if (vadRef.current) {
        console.log('🎤 Cleaning up VAD on unmount');
        vadRef.current.destroy();
        vadRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled && vadRef.current) {
      console.log('🎤 Stopping VAD (disabled)');
      vadRef.current.stopListening();
      setIsListening(false);
    }
  }, [enabled]);

  // Reset activation trigger when call ends
  useEffect(() => {
    if (!isCallActive && hasTriggeredActivation.current) {
      console.log('🔄 Call ended - resetting activation trigger for next interaction');
      hasTriggeredActivation.current = false;
    }
  }, [isCallActive]);

  // Handle permission state changes
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then(permission => {
          setMicrophonePermission(permission.state);
          
          permission.addEventListener('change', () => {
            setMicrophonePermission(permission.state);
            if (permission.state === 'granted' && enabled && !isInitialized) {
              initializeVAD();
            }
          });
        })
        .catch(console.error);
    }
  }, [enabled, isInitialized, initializeVAD]);

  // Don't render anything if not showing visual feedback
  if (!showVisualFeedback) {
    return null;
  }

  return (
    <div className="voice-activation-container">
      {/* Voice Activity Indicator */}
      {enabled && (
        <div className="flex items-center space-x-4 p-4 bg-gray-100 rounded-lg">
          {/* Microphone Status */}
          <div className="flex items-center space-x-2">
            <div 
              className={`w-4 h-4 rounded-full transition-colors ${
                microphonePermission === 'granted' 
                  ? isListening 
                    ? 'bg-green-500' 
                    : 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium">
              {microphonePermission === 'denied' 
                ? 'Microphone Access Denied'
                : isListening 
                  ? 'Listening for Voice...' 
                  : 'Microphone Ready'
              }
            </span>
          </div>

          {/* Voice Level Indicator */}
          {isListening && (
            <div className="flex items-center space-x-2">
              <span className="text-sm">Voice Level:</span>
              <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-100 ${
                    isVoiceActive ? 'bg-green-500' : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(voiceLevel * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {Math.round(voiceLevel * 100)}%
              </span>
            </div>
          )}

          {/* Voice Activity Status */}
          {isVoiceActive && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700">
                Voice Detected
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          <div className="font-medium">Voice Detection Error:</div>
          <div className="text-sm">{error}</div>
          {microphonePermission === 'denied' && (
            <div className="text-xs mt-1">
              Please enable microphone access in your browser settings
            </div>
          )}
        </div>
      )}

      {/* Permission Request */}
      {microphonePermission === 'prompt' && enabled && (
        <div className="mt-2 p-3 bg-blue-100 border border-blue-300 rounded text-blue-700">
          <div className="font-medium">Microphone Access Required</div>
          <div className="text-sm">Please allow microphone access for voice activation</div>
          <button 
            onClick={initializeVAD}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            Request Permission
          </button>
        </div>
      )}

      {/* Exhibition Mode Info */}
      {modeConfig.mode === 'exhibition' && enabled && (
        <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-green-700 text-xs">
          Exhibition Mode: Voice activation enabled with {finalVadConfig.threshold}% threshold
        </div>
      )}
    </div>
  );
}