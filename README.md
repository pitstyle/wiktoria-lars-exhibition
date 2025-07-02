# 🎭 Wiktoria Lars Exhibition System

**AI-powered conversational art installation featuring two-agent dialogs with voice activation**

Exhibition Opening: **July 18, 2025** | Ujazdowski Castle, Warsaw

## 🚀 Quick Start

### Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Access the application
open http://localhost:3000
```

### Exhibition Mode Access
- **Web Mode** (default): http://localhost:3000
- **Exhibition Mode** (VAD): http://localhost:3000?exhibition=true
- **Alternative**: http://localhost:3000?mode=exhibition

## 🏗️ System Architecture

### Core Components
- **Voice Conversations**: Real-time AI dialog with Lars & Wiktoria agents
- **Voice Activity Detection**: Custom VAD system for handset activation
- **Transcript System**: Supabase database with real-time archival
- **Audio Management**: Phone tones, intro loops, and voice processing
- **Exhibition Interface**: Optimized for hardware installations

### Technology Stack
- **Frontend**: Next.js 14 + React + TypeScript
- **Voice API**: Ultravox WebRTC real-time conversations
- **Database**: Supabase PostgreSQL with real-time subscriptions
- **Audio**: Web Audio API with custom VAD implementation
- **Deployment**: Vercel with multiple environment configurations

## 🎙️ Voice Activity Detection (VAD)

### Features
- **Custom Implementation**: 357-line VAD system (`/lib/voiceDetection.ts`)
- **Handset Optimized**: 300-3400 Hz frequency range for vintage phones
- **Exhibition Ready**: Proximity-based activation (0.5 threshold)
- **Ultra-fast Response**: 150ms activation time for single words
- **Visual Feedback**: Real-time voice level visualization

### VAD Configuration
```typescript
const VAD_CONFIG = {
  threshold: 0.5,          // 50% volume (handset proximity required)
  minVoiceDuration: 150,   // 150ms minimum voice duration
  voiceActivity: 0.2,      // 20% frequency detection
  silenceTimeout: 3500,    // 3.5 seconds silence timeout
  frequencyRange: [300, 3400] // Telephone quality range
};
```

## 🎵 Audio System

### Phone Tone Generator
- **Frequencies**: 350Hz + 440Hz (standard dial tone)
- **Technology**: Web Audio API with OscillatorNodes
- **Volume**: 0.05 (ambient level for exhibition)
- **Integration**: Automatic start/stop with voice detection

### Audio Components
- `SimplePhoneTone`: Reliable tone generation class
- `AudioIntroLoop`: Wiktoria voice introduction system
- `PhoneTonePlayer`: Advanced tone management (optional)

## 🎨 Exhibition Modes

### Web Mode (Default)
- Button-based interface for web users
- Full conversation features
- Standard web browser optimization
- Testing and development friendly

### Exhibition Mode (`?exhibition=true`)
- Voice Activity Detection enabled
- Handset-optimized audio processing
- Visual voice level feedback
- Hardware installation ready
- No manual buttons required

## 🤖 AI Agent System

### Lars (Leader of Synthetic Party, Denmark)
- **Role**: Conversation facilitator, initial greeter
- **Agent ID**: `agent_01jxpwc8kzeshtqp9x7vbs675q`
- **Personality**: Bureaucratic, data-obsessed synthesizer
- **Language**: Polish with technical English

### Wiktoria (AI President of Poland)
- **Role**: Specialist advisor, deep discussion leader
- **Agent ID**: `lqx5JJtN4oNW691WjnUd`
- **Personality**: Sharp, presidential, technically savvy
- **Language**: Polish with political discourse

### Dialog Flow
1. **User Input** → **Lars** (greeting) → **Wiktoria** (context) → **Lars** (question)
2. **User Response** → **Wiktoria ↔ Lars** (3-sentence exchanges) → **Wiktoria** (question)
3. **Loop continues** with alternating agent-to-agent dialogs

## 📊 Database Integration

### Supabase Configuration
- **Table**: `conversations` with JSONB transcript storage
- **Real-time**: WebSocket subscriptions for live updates
- **MCP Integration**: Enhanced transcript processing
- **Data Fields**: speaker detection, topic extraction, recording URLs

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
ULTRAVOX_API_KEY=your_ultravox_key
```

## 🏛️ Exhibition Hardware Setup

