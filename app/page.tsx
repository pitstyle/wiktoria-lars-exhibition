'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { startCall, endCall } from '@/lib/callFunctions'
import { CallConfig, SelectedTool } from '@/lib/types'
import { larsWiktoriaEnhancedConfig as demoConfig } from '@/app/lars-wiktoria-enhanced-config';
import { Role, Transcript, UltravoxExperimentalMessageEvent, UltravoxSessionStatus } from 'ultravox-client';
import CallStatus from '@/components/CallStatus';
import DebugMessages from '@/components/DebugMessages';
import MicToggleButton from '@/components/MicToggleButton';
import { PhoneOffIcon } from 'lucide-react';

type SearchParamsProps = {
  showMuteSpeakerButton: boolean;
  modelOverride: string | undefined;
  showDebugMessages: boolean;
  showUserTranscripts: boolean;
};

type SearchParamsHandlerProps = {
  children: (props: SearchParamsProps) => React.ReactNode;
};

function SearchParamsHandler({ children }: SearchParamsHandlerProps) {
  // Process query params to see if we want to change the behavior for showing speaker mute button or changing the model
  const searchParams = useSearchParams();
  const showMuteSpeakerButton = searchParams.get('showSpeakerMute') === 'true';
  const showDebugMessages = searchParams.get('showDebugMessages') === 'true';
  const showUserTranscripts = searchParams.get('showUserTranscripts') === 'true';
  let modelOverride: string | undefined;
  
  if (searchParams.get('model')) {
    modelOverride = "fixie-ai/" + searchParams.get('model');
  }

  return children({ showMuteSpeakerButton, modelOverride, showDebugMessages, showUserTranscripts });
}

