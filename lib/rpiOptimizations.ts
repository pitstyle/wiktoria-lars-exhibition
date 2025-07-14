/**
 * Raspberry Pi Performance Optimizations
 * Detects and applies optimizations for ARM-based systems
 */

export const isRaspberryPi = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check environment variable
  if (process.env.NEXT_PUBLIC_IS_RASPBERRY_PI === 'true') return true;
  
  // Check user agent for ARM indicators
  const ua = window.navigator.userAgent.toLowerCase();
  return ua.includes('arm') || ua.includes('raspberry') || ua.includes('raspbian');
};

export const getRPiOptimizedConfig = () => {
  const isRPi = isRaspberryPi();
  
  return {
    // Audio settings optimized for Pi
    audio: {
      sampleRate: isRPi ? 16000 : 48000, // Lower sample rate for Pi
      echoCancellation: !isRPi, // Disable on Pi to save CPU
      noiseSuppression: !isRPi,
      autoGainControl: !isRPi,
    },
    
    // WebRTC settings
    webrtc: {
      iceServers: isRPi ? [] : undefined, // Reduce STUN/TURN overhead
      bundlePolicy: isRPi ? 'max-bundle' : 'balanced',
      rtcpMuxPolicy: 'require',
    },
    
    // UI optimizations
    ui: {
      enableAnimations: !isRPi,
      visualizerFrameRate: isRPi ? 15 : 30,
      reducedMotion: isRPi,
    },
    
    // Voice detection optimizations
    vad: {
      fftSize: isRPi ? 256 : 512, // Smaller FFT for faster processing
      smoothingTimeConstant: isRPi ? 0.5 : 0.8,
      processingInterval: isRPi ? 100 : 50, // Less frequent processing
    },
    
    // Memory management
    memory: {
      maxTranscriptLength: isRPi ? 50 : 100,
      cleanupInterval: isRPi ? 30000 : 60000, // More aggressive cleanup
    },
  };
};

// Performance monitoring for Raspberry Pi
export class RPiPerformanceMonitor {
  private lastCheck = Date.now();
  private frameCount = 0;
  private enabled: boolean;
  
  constructor() {
    this.enabled = isRaspberryPi();
  }
  
  startMonitoring() {
    if (!this.enabled) return;
    
    const checkPerformance = () => {
      const now = Date.now();
      const delta = now - this.lastCheck;
      
      if (delta >= 1000) {
        const fps = (this.frameCount * 1000) / delta;
        
        if (fps < 10) {
          console.warn('Low FPS detected:', fps.toFixed(1));
          this.applyEmergencyOptimizations();
        }
        
        this.frameCount = 0;
        this.lastCheck = now;
      }
      
      this.frameCount++;
      requestAnimationFrame(checkPerformance);
    };
    
    requestAnimationFrame(checkPerformance);
  }
  
  private applyEmergencyOptimizations() {
    // Disable non-essential features when performance is critical
    document.body.classList.add('reduced-motion');
    
    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('rpi-low-performance', {
      detail: { timestamp: Date.now() }
    }));
  }
}

// Utility to defer non-critical operations
export const deferOnRPi = (callback: () => void, priority: 'high' | 'low' = 'low') => {
  if (!isRaspberryPi()) {
    callback();
    return;
  }
  
  const delay = priority === 'high' ? 100 : 500;
  setTimeout(callback, delay);
};

// Optimized audio context for Raspberry Pi
export const createOptimizedAudioContext = (): AudioContext => {
  const config = getRPiOptimizedConfig();
  
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  
  if (isRaspberryPi()) {
    return new AudioContextClass({
      sampleRate: config.audio.sampleRate,
      latencyHint: 'playback', // Prioritize stability over latency
    });
  }
  
  return new AudioContextClass();
};