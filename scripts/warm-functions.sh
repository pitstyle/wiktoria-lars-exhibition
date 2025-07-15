#!/bin/bash

# Pi Function Warming Script
# Pre-warms all API endpoints to prevent cold starts during exhibition

echo "🔥 Warming Pi functions to prevent cold starts..."

# Base URL for local Pi deployment
BASE_URL="http://localhost:3000"

# Function to warm an endpoint
warm_endpoint() {
    local endpoint=$1
    local method=${2:-GET}
    echo "Warming $endpoint..."
    
    if [ "$method" = "POST" ]; then
        # Send minimal POST request to warm the function
        curl -s -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d '{"warmup": true}' \
            --max-time 10 > /dev/null 2>&1
    else
        # Send HEAD request to warm the function
        curl -s -X HEAD "$BASE_URL$endpoint" \
            --max-time 10 > /dev/null 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        echo "✅ $endpoint warmed successfully"
    else
        echo "⚠️  $endpoint warming failed (may be normal for first startup)"
    fi
}

# Wait for Next.js server to be ready
echo "⏳ Waiting for Next.js server to start..."
while ! curl -s "$BASE_URL" > /dev/null 2>&1; do
    sleep 2
done
echo "✅ Next.js server is ready"

# Warm all critical API endpoints
echo "🔥 Warming API endpoints..."
warm_endpoint "/api/transferToWiktoria" "POST"
warm_endpoint "/api/requestLarsPerspective" "POST"
warm_endpoint "/api/returnToWiktoria" "POST"
warm_endpoint "/api/endCall" "POST"
warm_endpoint "/api/ultravox" "POST"

# Additional warmup for main app
echo "🔥 Warming main application..."
curl -s "$BASE_URL" > /dev/null 2>&1

echo "🎉 Pi function warming complete!"
echo "🚀 Exhibition is ready for visitors"