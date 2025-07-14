/**
 * Live Phone Tone Generator
 * 
 * Generates live phone line tones using Web Audio API
 * Optimized for exhibition environment and Raspberry Pi deployment
 * Provides instant start/stop control with zero latency
 */

export interface PhoneToneConfig {
  /** Primary tone frequency (Hz) */
  frequency1: number;
  /** Secondary tone frequency (Hz) for dual-tone effect */
  frequency2: number;
  /** Volume level (0.0 - 1.0) */
  volume: number;
  /** Tone type */
  toneType: 'dial' | 'busy' | 'static' | 'line';
}

export const PHONE_TONE_PRESETS: { [key: string]: PhoneToneConfig } = {
  dial: {
    frequency1: 350,   // Standard US dial tone frequencies
    frequency2: 440,
    volume: 0.15,      // Low ambient volume
    toneType: 'dial'
  },
  busy: {
    frequency1: 480,   // Busy signal frequencies
    frequency2: 620,
    volume: 0.12,
    toneType: 'busy'
  },
  line: {
    frequency1: 1000,  // Phone line hum
    frequency2: 0,     // Single tone
    volume: 0.08,      // Very subtle
    toneType: 'line'
  },
  static: {
    frequency1: 0,     // Noise-based, no specific frequency
    frequency2: 0,
    volume: 0.10,
    toneType: 'static'
  }
};

export interface PhoneToneCallbacks {
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
}

export class PhoneToneGenerator {
  private audioContext: AudioContext | null = null;
  private oscillator1: OscillatorNode | null = null;
  private oscillator2: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  
  private config: PhoneToneConfig;
  private callbacks: PhoneToneCallbacks;
  
  private isPlaying = false;
  private isInitialized = false;
  
