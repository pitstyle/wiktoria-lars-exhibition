/**
 * Voice Activity Detection (VAD) Utility
 * 
 * Provides voice detection capabilities for exhibition mode using Web Audio API
 * Optimized for vintage handset audio input and exhibition environment
 */

export interface VoiceDetectionConfig {
  /** Volume threshold for voice detection (0.0 - 1.0) */
  threshold: number;
  /** Minimum voice duration in ms to trigger activation */
  minVoiceDuration: number;
  /** Silence duration in ms before stopping detection */
  silenceTimeout: number;
  /** Sample rate for audio analysis */
  sampleRate: number;
  /** FFT size for frequency analysis */
  fftSize: number;
  /** Frequency range for voice detection (Hz) */
  voiceFrequencyMin: number;
  voiceFrequencyMax: number;
}

export const DEFAULT_VAD_CONFIG: VoiceDetectionConfig = {
  threshold: 0.01,          // 1% volume threshold (very sensitive for quiet environments)
  minVoiceDuration: 200,    // 200ms minimum voice (faster response for exhibition)
  silenceTimeout: 3500,     // 3.5 seconds silence timeout
  sampleRate: 44100,        // Standard sample rate
  fftSize: 2048,           // FFT size for frequency analysis
  voiceFrequencyMin: 300,   // Handset frequency range minimum (telephone quality)
  voiceFrequencyMax: 3400,  // Handset frequency range maximum (telephone quality)
};

