#!/bin/bash

# Pi Build Script - Optimized for Raspberry Pi ARM64
# Usage: ./scripts/build-pi.sh

set -e  # Exit on any error

echo "🏗️  Building for Raspberry Pi (ARM64)..."

# Check if we're using Pi configs
if [ ! -f "package.pi.json" ]; then
    echo "❌ Error: package.pi.json not found"
    echo "   Run this script from the project root directory"
    exit 1
fi

# Backup current package.json
if [ -f "package.json" ]; then
    echo "📦 Backing up current package.json..."
    cp package.json package.json.backup
fi

# Use Pi-specific configs
echo "🔧 Switching to Pi configurations..."
cp package.pi.json package.json
cp next.config.pi.mjs next.config.mjs

# Install Pi-compatible dependencies
echo "📥 Installing Pi-compatible dependencies (Next.js 13.5.6)..."
npm install

# Build with Pi constraints
echo "🚀 Building with Pi memory constraints..."
NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Check build success
if [ $? -eq 0 ]; then
    echo "✅ Pi build completed successfully!"
    echo "📊 Build size:"
    du -sh .next/
    echo ""
    echo "🎯 Ready for Pi deployment!"
    echo "   Next steps:"
    echo "   1. Run: ./scripts/deploy-pi.sh [PI_IP]"
    echo "   2. Or manually copy .next/ to Pi"
else
    echo "❌ Pi build failed!"
    exit 1
fi

# Restore original configs (optional)
read -p "🔄 Restore original package.json? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "package.json.backup" ]; then
        mv package.json.backup package.json
        echo "✅ Original package.json restored"
    fi
fi

echo "🏁 Pi build process complete!"