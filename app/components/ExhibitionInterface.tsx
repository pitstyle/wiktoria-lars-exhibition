'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { startCall, endCall } from '@/lib/callFunctions';
import { CallConfig, SelectedTool } from '@/lib/types';
import { larsWiktoriaEnhancedConfig as demoConfig } from '@/app/lars-wiktoria-enhanced-config';
import { Role, Transcript, UltravoxExperimentalMessageEvent, UltravoxSessionStatus } from 'ultravox-client';
import { saveConversation, updateConversationEnd, saveFullTranscript, Conversation } from '@/lib/supabase';
import VoiceActivation from './VoiceActivation';
// TEMP DISABLED: import PhoneTonePlayer, { PhoneTonePlayerRef } from './PhoneTonePlayer';
import { SimplePhoneTone } from '@/lib/simplePhoneTone';
import { getModeConfig } from '@/lib/exhibitionMode';

interface ExhibitionInterfaceProps {
  /** Optional callback when exhibition session starts */
  onSessionStart?: () => void;
  /** Optional callback when exhibition session ends */
  onSessionEnd?: () => void;
  /** Show development info */
  showDebugInfo?: boolean;
}

export default function ExhibitionInterface({
  onSessionStart,
  onSessionEnd,
  showDebugInfo = false
}: ExhibitionInterfaceProps) {
  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('ready');
  const [callTranscript, setCallTranscript] = useState<Transcript[] | null>([]);
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('876ac038-08f0-4485-8b20-02b42bcf3416');
  const [currentAgent, setCurrentAgent] = useState<string>('lars');
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [ultravoxCallId, setUltravoxCallId] = useState<string | null>(null);

  // Exhibition state
  const [isWaitingForVoice, setIsWaitingForVoice] = useState(true);
  const [sessionTimeoutId, setSessionTimeoutId] = useState<number | null>(null);
  const [userSilenceTimeoutId, setUserSilenceTimeoutId] = useState<number | null>(null);
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  const [lastUserTranscriptTime, setLastUserTranscriptTime] = useState<number>(Date.now());
  const [lastAnySpeechTime, setLastAnySpeechTime] = useState<number>(Date.now()); // Track when anyone (user OR agent) last spoke
  
  // Voice and audio state
  const [voiceActivationEnabled, setVoiceActivationEnabled] = useState(true); // START ENABLED
  const [phoneToneEnabled, setPhoneToneEnabled] = useState(true); // START ENABLED FOR AMBIENT SOUND
  const [hasUserGesture, setHasUserGesture] = useState(false); // Track if we have user gesture
  const [showAudioEnableOverlay, setShowAudioEnableOverlay] = useState(false); // Show click-to-enable overlay
  const [userHasResponded, setUserHasResponded] = useState(false); // Track if user has spoken to Lars yet
  const [conversationEnding, setConversationEnding] = useState(false); // Prevent duplicate end triggers
  
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Conversation | null>(null);
  // TEMP DISABLED: const phoneToneRef = useRef<PhoneTonePlayerRef>(null);
  const simpleToneRef = useRef<SimplePhoneTone | null>(null);
  
  // Get exhibition configuration
  const modeConfig = getModeConfig();
  const sessionTimeout = modeConfig.autoTimeout || 45000; // 45 seconds default
  const userSilenceTimeout = modeConfig.userSilenceEndCall || 12000; // 12 seconds default
  
  // Debug logging for exhibition interface + LOG CAPTURE
  useEffect(() => {
    // CAPTURE CONSOLE LOGS FOR DEBUGGING
    const originalLog = console.log;
    const originalError = console.error;
    const logBuffer: string[] = [];
    
    console.log = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      logBuffer.push(`[LOG] ${new Date().toISOString()}: ${message}`);
      originalLog.apply(console, args);
      
      // Save to localStorage every 10 logs
      if (logBuffer.length % 10 === 0) {
        localStorage.setItem('exhibition_logs', JSON.stringify(logBuffer));
      }
      
      // Also save final logs on key events
      if (message.includes('💾') || message.includes('🔄') || message.includes('🔗')) {
        localStorage.setItem('exhibition_logs', JSON.stringify(logBuffer));
      }
    };
    
    console.error = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      logBuffer.push(`[ERROR] ${new Date().toISOString()}: ${message}`);
      originalError.apply(console, args);
      localStorage.setItem('exhibition_logs', JSON.stringify(logBuffer));
    };
    
    console.log('🎨 Exhibition interface mounted');
    console.log('🎨 Mode config:', modeConfig);
    console.log('🎨 Session timeout:', sessionTimeout);
    console.log('🎨 User silence timeout:', userSilenceTimeout);
    console.log('🎨 Voice activation enabled:', voiceActivationEnabled);
    console.log('📞 Phone tone enabled:', phoneToneEnabled);
    console.log('📞 Has user gesture:', hasUserGesture);
    console.log('🎨 Waiting for voice:', isWaitingForVoice);
    console.log('🎨 Exhibition interface URL:', window.location.href);
    console.log('🎨 URL params:', new URLSearchParams(window.location.search).toString());
    
    // FORCE START simple tone on mount
    console.log('📞 FORCE STARTING simple tone on mount...');
    if (!simpleToneRef.current) {
      simpleToneRef.current = new SimplePhoneTone(0.05);
    }
    simpleToneRef.current.start().catch((err) => {
      console.log('📞 Mount tone start failed:', err.message);
      if (err.message.includes('AudioContext') || err.message.includes('user gesture') || err.message.includes('not allowed to start')) {
        setShowAudioEnableOverlay(true);
      }
    });
  }, []);

  // Simple tone auto-start (separate effect with no dependencies)
  useEffect(() => {
    console.log('📞 Auto-start effect running...');
    const timer = setTimeout(() => {
      console.log('📞 AUTO-STARTING simple tone after 1 second...');
      if (!simpleToneRef.current) {
        simpleToneRef.current = new SimplePhoneTone(0.05);
      }
      simpleToneRef.current.start().catch((err) => {
        console.log('📞 Auto-start failed:', err.message);
        if (err.message.includes('AudioContext') || err.message.includes('user gesture') || err.message.includes('not allowed to start')) {
          setShowAudioEnableOverlay(true);
        }
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Simple tone management
  useEffect(() => {
    console.log('📞 Simple tone effect:', { phoneToneEnabled, isWaitingForVoice, isCallActive });
    
    // SIMPLIFIED: Only play tone when waiting for voice AND tone is enabled
    if (phoneToneEnabled && isWaitingForVoice && !isCallActive) {
      console.log('📞 Starting simple tone...');
      if (!simpleToneRef.current) {
        simpleToneRef.current = new SimplePhoneTone(0.05); // Quiet volume
      }
      simpleToneRef.current.start().catch((err) => {
        console.log('📞 Simple tone start failed (will retry on gesture):', err.message);
      });
    } else if (simpleToneRef.current) {
      console.log('📞 Stopping simple tone...');
      simpleToneRef.current.stop();
    }
  }, [phoneToneEnabled, isWaitingForVoice, isCallActive]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript]);

  // Session timeout management
  const resetSessionTimeout = useCallback(() => {
    setLastActivityTime(Date.now());
    
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    
    if (isCallActive) {
      const newTimeoutId = window.setTimeout(() => {
        console.log('⏰ Session timeout - ending call');
        handleEndCallButtonClick();
      }, sessionTimeout);
      
      setSessionTimeoutId(newTimeoutId);
    }
  }, [sessionTimeoutId, isCallActive, sessionTimeout]);

  // User silence timeout management (ends call naturally after user stops speaking)
  const resetUserSilenceTimeout = useCallback((forceActive = false) => {
    const effectiveIsCallActive = forceActive || isCallActive;
    console.log('🔄 Resetting user silence timeout...', { userSilenceTimeout, isCallActive: effectiveIsCallActive, forceActive, userHasResponded });
    setLastUserTranscriptTime(Date.now());
    
    if (userSilenceTimeoutId) {
      console.log('⏹️ Clearing existing user silence timeout');
      clearTimeout(userSilenceTimeoutId);
    }
    
    // Only start silence timer if call is active AND user has responded to Lars at least once
    if (effectiveIsCallActive && userSilenceTimeout && userHasResponded) {
      console.log(`⏰ Starting true silence detection: ${userSilenceTimeout}ms`);
      
      // Use polling to check for true silence (no speech from anyone)
      const checkForSilence = () => {
        const now = Date.now();
        const timeSinceLastSpeech = now - lastAnySpeechTime;
        console.log(`🔍 SILENCE CHECK: ${timeSinceLastSpeech}ms since last speech (threshold: ${userSilenceTimeout}ms)`);
        console.log(`🔍 Times: now=${now}, lastSpeech=${lastAnySpeechTime}, diff=${timeSinceLastSpeech}`);
        
        if (timeSinceLastSpeech >= userSilenceTimeout) {
          console.log(`⏰ SILENCE TIMEOUT TRIGGERED! ${timeSinceLastSpeech}ms >= ${userSilenceTimeout}ms`);
          console.log('🤐 True silence detected - ending call naturally');
          handleSilenceTimeout();
        } else {
          // Schedule next check
          const remainingTime = userSilenceTimeout - timeSinceLastSpeech;
          const nextCheckTime = Math.min(remainingTime, 1000); // Check every 1s or when timeout should occur
          const timeoutId = window.setTimeout(checkForSilence, nextCheckTime);
          setUserSilenceTimeoutId(timeoutId);
        }
      };
      
      // Start checking after a small delay
      const timeoutId = window.setTimeout(checkForSilence, 1000);
      setUserSilenceTimeoutId(timeoutId);
      
    } else {
      console.log('❌ Not setting silence timeout:', { isCallActive: effectiveIsCallActive, userSilenceTimeout, userHasResponded });
    }
    
    // Helper function to handle silence timeout
    const handleSilenceTimeout = async () => {
      try {
        setAgentStatus('Ending call due to silence...');
        
        // Clear all timeouts
        if (userSilenceTimeoutId) {
          clearTimeout(userSilenceTimeoutId);
          setUserSilenceTimeoutId(null);
        }
        
        // End call and return to waiting
        console.log('🔚 CALLING endCall() function...');
        await endCall();
        console.log('🔚 endCall() completed, session should disconnect now');
        
        // Reset all state to waiting state manually (can't reference returnToWaitingState due to hoisting)
        console.log('🔄 SILENCE TRIGGERED: Manually resetting state to waiting mode');
        setIsCallActive(false);
        setIsWaitingForVoice(true);
        setPhoneToneEnabled(true);
        setVoiceActivationEnabled(true);
        setCallTranscript([]);
        setCurrentConversation(null);
        setUltravoxCallId(null);
        conversationRef.current = null;
        setAgentStatus('ready');
        setUserHasResponded(false);
        setLastAnySpeechTime(Date.now());
        
        // Force restart phone tone
        setTimeout(() => {
          console.log('📞 Force restarting phone tone after silence timeout...');
          if (!simpleToneRef.current) {
            simpleToneRef.current = new SimplePhoneTone(0.05);
          }
          simpleToneRef.current.start().catch((err) => {
            console.log('📞 Force restart failed:', err.message);
            if (err.message.includes('AudioContext') || err.message.includes('user gesture') || err.message.includes('not allowed to start')) {
              setShowAudioEnableOverlay(true);
            }
          });
        }, 100);
        
        onSessionEnd?.();
        console.log('✅ SILENCE TIMEOUT COMPLETE: Exhibition session ended due to true silence, app ready for next user');
        
      } catch (error) {
        console.error('❌ Error ending call due to silence:', error);
      }
    };
  }, [userSilenceTimeoutId, isCallActive, userSilenceTimeout, userHasResponded, lastAnySpeechTime, onSessionEnd]);

  // Clear user silence timeout
  const clearUserSilenceTimeout = useCallback(() => {
    if (userSilenceTimeoutId) {
      clearTimeout(userSilenceTimeoutId);
      setUserSilenceTimeoutId(null);
    }
  }, [userSilenceTimeoutId]);


  // Unified return to waiting state function (voice-only exhibition)
  const returnToWaitingState = useCallback(async (reason: string = 'unknown') => {
    console.log(`🔄 RETURN TO WAITING STATE - Reason: ${reason}`);
    console.log(`🔄 Current state: isCallActive=${isCallActive}, isWaitingForVoice=${isWaitingForVoice}`);
    console.log(`🔄 Conversation data: currentConversation=${currentConversation?.id}, ultravoxCallId=${ultravoxCallId}`);
    
    try {
      // Clear session timeout
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
        setSessionTimeoutId(null);
      }
      
      // Clear user silence timeout
      clearUserSilenceTimeout();
      
      // SIMPLE TRANSCRIPT SAVE - Just fetch from Ultravox and save to last conversation
      setTimeout(async () => {
        try {
          console.log('💾 Saving transcript from Ultravox...');
          const response = await fetch('/api/save-last-transcript', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Transcript saved:', result);
          } else {
            console.warn('⚠️ Transcript save failed:', response.status);
          }
        } catch (error) {
          console.error('❌ Failed to save transcript:', error);
        }
      }, 2000); // Wait 2 seconds for call to fully end
      
      // Reset all state to waiting state
      setIsCallActive(false);
      setIsWaitingForVoice(true);
      setPhoneToneEnabled(true); // Restart phone tone
      setVoiceActivationEnabled(true);
      setCallTranscript([]);
      setCurrentConversation(null);
      setUltravoxCallId(null);
      conversationRef.current = null;
      setAgentStatus('ready');
      setUserHasResponded(false); // Reset user response tracking for next call
      setLastAnySpeechTime(Date.now()); // Reset speech tracking for next call
      setConversationEnding(false); // Reset conversation ending flag
      
      // Let main tone effect handle restart based on state changes
      console.log('📞 State reset complete - main tone effect will handle restart');
      
      onSessionEnd?.();
      console.log('✅ RETURN TO WAITING COMPLETE - Exhibition session ended, app ready for next user');
      console.log(`✅ Final state: isCallActive=false, isWaitingForVoice=true, phoneToneEnabled=true, agentStatus=ready`);
    } catch (error) {
      console.error('❌ Error returning to waiting state:', error);
      setAgentStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [sessionTimeoutId, currentConversation, ultravoxCallId, callTranscript, onSessionEnd, clearUserSilenceTimeout, hasUserGesture]);

  // Handle status changes (voice-only exhibition)
  const handleStatusChange = useCallback(async (status: UltravoxSessionStatus | string | undefined) => {
    console.log('📡 Ultravox status change:', status);
    
    if (status) {
      setAgentStatus(status);
      resetSessionTimeout(); // Reset timeout on any activity
      
      // CRITICAL: Detect when Ultravox indicates call has ended naturally
      if (status === 'disconnected' || status === 'disconnecting') {
        console.log(`🔌 Ultravox session ${status} - forcing return to waiting state`);
        console.log(`🔌 Current states: isCallActive=${isCallActive}, isWaitingForVoice=${isWaitingForVoice}`);
        
        // FORCE immediate state reset regardless of current state to fix race condition
        console.log('🔌 Forcing immediate state reset to prevent navigation failure');
        setIsCallActive(false);
        setIsWaitingForVoice(true);
        setPhoneToneEnabled(true);
        setAgentStatus('ready');
        
        // Then call the full cleanup function (non-blocking)
        console.log('🔌 Calling full cleanup function (non-blocking)');
        returnToWaitingState('ultravox session ended'); // Remove await to prevent blocking
        return;
      }
    } else {
      setAgentStatus('ready');
    }
  }, [resetSessionTimeout, isCallActive, isWaitingForVoice, returnToWaitingState]);

  // Handle transcript changes with agent detection
  const handleTranscriptChange = useCallback(async (transcripts: Transcript[] | undefined) => {
    if (transcripts) {
      setCallTranscript([...transcripts]);
      resetSessionTimeout(); // Reset timeout on transcript activity
      
      // Update last speech time for anyone speaking
      const currentTime = Date.now();
      setLastAnySpeechTime(currentTime);
      console.log(`🔊 SPEECH DETECTED: Updated lastAnySpeechTime to ${currentTime}`);
      
      // User silence timeout logic: Reset when user speaks, let it continue when only agent speaks
      const userTranscripts = transcripts.filter(t => t.speaker === 'user');
      const agentTranscripts = transcripts.filter(t => t.speaker === 'agent');
      
      console.log('📝 Transcript update:', { 
        totalTranscripts: transcripts.length, 
        userCount: userTranscripts.length, 
        agentCount: agentTranscripts.length,
        lastAnySpeech: new Date(currentTime).toLocaleTimeString()
      });
      
      if (userTranscripts.length > 0) {
        const latestUserTranscript = userTranscripts[userTranscripts.length - 1];
        console.log('👤 Latest user transcript:', latestUserTranscript.text);
        // Reset user silence timeout when user actually speaks
        if (latestUserTranscript && latestUserTranscript.text.trim().length > 0) {
          console.log('👤 User spoke - resetting silence timeout');
          
          // Mark that user has responded (enables silence detection for future)
          if (!userHasResponded) {
            console.log('🎯 First user response detected - enabling silence detection');
            setUserHasResponded(true);
          }
          
          resetUserSilenceTimeout();
        }
      } else if (agentTranscripts.length > 0) {
        // Agent is speaking - this resets the silence timer
        const latestAgentTranscript = agentTranscripts[agentTranscripts.length - 1];
        console.log('🤖 Agent speaking, resetting silence timer...', latestAgentTranscript.text.substring(0, 50));
      } else {
        console.log('🔇 No transcripts yet...');
      }
      
      // Agent detection logic (same as main app)
      transcripts.forEach((transcript) => {
        const text = transcript.text;
        
        if (text.includes('[AGENT: LARS]')) {
          setCurrentAgent('lars');
          setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
        } else if (text.includes('[AGENT: WIKTORIA]')) {
          setCurrentAgent('wiktoria');
          setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
        }
      });
      
      // Content-based agent detection (reuse agentTranscripts from above)
      if (agentTranscripts.length > 0) {
        const latestAgentTranscript = agentTranscripts[agentTranscripts.length - 1];
        const text = latestAgentTranscript.text.toLowerCase();
        
        // Stop phone tone when agent starts speaking (throttled logging)
        if (phoneToneEnabled) {
          console.log('🤖 Agent speaking detected - stopping phone tone');
        }
        if (simpleToneRef.current) {
          simpleToneRef.current.stop();
        }
        setPhoneToneEnabled(false);
        
        // Lars detection patterns
        if (text.includes('synthetic party') || text.includes('leader lars') || 
            text.includes('*coughs*') || text.includes('bureaucracy')) {
          setCurrentAgent('lars');
          setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
        }
        // Wiktoria detection patterns
        else if (text.includes('jestem wiktoria') || text.includes('president') ||
                 text.includes('*smirks*') || text.includes('prezydent')) {
          setCurrentAgent('wiktoria');
          setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
        }
        
        // Check if conversation ended naturally with goodbye message
        const endPattern = /dziękuję za rozmowę.*dobiegła końca.*do zobaczenia/i;
        if (endPattern.test(latestAgentTranscript.text) && !conversationEnding) {
          console.log('👋 End message detected - conversation finished naturally');
          setConversationEnding(true); // Prevent duplicate triggers
          // Give time for message to complete, then return to waiting
          setTimeout(async () => {
            console.log('👋 Triggering return to waiting after end message');
            await returnToWaitingState('natural conversation end');
          }, 2000);
        }
      }
    }
  }, [resetSessionTimeout, resetUserSilenceTimeout, returnToWaitingState, phoneToneEnabled, conversationEnding]);

  // Handle debug messages
  const handleDebugMessage = useCallback((debugMessage: UltravoxExperimentalMessageEvent) => {
    resetSessionTimeout(); // Reset timeout on debug activity
    
    // Agent detection from debug messages (same logic as main app)
    const messageText = JSON.stringify(debugMessage);
    
    if (messageText.includes('[AGENT: LARS]')) {
      setCurrentAgent('lars');
      setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
    } else if (messageText.includes('[AGENT: WIKTORIA]')) {
      setCurrentAgent('wiktoria');
      setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
    }
  }, [resetSessionTimeout]);

  // Start call when voice is activated
  const handleVoiceActivation = useCallback(async () => {
    if (isCallActive) {
      return; // Already in call
    }
    
    try {
      console.log('🚀 Voice activation triggered - starting call');
      setIsWaitingForVoice(false);
      
      // DON'T stop tone yet - let it continue until Lars speaks
      console.log('📞 Call starting - tone will continue until Lars responds');
      
      setAgentStatus('Starting voice call...');
      setCallTranscript([]);
      setConversationEnding(false); // Reset conversation ending flag for new call
      
      // Generate call key
      const newKey = `exhibition-${Date.now()}`;
      
      // Setup call config
      let callConfig: CallConfig = {
        systemPrompt: demoConfig.callConfig.systemPrompt,
        model: demoConfig.callConfig.model,
        languageHint: demoConfig.callConfig.languageHint,
        voice: demoConfig.callConfig.voice,
        temperature: demoConfig.callConfig.temperature,
        maxDuration: demoConfig.callConfig.maxDuration,
        timeExceededMessage: demoConfig.callConfig.timeExceededMessage
      };

      const paramOverride: { [key: string]: any } = {
        "callId": newKey
      };

      let cpTool: SelectedTool | undefined = demoConfig?.callConfig?.selectedTools?.find(tool => tool.toolName === "createProfile");
      if (cpTool) {
        cpTool.parameterOverrides = paramOverride;
      }
      callConfig.selectedTools = demoConfig.callConfig.selectedTools;

      // Create database conversation
      try {
        const conversation = await saveConversation({
          ultravox_call_id: newKey,
          user_name: 'Exhibition Visitor',
          topic: 'Art Exhibition Interaction'
        });
        
        conversationRef.current = conversation;
        setCurrentConversation(conversation);
        console.log('💾 EXHIBITION CONVERSATION CREATED:', conversation.id);
        console.log('💾 CONVERSATION OBJECT:', conversation);
      } catch (error) {
        console.error('❌ Failed to create exhibition conversation:', error);
      }

      // Start the actual call
      const callData = await startCall({
        onStatusChange: handleStatusChange,
        onTranscriptChange: handleTranscriptChange,
        onDebugMessage: handleDebugMessage
      }, callConfig, showDebugInfo);

      setUltravoxCallId(callData.callId);
      console.log(`🔗 ULTRAVOX CALL ID SET: ${callData.callId}`);
      setIsCallActive(true);
      resetSessionTimeout(); // Start session timeout
      // DO NOT start user silence timeout yet - wait for first user response to Lars
      onSessionStart?.();
      
      console.log('✅ Exhibition call started successfully');
    } catch (error) {
      console.error('❌ Failed to start exhibition call:', error);
      setAgentStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Resume waiting state on error
      setIsWaitingForVoice(true);
      setPhoneToneEnabled(true);
    }
  }, [isCallActive, handleStatusChange, handleTranscriptChange, handleDebugMessage, resetSessionTimeout, resetUserSilenceTimeout, onSessionStart, showDebugInfo]);

  // End call function (session timeout or user silence - calls endCall then returns to waiting)
  const handleEndCallButtonClick = useCallback(async () => {
    try {
      console.log('⏰ Ending call (timeout or silence detected)');
      setAgentStatus('Ending call...');
      
      // Clear all timeouts
      clearUserSilenceTimeout();
      
      await endCall();
      await returnToWaitingState('call ended');
    } catch (error) {
      console.error('❌ Error ending exhibition call:', error);
      setAgentStatus(`Error ending: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [returnToWaitingState, clearUserSilenceTimeout]);

  // Voice activity handlers
  const handleVoiceStart = useCallback(() => {
    console.log('🎤 Voice activity detected in exhibition');
    resetSessionTimeout();
    
    // Reset user silence timeout when user speaks
    if (isCallActive) {
      console.log('👤 User voice activity - resetting silence timeout');
      resetUserSilenceTimeout();
    }
    
    // Capture user gesture for AudioContext - create/resume tone
    if (!hasUserGesture) {
      console.log('📞 User gesture detected - initializing AudioContext for tone');
      setHasUserGesture(true);
      
      // Initialize SimplePhoneTone with user gesture
      if (!simpleToneRef.current) {
        simpleToneRef.current = new SimplePhoneTone(0.05);
      }
      
      // AudioContext initialized, let main effect handle tone management
      console.log('📞 AudioContext ready - tone management handled by main effect');
    } else {
      // User is speaking - stop tone if playing
      if (simpleToneRef.current) {
        console.log('📞 User speaking - stopping tone');
        simpleToneRef.current.stop();
      }
    }
  }, [resetSessionTimeout, resetUserSilenceTimeout, isCallActive, hasUserGesture, phoneToneEnabled, isWaitingForVoice]);

  const handleVoiceEnd = useCallback(() => {
    console.log('🎤 Voice activity ended in exhibition');
  }, []);

  const handleVoiceDetected = useCallback(() => {
    console.log('🎤 Voice detected - stopping tone immediately');
    // Stop tone when voice is detected
    if (simpleToneRef.current) {
      simpleToneRef.current.stop();
    }
    setPhoneToneEnabled(false);
  }, []);

  // No button handlers needed - pure voice activation

  // Handle click to enable audio
  const handleEnableAudio = useCallback(async () => {
    console.log('📞 User clicked to enable audio');
    setHasUserGesture(true);
    setShowAudioEnableOverlay(false);
    
    if (!simpleToneRef.current) {
      simpleToneRef.current = new SimplePhoneTone(0.05);
    }
    
    try {
      await simpleToneRef.current.start();
      console.log('✅ Audio enabled successfully after user click');
    } catch (error) {
      console.error('❌ Audio still failed after user click:', error);
    }
  }, []);

  // Get current agent display name
  const getCurrentAgentLabel = () => {
    return currentAgent === 'lars' ? 'LEADER LARS' : 'WIKTORIA CUKT 2.0';
  };

  return (
    <div className="exhibition-interface h-screen w-full bg-black text-white flex flex-col">
      {/* Audio Enable Overlay */}
      {showAudioEnableOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center p-8">
            <div className="text-6xl mb-4">🔊</div>
            <h2 className="text-3xl font-bold mb-4">Enable Audio</h2>
            <p className="text-xl mb-6 text-gray-300">Click to activate exhibition sound</p>
            <button
              onClick={handleEnableAudio}
              className="bg-white text-black px-8 py-4 text-xl font-bold rounded-lg hover:bg-gray-200 transition-colors"
            >
              Enable Sound
            </button>
          </div>
        </div>
      )}
      
      {/* Minimal Header */}
      <div className="p-6 text-center">
        <h1 className="text-4xl font-bold mb-2">AI POLITICAL PERFORMANCE</h1>
        <div className="text-lg text-gray-300">
          {isWaitingForVoice 
            ? 'Mów • Start to speak • Nie bój się' 
            : isCallActive 
              ? getCurrentAgentLabel()
              : 'System Ready'
          }
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center px-8">
        {isWaitingForVoice ? (
          /* Waiting for Voice State */
          <div className="text-center space-y-8">
            <div className="text-6xl">🎤</div>
            <div className="text-2xl font-light">
              Start speaking to begin your conversation with Lars and Wiktoria
            </div>
            
            {/* SIMPLE TONE BUTTON */}
            <button 
              onClick={() => {
                console.log('🔥 SIMPLE TONE START');
                if (!simpleToneRef.current) {
                  simpleToneRef.current = new SimplePhoneTone(0.1);
                }
                simpleToneRef.current.start().catch(console.error);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              🔥 SIMPLE TONE
            </button>

            {/* EMERGENCY MANUAL START BUTTON */}
            <button 
              onClick={async () => {
                console.log('🔥 DIRECT TONE TEST');
                try {
                  // Create AudioContext directly
                  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
                  console.log('🔥 AudioContext state:', audioContext.state);
                  
                  if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                    console.log('🔥 AudioContext resumed, new state:', audioContext.state);
                  }
                  
                  // Create oscillators for dial tone
                  const gainNode = audioContext.createGain();
                  gainNode.connect(audioContext.destination);
                  gainNode.gain.value = 0.1;
                  
                  const osc1 = audioContext.createOscillator();
                  const osc2 = audioContext.createOscillator();
                  
                  osc1.frequency.setValueAtTime(350, audioContext.currentTime);
                  osc2.frequency.setValueAtTime(440, audioContext.currentTime);
                  
                  osc1.connect(gainNode);
                  osc2.connect(gainNode);
                  
                  osc1.start();
                  osc2.start();
                  
                  console.log('🔥 DIAL TONE SHOULD BE PLAYING NOW!');
                  
                  // Stop after 3 seconds
                  setTimeout(() => {
                    osc1.stop();
                    osc2.stop();
                    console.log('🔥 Stopped dial tone');
                  }, 3000);
                  
                } catch (error) {
                  console.error('🔥 Direct tone test failed:', error);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded"
            >
              🔥 DIRECT TONE TEST
            </button>
            
            {/* Voice Activation Component */}
            <VoiceActivation
              enabled={voiceActivationEnabled}
              isCallActive={isCallActive}
              onVoiceActivation={handleVoiceActivation}
              onVoiceStart={handleVoiceStart}
              onVoiceEnd={handleVoiceEnd}
              onVoiceDetected={handleVoiceDetected}
              showVisualFeedback={true}
            />
            
            {/* TEMP DISABLED: Phone Line Tone Component 
            <PhoneTonePlayer
              ref={phoneToneRef}
              enabled={phoneToneEnabled && isWaitingForVoice}
              toneType="dial"
              showControls={showDebugInfo}
              onStart={() => console.log('📞 Phone tone started')}
              onStop={() => console.log('📞 Phone tone stopped')}
              onError={(error) => console.error('📞 Phone tone error:', error)}
            />
            */}
          </div>
        ) : isCallActive ? (
          /* Active Call State */
          <div className="space-y-6">
            {/* Agent Status */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400 mb-2">
                {getCurrentAgentLabel()}
              </div>
              <div className="text-sm text-gray-400">
                {agentStatus}
              </div>
            </div>

            {/* Transcript Display */}
            <div 
              ref={transcriptContainerRef}
              className="h-64 overflow-y-auto bg-gray-900 rounded-lg p-4 space-y-3"
            >
              {callTranscript && callTranscript.map((transcript, index) => (
                <div key={index} className="text-sm">
                  {transcript.speaker === 'user' ? (
                    <div className="text-blue-400">
                      <strong>YOU:</strong> {transcript.text}
                    </div>
                  ) : (
                    <div className="text-white">
                      <strong className="text-red-400">
                        {currentAgent === 'lars' ? 'LARS:' : 'WIKTORIA:'}
                      </strong> {transcript.text}
                    </div>
                  )}
                </div>
              ))}
            </div>


            {/* Session Info */}
            {showDebugInfo && (
              <div className="text-center text-xs text-gray-500">
                Session active • Auto-timeout in {Math.round(sessionTimeout / 1000)}s
              </div>
            )}
          </div>
        ) : (
          /* System Ready State */
          <div className="text-center">
            <div className="text-xl text-gray-400">System Ready</div>
          </div>
        )}
      </div>

      {/* Footer with Manual Controls (Development Only) */}
      {showDebugInfo && (
        <div className="p-4 bg-gray-900 text-xs">
          <div className="flex justify-between items-center">
            <div>Mode: {modeConfig.mode} | Voice: {voiceActivationEnabled ? 'ON' : 'OFF'} | Phone Tone: {phoneToneEnabled ? 'ON' : 'OFF'}</div>
            <div className="space-x-2">
              <button
                onClick={() => {
                  const logs = localStorage.getItem('exhibition_logs');
                  if (logs) {
                    const blob = new Blob([JSON.parse(logs).join('\n')], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'exhibition_logs.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  } else {
                    alert('No logs available');
                  }
                }}
                className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700"
              >
                📋 Download Logs
              </button>
              
              {isCallActive ? (
                <button
                  onClick={handleEndCallButtonClick}
                  className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
                >
                  End Call
                </button>
              ) : (
                <button
                  onClick={handleVoiceActivation}
                  className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
                >
                  Manual Start
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Always visible log download button */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => {
            const logs = localStorage.getItem('exhibition_logs');
            if (logs) {
              const blob = new Blob([JSON.parse(logs).join('\n')], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'exhibition_logs.txt';
              a.click();
              URL.revokeObjectURL(url);
            } else {
              alert('No logs available');
            }
          }}
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
        >
          📋 Logs
        </button>
      </div>
    </div>
  );
}