export interface VoiceDetectionCallbacks {
  onVoiceStart?: () => void;
  onVoiceEnd?: () => void;
  onVoiceActivity?: (level: number) => void;
  onError?: (error: Error) => void;
  onSilenceTimeout?: () => void;
}

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private freqArray: Uint8Array | null = null;
  
  private config: VoiceDetectionConfig;
  private callbacks: VoiceDetectionCallbacks;
  
  private isListening = false;
  private isVoiceActive = false;
  private voiceStartTime = 0;
  private lastVoiceTime = 0;
  private animationFrameId: number | null = null;
  private silenceTimeoutId: number | null = null;
  
  constructor(config: Partial<VoiceDetectionConfig> = {}, callbacks: VoiceDetectionCallbacks = {}) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  /**
   * Initialize audio context and request microphone access
   */
  async initialize(): Promise<void> {
    try {
      console.log('🎤 Starting VAD initialization...');
      
      // Try to get user media FIRST - this sometimes triggers audio context unlock
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.config.sampleRate
        }
      };
      
      console.log('🎤 Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ Microphone access granted');
      
      // NOW create AudioContext after mic access
      console.log('🎤 Creating AudioContext...');
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('🎤 AudioContext state:', this.audioContext.state);
      
      // Create audio analysis nodes
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.microphone.connect(this.analyser);
      
      // Small delay to ensure analyser is fully set up
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Initialize data arrays AFTER analyser is created and ready
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      console.log('🎤 Voice detection components initialized:', {
        audioContext: !!this.audioContext,
        analyser: !!this.analyser,
        dataArray: !!this.dataArray,
        freqArray: !!this.freqArray,
        frequencyBinCount: this.analyser.frequencyBinCount
      });
      
      // Verify all components are properly initialized
      if (!this.analyser || !this.dataArray || !this.freqArray) {
        throw new Error('Voice detection components not properly initialized');
      }
      
      console.log('🎤 Voice detection initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize voice detection:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Start voice activity detection
   */
  startListening(): void {
    if (!this.audioContext || !this.analyser || !this.dataArray || !this.freqArray) {
      console.error('❌ Voice detection not fully initialized:', {
        audioContext: !!this.audioContext,
        analyser: !!this.analyser,
        dataArray: !!this.dataArray,
        freqArray: !!this.freqArray
      });
      throw new Error('Voice detection not initialized');
    }
    
    if (this.isListening) {
      console.log('🎤 Already listening, skipping start');
      return;
    }
    
    this.isListening = true;
    this.isVoiceActive = false;
    this.lastVoiceTime = Date.now();
    
    console.log('🎤 Started voice activity detection');
    this.analyzeAudio();
  }

  /**
   * Stop voice activity detection
   */
  stopListening(): void {
    this.isListening = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    if (this.silenceTimeoutId) {
      clearTimeout(this.silenceTimeoutId);
      this.silenceTimeoutId = null;
    }
    
    if (this.isVoiceActive) {
      this.isVoiceActive = false;
      this.callbacks.onVoiceEnd?.();
    }
    
    console.log('🎤 Stopped voice activity detection');
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopListening();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.microphone = null;
    this.dataArray = null;
    this.freqArray = null;
    
    console.log('🎤 Voice detection destroyed');
  }

  /**
   * Main audio analysis loop
   */
  private analyzeAudio(): void {
    if (!this.isListening || !this.analyser || !this.dataArray || !this.freqArray) {
      return;
    }
    
    // Get audio data
    this.analyser.getByteTimeDomainData(this.dataArray);
    this.analyser.getByteFrequencyData(this.freqArray);
    
    // Calculate volume level
    const volumeLevel = this.calculateVolumeLevel();
    
    // Calculate voice frequency activity
    const voiceActivity = this.calculateVoiceActivity();
    
    // Combined voice detection - both volume AND voice frequency must be detected
    const isCurrentlyVoice = volumeLevel > this.config.threshold && voiceActivity > 0.2;
    
    // DEBUG: Log detection values every 100 frames
    const debugFrame = Math.floor(Date.now() / 100) % 50; // Every 5 seconds
    if (debugFrame === 0) {
      console.log('🔍 VAD Debug:', {
        volumeLevel: volumeLevel.toFixed(3),
        voiceActivity: voiceActivity.toFixed(3),
        threshold: this.config.threshold,
        isCurrentlyVoice,
        isVoiceActive: this.isVoiceActive
      });
    }
    
    // Report activity level
    this.callbacks.onVoiceActivity?.(Math.max(volumeLevel, voiceActivity));
    
    const now = Date.now();
    
    if (isCurrentlyVoice) {
      this.lastVoiceTime = now;
      
      if (!this.isVoiceActive) {
        // Voice started - only set timer ONCE
        if (this.voiceStartTime === 0) {
          this.voiceStartTime = now;
          console.log('🎤 Voice start timer began at', now);
        } else {
          // Timer already running - check if duration reached
          const duration = now - this.voiceStartTime;
          console.log('🎤 Voice continues, duration:', duration + 'ms');
          
          if (duration >= this.config.minVoiceDuration) {
            this.isVoiceActive = true;
            this.callbacks.onVoiceStart?.();
            console.log('🎤 Voice activity confirmed after', duration, 'ms');
          }
        }
      }
      
      // Clear silence timeout
      if (this.silenceTimeoutId) {
        clearTimeout(this.silenceTimeoutId);
        this.silenceTimeoutId = null;
      }
    } else {
      // No voice detected
      if (this.isVoiceActive) {
        // Start silence countdown
        if (!this.silenceTimeoutId) {
          this.silenceTimeoutId = window.setTimeout(() => {
            if (this.isVoiceActive) {
              this.isVoiceActive = false;
              this.voiceStartTime = 0;
              this.callbacks.onVoiceEnd?.();
              this.callbacks.onSilenceTimeout?.();
              console.log('🎤 Voice activity ended (silence timeout)');
            }
          }, this.config.silenceTimeout);
        }
      } else {
        // Only reset timer if we've been silent for a bit
        if (this.voiceStartTime > 0 && (now - this.lastVoiceTime) > 200) {
          console.log('🎤 Resetting voice timer due to silence');
          this.voiceStartTime = 0;
        }
      }
    }
    
    // Continue analysis
    this.animationFrameId = requestAnimationFrame(() => this.analyzeAudio());
  }

  /**
   * Calculate volume level from time domain data
   */
  private calculateVolumeLevel(): number {
    if (!this.dataArray) return 0;
    
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const sample = (this.dataArray[i] - 128) / 128; // Convert to -1 to 1 range
      sum += sample * sample;
    }
    
    const rms = Math.sqrt(sum / this.dataArray.length);
    return Math.min(rms * 2, 1.0); // Amplify and clamp to 1.0
  }

  /**
   * Calculate voice activity in voice frequency range
   */
  private calculateVoiceActivity(): number {
    if (!this.freqArray || !this.audioContext) return 0;
    
    const nyquist = this.audioContext.sampleRate / 2;
    const freqBinSize = nyquist / this.freqArray.length;
    
    const minBin = Math.floor(this.config.voiceFrequencyMin / freqBinSize);
    const maxBin = Math.floor(this.config.voiceFrequencyMax / freqBinSize);
    
    let voiceSum = 0;
    let totalSum = 0;
    
    for (let i = 0; i < this.freqArray.length; i++) {
      const value = this.freqArray[i] / 255;
      totalSum += value;
      
      if (i >= minBin && i <= maxBin) {
        voiceSum += value;
      }
    }
    
    // Return ratio of voice frequencies to total
    return totalSum > 0 ? voiceSum / totalSum : 0;
  }

  /**
   * Get current voice activity state
   */
  getVoiceState() {
    return {
      isListening: this.isListening,
      isVoiceActive: this.isVoiceActive,
      timeSinceLastVoice: this.lastVoiceTime ? Date.now() - this.lastVoiceTime : 0,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<VoiceDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🎤 Voice detection config updated:', this.config);
  }
}