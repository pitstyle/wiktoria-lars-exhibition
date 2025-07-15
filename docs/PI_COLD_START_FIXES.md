# Pi Cold Start Fixes

## Overview
Fixed cold start timeout issues for Pi exhibition deployment where first tool calls were timing out after 2.5s.

## Solutions Implemented

### 1. Function Warming Script (`scripts/warm-functions.sh`)
- **Purpose**: Pre-warm all API endpoints on Pi boot
- **Usage**: Run after Next.js server starts
- **What it does**: Sends dummy requests to all critical API routes
- **Result**: Prevents cold starts during exhibition hours

```bash
# Run manually
./scripts/warm-functions.sh

# Add to Pi startup (recommended)
# Add to /etc/rc.local or systemd service
```

### 2. Keep-Alive Service (`lib/keepAlive.ts`)
- **Purpose**: Prevent cold starts during exhibition
- **Mechanism**: Pings endpoints every 60 seconds
- **Auto-start**: Enabled in production mode
- **Configuration**: Via environment variables

```bash
# Enable keep-alive in development
export ENABLE_KEEP_ALIVE=true

# Configure base URL
export NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Graceful Timeout Handling
- **Updated all agent prompts** to handle tool timeouts gracefully
- **No more "sygnał słabnie"** - agents now say system is updating
- **Automatic retry** - agents attempt tool calls again after timeout
- **Character consistency** - maintain voice even during technical issues

## Expected Results

### Before Fix
- First `transferToWiktoria` call: 2.602s (timeout)
- Lars says: "sygnał słabnie, obywatelu... archiwum zamyka się..."
- Visitor walks away confused

### After Fix
- All API calls: <1s (warmed)
- If timeout occurs: "systemy się aktualizują... spróbujmy ponownie"
- Automatic retry and recovery
- Seamless exhibition experience

## Pi Deployment Checklist

1. ✅ Function warming script executable
2. ✅ Keep-alive service enabled
3. ✅ Agent prompts updated for timeout handling
4. ✅ All API routes optimized for Pi performance
5. ⏳ Test on actual Pi hardware
6. ⏳ Monitor performance during exhibition

## Monitoring

The keep-alive service logs all ping attempts:
- `✅ Keep-alive ping successful: /api/endpoint`
- `⚠️ Keep-alive ping failed: /api/endpoint (status)`
- `❌ Keep-alive ping error: /api/endpoint - error`

## Environment Variables

```bash
# Enable keep-alive service
ENABLE_KEEP_ALIVE=true

# Set base URL for Pi
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Production mode (auto-enables keep-alive)
NODE_ENV=production
```

## Testing

Test timeout scenarios:
1. Stop keep-alive service
2. Wait for functions to go cold
3. Trigger tool calls
4. Verify graceful handling and retry