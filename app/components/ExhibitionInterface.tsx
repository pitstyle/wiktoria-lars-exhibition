'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { startCall, endCall } from '@/lib/callFunctions';
import { CallConfig, SelectedTool } from '@/lib/types';
import { larsWiktoriaEnhancedConfig as demoConfig } from '@/app/lars-wiktoria-enhanced-config';
import { Role, Transcript, UltravoxExperimentalMessageEvent, UltravoxSessionStatus } from 'ultravox-client';
import { saveConversation, updateConversationEnd, Conversation } from '@/lib/supabase';
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
  const [lastActivityTime, setLastActivityTime] = useState<number>(Date.now());
  
  // Voice and audio state
  const [voiceActivationEnabled, setVoiceActivationEnabled] = useState(true); // START ENABLED
  const [phoneToneEnabled, setPhoneToneEnabled] = useState(true); // START ENABLED FOR AMBIENT SOUND
  const [hasUserGesture, setHasUserGesture] = useState(false); // Track if we have user gesture
  
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Conversation | null>(null);
  // TEMP DISABLED: const phoneToneRef = useRef<PhoneTonePlayerRef>(null);
  const simpleToneRef = useRef<SimplePhoneTone | null>(null);
  
  // Get exhibition configuration
  const modeConfig = getModeConfig();
  const sessionTimeout = modeConfig.autoTimeout || 45000; // 45 seconds default
  
  // Debug logging for exhibition interface
  useEffect(() => {
    console.log('🎨 Exhibition interface mounted');
    console.log('🎨 Mode config:', modeConfig);
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
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Simple tone management
  useEffect(() => {
    const agentTranscripts = callTranscript?.filter(t => t.speaker === 'agent') || [];
    console.log('📞 Simple tone effect:', { phoneToneEnabled, isWaitingForVoice, agentCount: agentTranscripts.length });
    
    if (phoneToneEnabled && (isWaitingForVoice || (isCallActive && agentTranscripts.length === 0))) {
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
  }, [phoneToneEnabled, isWaitingForVoice, isCallActive, callTranscript]);

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

  // Handle status changes
  const handleStatusChange = useCallback((status: UltravoxSessionStatus | string | undefined) => {
    if (status) {
      setAgentStatus(status);
      resetSessionTimeout(); // Reset timeout on any activity
    } else {
      setAgentStatus('ready');
    }
  }, [resetSessionTimeout]);

  // Handle transcript changes with agent detection
  const handleTranscriptChange = useCallback(async (transcripts: Transcript[] | undefined) => {
    if (transcripts) {
      setCallTranscript([...transcripts]);
      resetSessionTimeout(); // Reset timeout on transcript activity
      
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
      
      // Content-based agent detection
      const agentTranscripts = transcripts.filter(t => t.speaker === 'agent');
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
      }
    }
  }, [resetSessionTimeout]);

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
        console.log('💾 Exhibition conversation created:', conversation.id);
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
      setIsCallActive(true);
      resetSessionTimeout(); // Start session timeout
      onSessionStart?.();
      
      console.log('✅ Exhibition call started successfully');
    } catch (error) {
      console.error('❌ Failed to start exhibition call:', error);
      setAgentStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Resume waiting state on error
      setIsWaitingForVoice(true);
      setPhoneToneEnabled(true);
    }
  }, [isCallActive, handleStatusChange, handleTranscriptChange, handleDebugMessage, resetSessionTimeout, onSessionStart, showDebugInfo]);

  // End call function
  const handleEndCallButtonClick = useCallback(async () => {
    try {
      console.log('🛑 Ending exhibition call');
      setAgentStatus('Ending call...');
      
      // Clear session timeout
      if (sessionTimeoutId) {
        clearTimeout(sessionTimeoutId);
        setSessionTimeoutId(null);
      }
      
      await endCall();
      setIsCallActive(false);

      // Archive conversation
      if (currentConversation && ultravoxCallId) {
        try {
          const response = await fetch('/api/fetch-ultravox-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              callId: ultravoxCallId,
              conversationId: currentConversation.id 
            })
          });
          
          if (response.ok) {
            console.log('💾 Exhibition transcript archived successfully');
          }
          
          await updateConversationEnd(currentConversation.id, callTranscript?.length || 0);
        } catch (error) {
          console.error('❌ Failed to archive exhibition conversation:', error);
        }
      }
      
      // Reset to waiting state
      setIsWaitingForVoice(true);
      setPhoneToneEnabled(true); // Restart phone tone
      setVoiceActivationEnabled(true);
      setCallTranscript([]);
      setCurrentConversation(null);
      setUltravoxCallId(null);
      conversationRef.current = null;
      setAgentStatus('ready');
      
      onSessionEnd?.();
      console.log('✅ Exhibition session ended, returning to waiting state');
    } catch (error) {
      console.error('❌ Error ending exhibition call:', error);
      setAgentStatus(`Error ending: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [sessionTimeoutId, currentConversation, ultravoxCallId, callTranscript, onSessionEnd]);

  // Voice activity handlers
  const handleVoiceStart = useCallback(() => {
    console.log('🎤 Voice activity detected in exhibition');
    resetSessionTimeout();
    
    // Retry phone tone after first voice activity (user gesture achieved)
    if (!hasUserGesture) {
      console.log('📞 User gesture detected - retrying simple tone');
      setHasUserGesture(true);
      
      // Retry starting the simple tone now that we have user gesture
      if (simpleToneRef.current && phoneToneEnabled && isWaitingForVoice) {
        simpleToneRef.current.start().catch(console.error);
      }
    }
  }, [resetSessionTimeout, hasUserGesture, phoneToneEnabled, isWaitingForVoice]);

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

  // Get current agent display name
  const getCurrentAgentLabel = () => {
    return currentAgent === 'lars' ? 'LEADER LARS' : 'WIKTORIA CUKT 2.0';
  };

  return (
    <div className="exhibition-interface h-screen w-full bg-black text-white flex flex-col">
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
    </div>
  );
}