  constructor(config: PhoneToneConfig = PHONE_TONE_PRESETS.dial, callbacks: PhoneToneCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Initialize the audio context and prepare tone generation
   */
  async initialize(): Promise<void> {
    try {
      console.log('📞 Initializing phone tone generator...');
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('📞 AudioContext created, state:', this.audioContext.state);
      
      // Don't try to resume immediately - wait for user gesture
      if (this.audioContext.state === 'suspended') {
        console.log('📞 AudioContext suspended - will resume on first user interaction');
      }
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0; // Start muted
      
      // For static tone, prepare noise buffer
      if (this.config.toneType === 'static') {
        await this.createNoiseBuffer();
      }
      
      this.isInitialized = true;
      console.log('✅ Phone tone generator initialized successfully');
      
      // IMMEDIATE FIX: Auto-start tone if not suspended
      if (this.audioContext.state !== 'suspended') {
        console.log('📞 AudioContext ready - auto-starting tone...');
        this.startTone().catch(console.error);
      }
    } catch (error) {
      console.error('❌ Failed to initialize phone tone generator:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Start playing the phone tone
   */
  async startTone(): Promise<void> {
    if (!this.isInitialized || !this.audioContext || !this.gainNode) {
      throw new Error('Phone tone generator not initialized');
    }
    
    if (this.isPlaying) {
      return; // Already playing
    }
    
    try {
      console.log('📞 Starting phone tone:', this.config.toneType);
      
      // Resume AudioContext if suspended (requires user gesture)
      if (this.audioContext.state === 'suspended') {
        console.log('📞 AudioContext suspended - will try to resume...');
        try {
          await this.audioContext.resume();
          console.log('📞 AudioContext resumed successfully, state:', this.audioContext.state);
        } catch (error) {
          console.log('📞 AudioContext resume failed (no user gesture yet):', error instanceof Error ? error.message : String(error));
          // Don't throw error - just continue, tone will start when user interacts
          return;
        }
      }
      
      if (this.config.toneType === 'static') {
        await this.startStaticTone();
      } else {
        await this.startOscillatorTone();
      }
      
      // Fade in the volume
      this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(this.config.volume, this.audioContext.currentTime + 0.1);
      
      this.isPlaying = true;
      this.callbacks.onStart?.();
      console.log('✅ Phone tone started');
    } catch (error) {
      console.error('❌ Failed to start phone tone:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop playing the phone tone instantly
   */
  stopTone(): void {
    if (!this.isPlaying || !this.gainNode) {
      return;
    }
    
    try {
      console.log('📞 Stopping phone tone');
      
      // Instant volume cut (no fade for immediate response)
      this.gainNode.gain.setValueAtTime(0, this.audioContext?.currentTime || 0);
      
      // Stop and disconnect oscillators
      if (this.oscillator1) {
        try {
          this.oscillator1.stop();
          this.oscillator1.disconnect();
        } catch (e) {
          // Oscillator might already be stopped
        }
        this.oscillator1 = null;
      }
      
      if (this.oscillator2) {
        try {
          this.oscillator2.stop();
          this.oscillator2.disconnect();
        } catch (e) {
          // Oscillator might already be stopped
        }
        this.oscillator2 = null;
      }
      
      // Stop noise source
      if (this.noiseSource) {
        try {
          this.noiseSource.stop();
          this.noiseSource.disconnect();
        } catch (e) {
          // Source might already be stopped
        }
        this.noiseSource = null;
      }
      
      this.isPlaying = false;
      this.callbacks.onStop?.();
      console.log('✅ Phone tone stopped');
    } catch (error) {
      console.error('❌ Error stopping phone tone:', error);
    }
  }

  /**
   * Retry starting tone after user gesture (for autoplay policy)
   */
  async retryStart(): Promise<void> {
    if (!this.isInitialized || this.isPlaying) {
      return;
    }
    
    console.log('📞 Retrying phone tone start after user gesture...');
    await this.startTone();
  }

  /**
   * Update configuration and restart if playing
   */
  updateConfig(newConfig: Partial<PhoneToneConfig>): void {
    const wasPlaying = this.isPlaying;
    
    if (wasPlaying) {
      this.stopTone();
    }
    
    this.config = { ...this.config, ...newConfig };
    console.log('📞 Phone tone config updated:', this.config);
    
    if (wasPlaying) {
      this.startTone().catch(console.error);
    }
  }

  /**
   * Set volume with optional fade
   */
  setVolume(volume: number, fadeTime = 0): void {
    if (!this.gainNode || !this.audioContext) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.config.volume = clampedVolume;
    
    if (fadeTime > 0) {
      this.gainNode.gain.linearRampToValueAtTime(
        clampedVolume, 
        this.audioContext.currentTime + fadeTime
      );
    } else {
      this.gainNode.gain.setValueAtTime(clampedVolume, this.audioContext.currentTime);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isInitialized: this.isInitialized,
      config: this.config,
      contextState: this.audioContext?.state || 'closed'
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopTone();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.gainNode = null;
    this.noiseBuffer = null;
    this.isInitialized = false;
    
    console.log('📞 Phone tone generator destroyed');
  }

  /**
   * Start oscillator-based tone (dial, busy, line)
   */
  private async startOscillatorTone(): Promise<void> {
    if (!this.audioContext || !this.gainNode) return;
    
    // Create primary oscillator
    this.oscillator1 = this.audioContext.createOscillator();
    this.oscillator1.frequency.setValueAtTime(this.config.frequency1, this.audioContext.currentTime);
    this.oscillator1.type = 'sine';
    this.oscillator1.connect(this.gainNode);
    this.oscillator1.start();
    
    // Create secondary oscillator if frequency2 is specified
    if (this.config.frequency2 > 0) {
      this.oscillator2 = this.audioContext.createOscillator();
      this.oscillator2.frequency.setValueAtTime(this.config.frequency2, this.audioContext.currentTime);
      this.oscillator2.type = 'sine';
      this.oscillator2.connect(this.gainNode);
      this.oscillator2.start();
    }
  }

  /**
   * Start static/noise-based tone
   */
  private async startStaticTone(): Promise<void> {
    if (!this.audioContext || !this.gainNode || !this.noiseBuffer) return;
    
    this.noiseSource = this.audioContext.createBufferSource();
    this.noiseSource.buffer = this.noiseBuffer;
    this.noiseSource.loop = true;
    this.noiseSource.connect(this.gainNode);
    this.noiseSource.start();
  }

  /**
   * Create noise buffer for static tone
   */
  private async createNoiseBuffer(): Promise<void> {
    if (!this.audioContext) return;
    
    const sampleRate = this.audioContext.sampleRate;
    const bufferLength = sampleRate * 2; // 2 seconds of noise
    
    this.noiseBuffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
    const channelData = this.noiseBuffer.getChannelData(0);
    
    // Generate filtered white noise for phone line static
    for (let i = 0; i < bufferLength; i++) {
      channelData[i] = (Math.random() * 2 - 1) * 0.3; // Reduced amplitude for subtle static
    }
    
    console.log('📞 Noise buffer created for static tone');
  }
}