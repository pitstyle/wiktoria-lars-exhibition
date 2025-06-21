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
      
      // Get the latest agent transcript to determine current agent
      const agentTranscripts = transcripts.filter(t => t.speaker === 'agent');
      
      if (agentTranscripts.length > 0) {
        const latestAgentTranscript = agentTranscripts[agentTranscripts.length - 1];
        const text = latestAgentTranscript.text.toLowerCase();
        
        // Detect Lars patterns
        if (text.includes('lovely to meet you') || 
            text.includes('what topic would you like') ||
            text.includes('fascinating') ||
            text.includes('collapsed democratic') ||
            text.includes('synthetic tobacco') ||
            text.includes('!?!!?!')) {
          setCurrentAgent('lars');
          setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
          console.log('Detected Lars speaking based on content');
        }
        // Detect Wiktoria patterns
        else if (text.includes('system analysis') ||
                 text.includes('narrative efficiency') ||
                 text.includes('technical culture') ||
                 text.includes('calculated') ||
                 text.includes('optimization') ||
                 text.includes('probability')) {
          setCurrentAgent('wiktoria');
          setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
          console.log('Detected Wiktoria speaking based on content');
        }
      }
    }
  }, []);

  const handleDebugMessage = useCallback((debugMessage: UltravoxExperimentalMessageEvent) => {
    setCallDebugMessages(prevMessages => [...prevMessages, debugMessage]);
    
    // Debug logging
    console.log('Debug message:', debugMessage);
    
    // Track voice changes to determine current agent
    if (debugMessage.type === 'voice_changed' && (debugMessage as any).voice?.voiceId) {
      const voiceId = (debugMessage as any).voice.voiceId;
      console.log('Voice changed to:', voiceId);
      setCurrentVoiceId(voiceId);
      
      // Update current agent based on voice ID
      if (voiceId === '876ac038-08f0-4485-8b20-02b42bcf3416') {
        setCurrentAgent('lars');
        console.log('Agent set to Lars');
      } else if (voiceId === '2e40bf21-8c36-45db-a408-5a3fc8d833db') {
        setCurrentAgent('wiktoria');
        console.log('Agent set to Wiktoria');
      }
    }
    
    // Track tool calls that indicate agent transitions
    const messageText = JSON.stringify(debugMessage);
    if (messageText.includes('transferToWiktoria') || messageText.includes('returnToWiktoria')) {
      console.log('Detected transfer to Wiktoria');
      setCurrentAgent('wiktoria');
      setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
    } else if (messageText.includes('requestLarsPerspective')) {
      console.log('Detected request for Lars perspective');
      setCurrentAgent('lars');
      setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
    }
  }, []);

  const clearCustomerProfile = useCallback(() => {
    // This will trigger a re-render of CustomerProfileForm with a new empty profile
    setCustomerProfileKey(prev => prev ? `${prev}-cleared` : 'cleared');
  }, []);

  const getCurrentAgentLabel = () => {
    console.log('🎯 Getting agent label - currentAgent:', currentAgent, 'currentVoiceId:', currentVoiceId);
    
    const activeVoiceId = currentVoiceId;
    
    // Primary check: voice ID
    if (activeVoiceId === '876ac038-08f0-4485-8b20-02b42bcf3416') {
      console.log('Returning LEADER LARS via voice ID');
      return 'LEADER LARS';
    } else if (activeVoiceId === '2e40bf21-8c36-45db-a408-5a3fc8d833db') {
      console.log('Returning WIKTORIA CUKT 2.0 via voice ID');
      return 'WIKTORIA CUKT 2.0';
    }
    
    // Fallback: check current agent state
    if (currentAgent === 'lars') {
      console.log('Returning LEADER LARS via agent state');
      return 'LEADER LARS';
    } else if (currentAgent === 'wiktoria') {
      console.log('Returning WIKTORIA CUKT 2.0 via agent state');
      return 'WIKTORIA CUKT 2.0';
    }
    
    // Default to Lars since conversation starts with him
    console.log('Returning default LEADER LARS');
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
                                  <p className="mb-4"><span>{transcript.text}</span></p>
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