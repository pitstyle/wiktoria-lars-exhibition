/**
 * Audio Intro Loop System
 * 
 * Handles looping audio playback for exhibition mode
 * Plays intro messages while waiting for voice activation
 */

export interface AudioIntroConfig {
  /** Path to the audio file */
  audioSrc: string;
  /** Volume level (0.0 - 1.0) */
  volume: number;
  /** Delay between loop iterations (ms) */
  loopDelay: number;
  /** Fade in/out duration (ms) */
  fadeDuration: number;
  /** Maximum number of loops (0 = infinite) */
  maxLoops: number;
}

export const DEFAULT_INTRO_CONFIG: AudioIntroConfig = {
  audioSrc: '/wiktoria_start01.mp3', // Use existing audio file
  volume: 0.7,
  loopDelay: 2000, // 2 seconds between loops
  fadeDuration: 500, // 500ms fade
  maxLoops: 0, // Infinite loops
};

export interface AudioIntroCallbacks {
  onLoopStart?: (loopCount: number) => void;
  onLoopEnd?: (loopCount: number) => void;
  onError?: (error: Error) => void;
  onVolumeChange?: (volume: number) => void;
}

export class AudioIntroPlayer {
  private audio: HTMLAudioElement | null = null;
  private config: AudioIntroConfig;
  private callbacks: AudioIntroCallbacks;
  
  private isPlaying = false;
  private isPaused = false;
  private loopCount = 0;
  private loopTimeoutId: number | null = null;
  private fadeIntervalId: number | null = null;
  private targetVolume = 0;
  
  constructor(config: Partial<AudioIntroConfig> = {}, callbacks: AudioIntroCallbacks = {}) {
    this.config = { ...DEFAULT_INTRO_CONFIG, ...config };
    this.callbacks = callbacks;
    this.targetVolume = this.config.volume;
  }

  /**
   * Initialize audio element
   */
  async initialize(): Promise<void> {
    try {
      this.audio = new Audio(this.config.audioSrc);
      this.audio.volume = 0; // Start with volume 0 for fade in
      this.audio.preload = 'auto';
      
      // Set up event listeners
      this.audio.addEventListener('ended', this.handleAudioEnded.bind(this));
      this.audio.addEventListener('error', this.handleAudioError.bind(this));
      this.audio.addEventListener('canplaythrough', this.handleCanPlayThrough.bind(this));
      
      // Preload the audio
      await new Promise((resolve, reject) => {
        const cleanup = () => {
          this.audio?.removeEventListener('canplaythrough', onCanPlay);
          this.audio?.removeEventListener('error', onError);
        };
        
        const onCanPlay = () => {
          cleanup();
          resolve(void 0);
        };
        
        const onError = () => {
          cleanup();
          reject(new Error(`Failed to load audio: ${this.config.audioSrc}`));
        };
        
        this.audio?.addEventListener('canplaythrough', onCanPlay);
        this.audio?.addEventListener('error', onError);
        
        // Trigger load
        this.audio?.load();
      });
      
      console.log('🔊 Audio intro initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize audio intro:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Start playing intro loop
   */
  async startLoop(): Promise<void> {
    if (!this.audio) {
      throw new Error('Audio intro not initialized');
    }
    
    if (this.isPlaying) {
      return;
    }
    
    this.isPlaying = true;
    this.isPaused = false;
    this.loopCount = 0;
    
    console.log('🔊 Starting audio intro loop');
    await this.playCurrentLoop();
  }

  /**
   * Stop playing intro loop
   */
  stopLoop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    
    // Clear any pending timeouts
    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }
    
    // Stop current audio with fade out
    if (this.audio && !this.audio.paused) {
      this.fadeOut(() => {
        this.audio?.pause();
        if (this.audio) {
          this.audio.currentTime = 0;
        }
      });
    }
    
    console.log('🔊 Audio intro loop stopped');
  }

  /**
   * Pause the intro loop
   */
  pauseLoop(): void {
    if (!this.isPlaying) return;
    
    this.isPaused = true;
    
    if (this.loopTimeoutId) {
      clearTimeout(this.loopTimeoutId);
      this.loopTimeoutId = null;
    }
    
    if (this.audio && !this.audio.paused) {
      this.fadeOut(() => {
        this.audio?.pause();
      });
    }
    
    console.log('🔊 Audio intro loop paused');
  }

  /**
   * Resume the intro loop
   */
  resumeLoop(): void {
    if (!this.isPlaying || !this.isPaused) return;
    
    this.isPaused = false;
    
    // Resume current audio or start next loop
    if (this.audio && this.audio.paused) {
      this.fadeIn();
      this.audio.play().catch(console.error);
    } else {
      this.scheduleNextLoop();
    }
    
    console.log('🔊 Audio intro loop resumed');
  }

  /**
   * Update volume with fade
   */
  setVolume(volume: number, fade = true): void {
    this.targetVolume = Math.max(0, Math.min(1, volume));
    this.config.volume = this.targetVolume;
    
    if (fade) {
      this.fadeToVolume(this.targetVolume);
    } else if (this.audio) {
      this.audio.volume = this.targetVolume;
    }
    
    this.callbacks.onVolumeChange?.(this.targetVolume);
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      loopCount: this.loopCount,
      currentTime: this.audio?.currentTime || 0,
      duration: this.audio?.duration || 0,
      volume: this.audio?.volume || 0,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopLoop();
    
    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }
    
    if (this.audio) {
      this.audio.removeEventListener('ended', this.handleAudioEnded.bind(this));
      this.audio.removeEventListener('error', this.handleAudioError.bind(this));
      this.audio.removeEventListener('canplaythrough', this.handleCanPlayThrough.bind(this));
      this.audio = null;
    }
    
    console.log('🔊 Audio intro destroyed');
  }