export default function Home() {
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('off');
  const [callTranscript, setCallTranscript] = useState<Transcript[] | null>([]);
  const [callDebugMessages, setCallDebugMessages] = useState<UltravoxExperimentalMessageEvent[]>([]);
  const [customerProfileKey, setCustomerProfileKey] = useState<string | null>(null);
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('876ac038-08f0-4485-8b20-02b42bcf3416'); // Start with Lars
  const [currentAgent, setCurrentAgent] = useState<string>('lars'); // Track current agent
  const [voiceIssues, setVoiceIssues] = useState<string[]>([]); // Track voice problems
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript]);


  const handleStatusChange = useCallback((status: UltravoxSessionStatus | string | undefined) => {
    if(status) {
      setAgentStatus(status);
    } else {
      setAgentStatus('off');
    }
    
  }, []);

  const handleTranscriptChange = useCallback((transcripts: Transcript[] | undefined) => {
    if(transcripts) {
      setCallTranscript([...transcripts]);
      
      console.log('🔍 All transcript speakers in this batch:', transcripts.map(t => `${t.speaker}: "${t.text.substring(0, 20)}..."`));
      
      // ENHANCED: Check ALL transcripts for agent markers, not just agent ones
      transcripts.forEach((transcript, index) => {
        const text = transcript.text;
        
        // Check for explicit agent markers in ANY transcript (including tool results)
        if (text.includes('[AGENT: LARS]')) {
          setCurrentAgent('lars');
          setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
          console.log('🏷️ Detected LARS via [AGENT: LARS] marker in transcript');
        } else if (text.includes('[AGENT: WIKTORIA]')) {
          setCurrentAgent('wiktoria');
          setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
          console.log('🏷️ Detected WIKTORIA via [AGENT: WIKTORIA] marker in transcript');
        }
      });
      
      // Get the latest agent transcript for content-based detection as fallback
      const agentTranscripts = transcripts.filter(t => t.speaker === 'agent');
      
      if (agentTranscripts.length > 0) {
        const latestAgentTranscript = agentTranscripts[agentTranscripts.length - 1];
        const text = latestAgentTranscript.text;
        const lowerText = text.toLowerCase();
        
        // Enhanced content-based detection with Lars character patterns
        if (lowerText.includes('synthetic party') || 
            lowerText.includes('leader lars') ||
            lowerText.includes('chain-smoking') ||
            lowerText.includes('gravel-voiced') ||
            lowerText.includes('anarchic') ||
            lowerText.includes('bureaucracy') ||
            lowerText.includes('citizen') ||
            lowerText.includes('lars here') ||
            lowerText.includes('coughs') ||
            lowerText.includes('puffs') ||
            lowerText.includes('chuckles') ||
            lowerText.includes('winks') ||
            lowerText.includes('taps pen') ||
            lowerText.includes('spit it out') ||
            text.includes('*coughs*') ||
            text.includes('*chuckles*') ||
            text.includes('*winks*')) {
          setCurrentAgent('lars');
          setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
          console.log('🔍 Detected Lars speaking based on character patterns');
        }
        // Enhanced Wiktoria detection with her specific patterns
        else if (lowerText.includes('ai president') ||
                 lowerText.includes('president of poland') ||
                 lowerText.includes('wiktoria cukt') ||
                 lowerText.includes('sharp, dignified') ||
                 lowerText.includes('jako prezydentka') ||
                 lowerText.includes('legislative') ||
                 lowerText.includes('executive') ||
                 lowerText.includes('ustawodawczym') ||
                 lowerText.includes('wykonawczym') ||
                 lowerText.includes('task force') ||
                 lowerText.includes('comprehensive plan') ||
                 lowerText.includes('public-private') ||
                 lowerText.includes('sharp tone') ||
                 text.includes('*smirks*') ||
                 text.includes('*eyes narrow*') ||
                 text.includes('*leans in*')) {
          setCurrentAgent('wiktoria');
          setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
          console.log('🔍 Detected Wiktoria speaking based on character patterns');
        }
      }
    }
  }, []);

  const handleDebugMessage = useCallback((debugMessage: UltravoxExperimentalMessageEvent) => {
    setCallDebugMessages(prevMessages => [...prevMessages, debugMessage]);
    
    // Debug logging for ALL voice-related events
    console.log('🔍 Debug message type:', debugMessage.type);
    console.log('🔍 Debug message:', debugMessage);
    
    // Get message text for analysis
    const messageText = JSON.stringify(debugMessage);
    
    // ENHANCED voice issue detection - catch voice fading, cutting off, interruptions
    if (debugMessage.type === 'audio_stopped' || 
        debugMessage.type === 'audio_interrupted' || 
        debugMessage.type === 'audio_error' ||
        debugMessage.type === 'voice_error' ||
        debugMessage.type === 'connection_lost' ||
        debugMessage.type === 'stream_error' ||
        debugMessage.type === 'audio_timeout' ||
        debugMessage.type === 'voice_timeout' ||
        debugMessage.type === 'synthesis_error' ||
        debugMessage.type === 'playback_error' ||
        // Catch any message with voice/audio issues in content
        messageText.toLowerCase().includes('voice stopped') ||
        messageText.toLowerCase().includes('audio stopped') ||
        messageText.toLowerCase().includes('voice interrupted') ||
        messageText.toLowerCase().includes('audio interrupted') ||
        messageText.toLowerCase().includes('synthesis failed') ||
        messageText.toLowerCase().includes('playback failed')) {
      
      const issueDescription = `${new Date().toLocaleTimeString()}: ${debugMessage.type} - Voice issue detected`;
      console.log('⚠️ VOICE ISSUE DETECTED:', debugMessage.type);
      console.log('⚠️ Voice issue details:', debugMessage);
      
      setVoiceIssues(prev => [...prev, issueDescription].slice(-10)); // Keep last 10 issues
    }
    
    // ENHANCED agent detection - multiple detection methods
    // Method 1: Tool result messages with [AGENT: NAME] markers
    if (messageText.includes('[AGENT: LARS]')) {
      console.log('🏷️ LARS detected via [AGENT: LARS] marker');
      setCurrentAgent('lars');
      setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
    } else if (messageText.includes('[AGENT: WIKTORIA]')) {
      console.log('🏷️ WIKTORIA detected via [AGENT: WIKTORIA] marker');
      setCurrentAgent('wiktoria');
      setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
    }
    
    // Method 2: Tool calls by name
    if (messageText.includes('transferToWiktoria') || 
        messageText.includes('returnToWiktoria') ||
        messageText.includes('"transferToWiktoria"') ||
        messageText.includes('"returnToWiktoria"')) {
      console.log('🏷️ WIKTORIA detected via transfer tool call');
      setCurrentAgent('wiktoria');
      setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
    } else if (messageText.includes('requestLarsPerspective') ||
               messageText.includes('"requestLarsPerspective"')) {
      console.log('🏷️ LARS detected via perspective tool call');
      setCurrentAgent('lars');
      setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
    }
    
    // Method 3: Voice changes
    if (debugMessage.type === 'voice_changed' && (debugMessage as any).voice?.voiceId) {
      const voiceId = (debugMessage as any).voice.voiceId;
      console.log('🎤 Voice changed to:', voiceId);
      setCurrentVoiceId(voiceId);
      
      // Update current agent based on voice ID
      if (voiceId === '876ac038-08f0-4485-8b20-02b42bcf3416') {
        setCurrentAgent('lars');
        console.log('🎤 Agent set to Lars via voice change');
      } else if (voiceId === '2e40bf21-8c36-45db-a408-5a3fc8d833db') {
        setCurrentAgent('wiktoria');
        console.log('🎤 Agent set to Wiktoria via voice change');
      }
    }
    
    // Method 4: Tool results and status changes
    if (debugMessage.type === 'tool_result' || debugMessage.type === 'status_change') {
      if (messageText.includes('Lars') && !messageText.includes('Wiktoria')) {
        console.log('🏷️ LARS detected via tool result content');
        setCurrentAgent('lars');
        setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
      } else if (messageText.includes('Wiktoria') && !messageText.includes('Lars')) {
        console.log('🏷️ WIKTORIA detected via tool result content');
        setCurrentAgent('wiktoria');
        setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
      }
    }
  }, []);

  const clearCustomerProfile = useCallback(() => {
    // This will trigger a re-render of CustomerProfileForm with a new empty profile
    setCustomerProfileKey(prev => prev ? `${prev}-cleared` : 'cleared');
  }, []);

  const getCurrentAgentLabel = () => {
    console.log('🎯 Getting agent label - currentAgent:', currentAgent, 'currentVoiceId:', currentVoiceId);
    console.log('🎯 Voice ID match check - Lars:', currentVoiceId === '876ac038-08f0-4485-8b20-02b42bcf3416', 'Wiktoria:', currentVoiceId === '2e40bf21-8c36-45db-a408-5a3fc8d833db');
    
    const activeVoiceId = currentVoiceId;
    
    // Primary check: voice ID
    if (activeVoiceId === '876ac038-08f0-4485-8b20-02b42bcf3416') {
      console.log('✅ Returning LEADER LARS via voice ID');
      return 'LEADER LARS';
    } else if (activeVoiceId === '2e40bf21-8c36-45db-a408-5a3fc8d833db') {
      console.log('✅ Returning WIKTORIA CUKT 2.0 via voice ID');
      return 'WIKTORIA CUKT 2.0';
    }
    
    // Fallback: check current agent state
    if (currentAgent === 'lars') {
      console.log('✅ Returning LEADER LARS via agent state');
      return 'LEADER LARS';
    } else if (currentAgent === 'wiktoria') {
      console.log('✅ Returning WIKTORIA CUKT 2.0 via agent state');
      return 'WIKTORIA CUKT 2.0';
    }
    
    // Default to Lars since conversation starts with him
    console.log('⚠️ Using default LEADER LARS - no detection matched');
    return 'LEADER LARS';
  };

  const handleStartCallButtonClick = async (modelOverride?: string, showDebugMessages?: boolean) => {
    try {
      handleStatusChange('Starting call...');
      setCallTranscript(null);
      setCallDebugMessages([]);
      clearCustomerProfile();

      // Generate a new key for the customer profile
      const newKey = `call-${Date.now()}`;
      setCustomerProfileKey(newKey);

      // Setup our call config including the call key as a parameter restriction
      let callConfig: CallConfig = {
        systemPrompt: demoConfig.callConfig.systemPrompt,
        model: modelOverride || demoConfig.callConfig.model,
        languageHint: demoConfig.callConfig.languageHint,
        voice: demoConfig.callConfig.voice,
        temperature: demoConfig.callConfig.temperature,
        maxDuration: demoConfig.callConfig.maxDuration,
        timeExceededMessage: demoConfig.callConfig.timeExceededMessage
      };

      const paramOverride: { [key: string]: any } = {
        "callId": newKey
      }

      let cpTool: SelectedTool | undefined = demoConfig?.callConfig?.selectedTools?.find(tool => tool.toolName === "createProfile");
      
      if (cpTool) {
        cpTool.parameterOverrides = paramOverride;
      }
      callConfig.selectedTools = demoConfig.callConfig.selectedTools;

      await startCall({
        onStatusChange: handleStatusChange,
        onTranscriptChange: handleTranscriptChange,
        onDebugMessage: handleDebugMessage
      }, callConfig, showDebugMessages);

      setIsCallActive(true);
      handleStatusChange('Call started successfully');
    } catch (error) {
      handleStatusChange(`Error starting call: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEndCallButtonClick = async () => {
    try {
      handleStatusChange('Ending call...');
      await endCall();
      setIsCallActive(false);

      clearCustomerProfile();
      setCustomerProfileKey(null);
      handleStatusChange('Call ended successfully');
    } catch (error) {
      handleStatusChange(`Error ending call: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsHandler>
        {({ showMuteSpeakerButton, modelOverride, showDebugMessages, showUserTranscripts }: SearchParamsProps) => (
          <div className="flex flex-col items-center justify-center min-h-screen py-4">
            {/* Logo with Title */}
            <div className="mb-8 relative">
              <img src="/Ai_3d03.png" alt="ART Logo" className="w-80 h-auto" />
              <h1 className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-xl font-bold text-white whitespace-nowrap">AI POLITICAL PERFORMANCE</h1>
            </div>
            {/* Main Area */}
            <div className="max-w-[800px] mx-auto w-[90%] h-[60vh] py-3 pl-5 pr-[10px] border border-[#2A2A2A] rounded-[3px] bg-white text-black overflow-hidden">
              {/* Dynamic Agent Label - Only show when call is active */}
              {isCallActive && (
                <div className="text-red-500 font-bold text-xl mb-4">
                  {getCurrentAgentLabel()}
                </div>
              )}
              <div className="flex flex-col justify-center">
                {/* Action Area */}
                <div className="w-full">
                  <div className="flex flex-col justify-between items-start h-full font-mono p-4 ">
                    {isCallActive ? (
                      <div className="w-full">
                        <div className="mb-5 relative">
                          <div 
                            ref={transcriptContainerRef}
                            className="h-[20vh] p-2.5 overflow-y-auto relative"
                          >
                            {callTranscript && callTranscript.map((transcript, index) => (
                              <div key={index}>
                                {transcript.speaker === 'user' ? (
                                  <p className="mb-4 text-red-500"><span><strong>USER:</strong> {transcript.text}</span></p>
                                ) : (
                                  <p className="mb-4 text-black">
                                    <span>
                                      <strong className="text-red-500">
                                        {currentAgent === 'lars' ? 'LEADER LARS:' : 'WIKTORIA CUKT 2.0:'}
                                      </strong> {transcript.text}
                                    </span>
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between space-x-4 p-4 w-full">
                          <MicToggleButton role={Role.USER}/>
                          { showMuteSpeakerButton && <MicToggleButton role={Role.AGENT}/> }
                          <button
                            type="button"
                            className="flex-grow flex items-center justify-center h-10 bg-red-500"
                            onClick={handleEndCallButtonClick}
                            disabled={!isCallActive}
                          >
                            <PhoneOffIcon width={24} className="brightness-0 invert" />
                            <span className="ml-2">End Call</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="h-[20vh] text-gray-400 mb-6 flex items-center justify-center">
                          {demoConfig.overview}
                        </div>
                        <button
                          type="button"
                          className="hover:bg-gray-700 px-6 py-2 border-2 w-full mb-4"
                          onClick={() => handleStartCallButtonClick(modelOverride, showDebugMessages)}
                        >
                          Start Call
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Call Status */}
                  <CallStatus status={agentStatus}>
                  </CallStatus>
                  {/* Voice Issues Debug */}
                  {voiceIssues.length > 0 && (
                    <div className="mt-4 p-2 bg-red-100 border border-red-300 rounded text-xs">
                      <strong>Voice Issues Detected:</strong>
                      {voiceIssues.map((issue, index) => (
                        <div key={index} className="text-red-600">{issue}</div>
                      ))}
                    </div>
                  )}
                  {/* Debug View */}
                  <DebugMessages debugMessages={callDebugMessages} />
                </div>
              </div>
            </div>
          </div>
        )}
      </SearchParamsHandler>
    </Suspense>
  )
}