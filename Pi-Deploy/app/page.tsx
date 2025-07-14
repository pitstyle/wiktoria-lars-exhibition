'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { startCall, endCall } from '@/lib/callFunctions'
import { CallConfig, SelectedTool } from '@/lib/types'
import { larsWiktoriaEnhancedConfig as demoConfig } from '@/app/lars-wiktoria-enhanced-config';
import { Role, Transcript, UltravoxExperimentalMessageEvent, UltravoxSessionStatus } from 'ultravox-client';
import CallStatus from '@/app/components/CallStatus';
import DebugMessages from '@/app/components/DebugMessages';
import MicToggleButton from '@/app/components/MicToggleButton';
import AnalyticsDashboard from '@/app/components/AnalyticsDashboard';
import ExhibitionInterface from '@/app/components/ExhibitionInterface';
import { PhoneOffIcon } from 'lucide-react';
import { saveConversation, saveTranscript, updateConversationEnd, Conversation } from '@/lib/supabase';
import { isExhibitionMode, getModeConfig } from '@/lib/exhibitionMode';

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
  // State for mode detection (client-side only to avoid hydration issues)
  const [isClient, setIsClient] = useState(false);
  const [exhibitionMode, setExhibitionMode] = useState(false);
  const [modeConfig, setModeConfig] = useState(getModeConfig());
  
  // Detect mode on client side
  useEffect(() => {
    setIsClient(true);
    const isExhibition = isExhibitionMode();
    setExhibitionMode(isExhibition);
    setModeConfig(getModeConfig());
  }, []);
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>('off');
  const [callTranscript, setCallTranscript] = useState<Transcript[] | null>([]);
  const [callDebugMessages, setCallDebugMessages] = useState<UltravoxExperimentalMessageEvent[]>([]);
  const [customerProfileKey, setCustomerProfileKey] = useState<string | null>(null);
  const [ultravoxCallId, setUltravoxCallId] = useState<string | null>(null); // Track actual Ultravox call ID
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('876ac038-08f0-4485-8b20-02b42bcf3416'); // Start with Lars
  const [currentAgent, setCurrentAgent] = useState<string>('lars'); // Track current agent
  const [voiceIssues, setVoiceIssues] = useState<string[]>([]); // Track voice problems
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null); // Database conversation
  const [userName, setUserName] = useState<string>(''); // User name for conversation tracking
  const [topic, setTopic] = useState<string>(''); // Topic for conversation tracking
  const [currentStage, setCurrentStage] = useState<string>('initial'); // Current conversation stage
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<Conversation | null>(null); // Immediate reference for transcript saving
  const lastSavedTranscripts = useRef<Map<string, string>>(new Map()); // Track last saved content per speaker
  
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

  const handleTranscriptChange = useCallback(async (transcripts: Transcript[] | undefined) => {
    console.log('🚨 handleTranscriptChange called with:', transcripts ? transcripts.length : 'undefined', 'transcripts');
    
    if(transcripts) {
      setCallTranscript([...transcripts]);
      
      console.log('🔍 Transcript batch received:', transcripts.length, 'messages');
      
      // ENHANCED: Check ALL transcripts for agent markers, not just agent ones
      transcripts.forEach((transcript, index) => {
        const text = transcript.text;
        
        // Check for explicit agent markers in ANY transcript (including tool results)
        if (text.includes('[AGENT: LARS]')) {
          setCurrentAgent('lars');
          setCurrentVoiceId('876ac038-08f0-4485-8b20-02b42bcf3416');
          setCurrentStage('lars-perspective');
          console.log('🏷️ Detected LARS via [AGENT: LARS] marker in transcript');
        } else if (text.includes('[AGENT: WIKTORIA]')) {
          setCurrentAgent('wiktoria');
          setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
          setCurrentStage('wiktoria-response');
          console.log('🏷️ Detected WIKTORIA via [AGENT: WIKTORIA] marker in transcript');
        }
      });
      
      // NOTE: Fragment saving removed - full transcripts will be fetched post-call via Ultravox API
      
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
        else if (lowerText.includes('jestem wiktoria cukt') ||
                 lowerText.includes('wiktoria cukt, prezydent') ||
                 lowerText.includes('president of poland') ||
                 lowerText.includes('prezydent polski') ||
                 lowerText.includes('ai president') ||
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
                 text.includes('*leans in*') ||
                 (lowerText.includes('wiktoria') && !lowerText.includes('transfer') && !lowerText.includes('pass'))) {
          setCurrentAgent('wiktoria');
          setCurrentVoiceId('2e40bf21-8c36-45db-a408-5a3fc8d833db');
          console.log('🔍 Detected Wiktoria speaking based on character patterns');
        }
      }
    }
  }, [currentConversation, currentAgent, currentStage]); // Note: conversationRef doesn't need to be in deps

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
      // Clear saved transcript tracking for new call
      lastSavedTranscripts.current.clear();

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

      // 💾 Database Integration: Create conversation record BEFORE starting call
      try {
        console.log('🚀 Creating conversation with:', {
          ultravox_call_id: newKey,
          user_name: userName || 'Anonymous User',
          topic: topic || 'General Discussion'
        });
        
        const conversation = await saveConversation({
          ultravox_call_id: newKey,
          user_name: userName || 'Anonymous User',
          topic: topic || 'General Discussion'
        });
        
        // Set both ref (immediate) and state (for UI)
        conversationRef.current = conversation;
        setCurrentConversation(conversation);
        console.log('💾 Conversation created in database:', conversation);
        console.log('💾 Conversation ref set immediately:', conversationRef.current?.id);
        handleStatusChange(`Starting call - DB: ${conversation.id.substring(0, 8)}...`);
      } catch (error) {
        console.error('❌ Failed to create conversation:', error);
        console.error('❌ Error details:', error);
        handleStatusChange('Starting call - DB: Connection failed');
        // Continue with call even if DB fails
      }

      const callData = await startCall({
        onStatusChange: handleStatusChange,
        onTranscriptChange: handleTranscriptChange,
        onDebugMessage: handleDebugMessage
      }, callConfig, showDebugMessages);

      // 🚀 Store actual Ultravox call ID for transcript fetching
      setUltravoxCallId(callData.callId);
      console.log('💾 Stored Ultravox call ID:', callData.callId);

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

      // 💾 Database Integration: Fetch full transcript and save complete conversation
      // IMPORTANT: Use actual Ultravox call ID for transcript fetching
      const callId = ultravoxCallId;
      
      if (currentConversation && callId) {
        try {
          handleStatusChange('Fetching full transcript...');
          
          // Fetch complete transcript from Ultravox API
          const response = await fetch('/api/fetch-ultravox-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              callId: callId,
              conversationId: currentConversation.id 
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('💾 Full transcript fetched and saved:', result);
            handleStatusChange('Transcript archived successfully');
          } else {
            console.error('❌ Failed to fetch full transcript:', response.statusText);
            handleStatusChange('Archive failed - continuing...');
          }
          
          // Update conversation end metadata
          await updateConversationEnd(currentConversation.id, callTranscript?.length || 0);
          console.log('💾 Conversation end updated in database');
        } catch (error) {
          console.error('❌ Failed to archive conversation:', error);
          handleStatusChange('Archive failed - continuing...');
        }
      }
      
      // Clear customer profile and call state AFTER database operations
      clearCustomerProfile();
      setCustomerProfileKey(null);
      setUltravoxCallId(null); // Clear actual Ultravox call ID
      
      // Clear both ref and state
      conversationRef.current = null;
      setCurrentConversation(null);
      setUserName('');
      setTopic('');
      setCurrentStage('initial');
      // Clear saved transcript tracking for new call
      lastSavedTranscripts.current.clear();
      handleStatusChange('Call ended successfully');
    } catch (error) {
      handleStatusChange(`Error ending call: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Show loading state until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Exhibition Mode - Use full-screen voice-activated interface
  if (exhibitionMode) {
    return (
      <Suspense fallback={<div className="h-screen bg-black text-white flex items-center justify-center">Loading Exhibition...</div>}>
        <SearchParamsHandler>
          {({ showDebugMessages }: SearchParamsProps) => (
            <ExhibitionInterface 
              showDebugInfo={showDebugMessages}
              onSessionStart={() => console.log('🎨 Exhibition session started')}
              onSessionEnd={() => console.log('🎨 Exhibition session ended')}
            />
          )}
        </SearchParamsHandler>
      </Suspense>
    );
  }

  // Web Mode - Use traditional button-based interface
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsHandler>
        {({ showMuteSpeakerButton, modelOverride, showDebugMessages, showUserTranscripts }: SearchParamsProps) => (
          <div className="flex flex-col items-center justify-center min-h-screen py-4">
            {/* Mode Indicator (Development) */}
            {showDebugMessages && (
              <div className="fixed top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded text-sm z-50">
                Mode: {modeConfig.mode.toUpperCase()}
              </div>
            )}
            
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
                  {/* 💾 Database Status */}
                  {currentConversation && (
                    <div className="mt-4 p-2 bg-green-100 border border-green-300 rounded text-xs">
                      <strong>💾 Database Connected:</strong>
                      <div className="text-green-600">
                        Conversation ID: {currentConversation.id.substring(0, 8)}...
                      </div>
                      <div className="text-green-600">
                        Saving transcripts automatically
                      </div>
                    </div>
                  )}
                  
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