// Pi Keep-Alive Service
// Prevents cold starts during exhibition hours by pinging endpoints

interface KeepAliveConfig {
  interval: number; // milliseconds
  endpoints: string[];
  enabled: boolean;
}

class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private config: KeepAliveConfig;

  constructor(config: KeepAliveConfig) {
    this.config = config;
  }

  start() {
    if (!this.config.enabled) {
      console.log('🔄 Keep-alive service disabled');
      return;
    }

    console.log(`🔄 Starting keep-alive service (${this.config.interval}ms interval)`);
    
    this.intervalId = setInterval(() => {
      this.pingEndpoints();
    }, this.config.interval);

    // Initial ping
    this.pingEndpoints();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🔄 Keep-alive service stopped');
    }
  }

  private async pingEndpoints() {
    for (const endpoint of this.config.endpoints) {
      try {
        // Use HEAD request to minimize overhead
        const response = await fetch(endpoint, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5s timeout
        });
        
        if (response.ok) {
          console.log(`✅ Keep-alive ping successful: ${endpoint}`);
        } else {
          console.log(`⚠️  Keep-alive ping failed: ${endpoint} (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ Keep-alive ping error: ${endpoint} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
}

// Default configuration for Pi exhibition
const DEFAULT_CONFIG: KeepAliveConfig = {
  interval: 60000, // 1 minute
  endpoints: [
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/transferToWiktoria`,
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/requestLarsPerspective`,
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/returnToWiktoria`,
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/endCall`,
    `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ultravox`
  ],
  enabled: process.env.NODE_ENV === 'production' || process.env.ENABLE_KEEP_ALIVE === 'true'
};

// Global keep-alive service instance
export const keepAliveService = new KeepAliveService(DEFAULT_CONFIG);

// Auto-start for Pi deployment
if (typeof window === 'undefined') { // Server-side only
  // Start keep-alive after a short delay to allow server to initialize
  setTimeout(() => {
    keepAliveService.start();
  }, 10000); // 10 second delay
}

export default keepAliveService;