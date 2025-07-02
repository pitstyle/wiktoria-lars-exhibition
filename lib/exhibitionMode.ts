/**
 * Exhibition Mode Detection and Configuration
 * 
 * This utility determines whether the app is running in:
 * - WEB MODE: Button-based interaction for web users
 * - EXHIBITION MODE: Voice-activated interaction for art exhibition hardware
 */

export type AppMode = 'web' | 'exhibition';

/**
 * Detects the current app mode based on environment variables and URL parameters
 * Client-side only to avoid hydration mismatch
 */
export function detectAppMode(): AppMode {
  // Only run on client side to avoid hydration issues
  if (typeof window === 'undefined') {
    return 'web'; // Default to web mode on server
  }
  
  // Check client-side URL parameters (for testing/development)
  const params = new URLSearchParams(window.location.search);
  if (params.get('exhibition') === 'true' || params.get('mode') === 'exhibition') {
    return 'exhibition';
  }
  
  // Check Next.js environment variable (client-side)
  if (process.env.NEXT_PUBLIC_EXHIBITION_MODE === 'true') {
    return 'exhibition';
  }
  
  // Default to web mode
  return 'web';
}

/**
 * Checks if current mode is exhibition mode
 */
export function isExhibitionMode(): boolean {
  return detectAppMode() === 'exhibition';
}

/**
 * Checks if current mode is web mode  
 */
export function isWebMode(): boolean {
  return detectAppMode() === 'web';
}

/**
 * Gets mode-specific configuration
 */
export function getModeConfig() {
  const mode = detectAppMode();
  
  return {
    mode,
    // Voice activation settings
    voiceActivation: mode === 'exhibition',
    showButtons: mode === 'web',
    
    // Audio settings
    audioIntroLoop: mode === 'exhibition',
    microphoneContinuous: mode === 'exhibition',
    
    // Session settings
    autoTimeout: mode === 'exhibition' ? 30000 : null, // 30 seconds for exhibition
    autoReset: mode === 'exhibition',
    
    // UI settings
    showLogo: mode === 'web',
    showStatus: mode === 'web',
    showDebugMessages: mode === 'web',
    minimalUI: mode === 'exhibition',
    
    // Voice detection settings
    voiceThreshold: mode === 'exhibition' ? 0.5 : null, // Very high threshold for handset-only activation
    silenceTimeout: mode === 'exhibition' ? 3500 : null, // 3.5 seconds of silence
  };
}

/**
 * Development helper to force a specific mode
 */
export function setDevMode(mode: AppMode) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('forceMode', mode);
  }
}

/**
 * Gets forced development mode if set
 */
export function getDevMode(): AppMode | null {
  if (typeof window !== 'undefined') {
    const forced = localStorage.getItem('forceMode');
    return forced as AppMode | null;
  }
  return null;
}