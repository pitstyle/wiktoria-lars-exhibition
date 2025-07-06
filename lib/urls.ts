// Centralized URL configuration for both development and production

export const getBaseUrl = (): string => {
  // Priority order:
  // 1. VERCEL_URL (set automatically by Vercel)
  // 2. Production URL for NODE_ENV=production
  // 3. Local ngrok for development
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://wiktoria-lars-app.vercel.app';
  }
  
  // Development fallback (local ngrok)
  return 'https://a97e-31-178-4-112.ngrok-free.app';
};

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/${endpoint}`;
};

// Specific API endpoints
export const API_ENDPOINTS = {
  compileTranscript: () => getApiUrl('compileTranscript'),
  cleanupOrphanedCalls: () => getApiUrl('cleanup-orphaned-calls'),
  ultravoxWebhook: () => getApiUrl('ultravox-webhook'),
  transferToWiktoria: () => getApiUrl('transferToWiktoria'),
  requestLarsPerspective: () => getApiUrl('requestLarsPerspective'),
  returnToWiktoria: () => getApiUrl('returnToWiktoria'),
  endCall: () => getApiUrl('endCall'),
} as const;

// For external configuration (Ultravox dashboard, etc.)
export const PRODUCTION_WEBHOOK_URL = 'https://wiktoria-lars-app.vercel.app/api/ultravox-webhook';
export const PRODUCTION_BASE_URL = 'https://wiktoria-lars-app.vercel.app';

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  baseUrl: getBaseUrl(),
  nodeEnv: process.env.NODE_ENV,
  vercelUrl: process.env.VERCEL_URL,
  isProduction: process.env.NODE_ENV === 'production',
  isVercel: !!process.env.VERCEL_URL,
});