  /**
   * Play current loop iteration
   */
  private async playCurrentLoop(): Promise<void> {
    if (!this.audio || !this.isPlaying || this.isPaused) {
      return;
    }
    
    try {
      this.loopCount++;
      console.log(`🔊 Starting loop ${this.loopCount}`);
      
      this.callbacks.onLoopStart?.(this.loopCount);
      
      // Reset audio to beginning
      this.audio.currentTime = 0;
      
      // Set volume and play (no fade for exhibition mode)
      this.audio.volume = this.targetVolume;
      
      // For exhibition mode on Raspberry Pi, force autoplay
      const playPromise = this.audio.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('⚠️ Audio autoplay blocked, but continuing for exhibition mode');
          // In exhibition mode, we'll try again in next loop
          this.scheduleNextLoop();
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to play audio loop:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Schedule next loop iteration
   */
  private scheduleNextLoop(): void {
    if (!this.isPlaying || this.isPaused) {
      return;
    }
    
    // Check max loops limit
    if (this.config.maxLoops > 0 && this.loopCount >= this.config.maxLoops) {
      this.stopLoop();
      return;
    }
    
    this.loopTimeoutId = window.setTimeout(() => {
      this.playCurrentLoop();
    }, this.config.loopDelay);
  }

  /**
   * Handle audio ended event
   */
  private handleAudioEnded(): void {
    console.log(`🔊 Loop ${this.loopCount} ended`);
    this.callbacks.onLoopEnd?.(this.loopCount);
    
    if (this.isPlaying && !this.isPaused) {
      this.scheduleNextLoop();
    }
  }

  /**
   * Handle audio error event
   */
  private handleAudioError(): void {
    const error = new Error(`Audio playback error: ${this.config.audioSrc}`);
    console.error('❌ Audio error:', error);
    this.callbacks.onError?.(error);
  }

  /**
   * Handle can play through event
   */
  private handleCanPlayThrough(): void {
    console.log('🔊 Audio can play through');
  }

  /**
   * Fade in audio
   */
  private fadeIn(): void {
    if (!this.audio) return;
    
    this.clearFade();
    this.audio.volume = 0;
    
    const step = this.targetVolume / (this.config.fadeDuration / 50);
    
    this.fadeIntervalId = window.setInterval(() => {
      if (!this.audio) {
        this.clearFade();
        return;
      }
      
      this.audio.volume = Math.min(this.audio.volume + step, this.targetVolume);
      
      if (this.audio.volume >= this.targetVolume) {
        this.audio.volume = this.targetVolume;
        this.clearFade();
      }
    }, 50);
  }

  /**
   * Fade out audio
   */
  private fadeOut(onComplete?: () => void): void {
    if (!this.audio) {
      onComplete?.();
      return;
    }
    
    this.clearFade();
    const startVolume = this.audio.volume;
    const step = startVolume / (this.config.fadeDuration / 50);
    
    this.fadeIntervalId = window.setInterval(() => {
      if (!this.audio) {
        this.clearFade();
        onComplete?.();
        return;
      }
      
      this.audio.volume = Math.max(this.audio.volume - step, 0);
      
      if (this.audio.volume <= 0) {
        this.audio.volume = 0;
        this.clearFade();
        onComplete?.();
      }
    }, 50);
  }

  /**
   * Fade to specific volume
   */
  private fadeToVolume(targetVolume: number): void {
    if (!this.audio) return;
    
    this.clearFade();
    const startVolume = this.audio.volume;
    const difference = targetVolume - startVolume;
    const step = difference / (this.config.fadeDuration / 50);
    
    this.fadeIntervalId = window.setInterval(() => {
      if (!this.audio) {
        this.clearFade();
        return;
      }
      
      if (Math.abs(this.audio.volume - targetVolume) < Math.abs(step)) {
        this.audio.volume = targetVolume;
        this.clearFade();
      } else {
        this.audio.volume += step;
      }
    }, 50);
  }

  /**
   * Clear fade interval
   */
  private clearFade(): void {
    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioIntroConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.volume !== undefined) {
      this.targetVolume = newConfig.volume;
      if (this.audio) {
        this.setVolume(newConfig.volume);
      }
    }
    
    console.log('🔊 Audio intro config updated:', this.config);
  }
}