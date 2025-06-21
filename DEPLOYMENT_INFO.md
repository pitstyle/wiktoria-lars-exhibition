# 🚀 Deployment Information

## Production URLs
- **Primary Production URL**: https://wiktoria-lars-app.vercel.app
- **GitHub Repository**: https://github.com/pitstyle/wiktoria-lars-ultra
- **Vercel Dashboard**: https://vercel.com/pitstyles-projects/wiktoria-lars-app

## Current Version
- **Branch**: v1.1-character-architecture
- **Version**: v1.1 Character Architecture
- **Deployment Date**: 2025-06-20

## Architecture
- **Character Base System**: Separated character personalities in dedicated files
- **Enhanced Characters**: Lars (Anarchic Synthesizer) + Wiktoria (Technical Culture Architect)
- **User Flow**: Preserved exact interaction sequence
- **Functionality**: Zero loss, enhanced personality depth

## Environment Variables (Vercel)
- `ULTRAVOX_API_KEY`: Configured in Vercel dashboard
- `VERCEL_URL`: Auto-set by Vercel for webhook URLs

## Local Development
- **Dev Server**: `npm run dev`
- **ngrok**: Required for local webhook testing
- **Build**: `npm run build`

## Notes
- Main production URL is the permanent domain for this project
- All webhook endpoints automatically use production URLs in deployed environment
- Character personalities can be easily edited in `app/characters/` files