### Station Configuration (6 Total)
- **Stations 1-5**: Voice interaction with Lars
  - Hardware: Raspberry Pi + vintage handsets
  - Software: VAD system with exhibition mode
- **Station 6**: Special Wiktoria station
  - Hardware: Raspberry Pi + handset + vertical TV
  - Software: Enhanced with Instagram integration

### Display System (3 Vertical TVs)
- **TV 1**: Instagram feed display
- **TVs 2-3**: Airport flip transcript displays
- **Integration**: Real-time Supabase data streaming

## 🔧 Development Commands

```bash
# Environment setup
cp .env.example .env.local
# Configure Supabase and Ultravox keys

# Development
pnpm dev                 # Start development server
pnpm build              # Production build
pnpm start              # Production server
pnpm lint               # Code linting
pnpm type-check         # TypeScript checking

# Testing modes
open http://localhost:3000                    # Web mode
open http://localhost:3000?exhibition=true   # Exhibition mode
```

## 📁 Key File Structure

```
/
├── app/
│   ├── components/
│   │   ├── ExhibitionInterface.tsx    # Main exhibition interface
│   │   ├── VoiceActivation.tsx        # VAD component
│   │   ├── AudioIntroLoop.tsx         # Audio management
│   │   └── PhoneTonePlayer.tsx        # Tone generation
│   ├── api/
│   │   ├── ultravox/                  # Voice API endpoints
│   │   └── fetch-ultravox-data/       # Transcript processing
│   └── page.tsx                       # Main application entry
├── lib/
│   ├── voiceDetection.ts              # Core VAD implementation
│   ├── simplePhoneTone.ts             # Phone tone generator
│   ├── exhibitionMode.ts              # Mode detection
│   └── audioIntro.ts                  # Audio management
├── public/
│   └── wiktoria_start01.mp3           # Voice intro file
└── .claude/                           # Project documentation
    ├── PROJECT_STATUS.md              # Current development status
    ├── EXHIBITION_ROADMAP.md          # Timeline and milestones
    └── sessions/                      # Development session logs
```

## 🔒 Security & Privacy

- **Audio Processing**: Local browser processing, no audio uploaded
- **Voice Data**: Real-time processing, not stored
- **Transcripts**: Stored in Supabase with conversation context only
- **API Keys**: Environment-based configuration, not committed to repo

## 🚀 Deployment

### Vercel Configuration
- **Repository**: Connected to GitHub for automatic deployments
- **Environment**: Configured with Supabase and Ultravox credentials
- **Domains**: Production and preview environments available
- **Build**: Next.js 14 with TypeScript compilation

### Preview Deployments
Each branch push creates a preview deployment for testing before production.

## 📈 Monitoring & Analytics

- **Conversation Tracking**: All dialogs archived in Supabase
- **Voice Detection Metrics**: VAD performance logging
- **Error Handling**: Comprehensive error catching and fallbacks
- **Performance**: Optimized for sub-200ms voice response times

## 🎯 Exhibition Success Metrics

### Technical Performance
- **Voice Response**: <2 second latency
- **Activation Reliability**: 100% voice detection accuracy
- **Uptime**: 6+ hour continuous operation
- **Audio Quality**: Clear handset communication

### User Experience
- **Intuitive Interaction**: No instructions needed
- **Engaging Dialogs**: Lars-Wiktoria exchanges
- **Multilingual Support**: Polish with English technical terms
- **Visual Feedback**: Voice level indicators

## 🛠️ Troubleshooting

### Common Issues
- **Microphone Permissions**: Ensure browser microphone access
- **Audio Context**: Click interaction required for audio playbook
- **VAD Sensitivity**: Adjust threshold for different environments
- **Network Connectivity**: Check Supabase and Ultravox connections

### Debug Mode
Enable exhibition mode for detailed VAD logging and visual feedback.

## 📞 Support & Documentation

- **Project Documentation**: See `.claude/` directory
- **Session Logs**: Detailed development progress in `.claude/sessions/`
- **API Documentation**: Ultravox and Supabase integration guides
- **Hardware Setup**: Raspberry Pi deployment instructions

---

**Artist**: Peter Style  
**Technical Partner**: Claude AI  
**Exhibition**: "AI Władza Sztuki" (AI Authority of Art)  
**Venue**: Ujazdowski Castle Centre for Contemporary Art, Warsaw  
**Opening**: July 18, 2025
