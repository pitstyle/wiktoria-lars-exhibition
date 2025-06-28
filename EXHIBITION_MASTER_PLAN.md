# 🎨 ART EXHIBITION MASTER PLAN
## Interactive Voice Stations - July 18th Opening

### 🎯 Exhibition Overview
Art exhibition featuring interactive voice-based AI stations with Lars & Wiktoria characters. Visitors interact through vintage handsets connected to Raspberry Pi systems.

---

## 📍 STATION LAYOUT

### **Stations 1-5: Voice Interaction Stations**
- **Hardware**: Raspberry Pi + vintage handset (3.5mm jack)
- **Functionality**: Voice-activated Lars conversations
- **User Experience**: Pick up handset → voice detection → Lars activation
- **No UI**: Pure voice interaction, no buttons/screens

### **Station 6: Special Wiktoria Station**
- **Hardware**: Raspberry Pi + handset + vertical TV
- **Functionality**: Outbound/inbound calls via Twilio + cellular
- **Features**: Instagram post creation during calls (n8n integration)
- **Display**: Wiktoria's Instagram feed with live updates

### **Display System: 3 Vertical TVs**
- **TV 1**: Wiktoria Instagram feed (live updates)
- **TV 2 & 3**: Archive transcript display with airport flip animation
- **Hardware**: Each TV has dedicated Raspberry Pi

---

## 🏗️ TECHNICAL IMPLEMENTATION PLAN

### **PHASE 1: Voice Activation System (Week 1)**
#### Core Voice Detection
- [ ] Implement continuous voice activity detection
- [ ] Replace button-based activation with voice triggers
- [ ] Add silence detection for session end
- [ ] Optimize for vintage handset audio quality

#### Audio Intro System
- [ ] Create Lars intro audio: "Mów, start to speak, nie bój się, do not be afraid..."
- [ ] Implement loop system for standby mode
- [ ] Voice detection to interrupt intro and start conversation
- [ ] Fallback to intro after conversation ends

#### Technical Requirements
```javascript
// Voice activation architecture
- WebRTC voice activity detection
- Audio level threshold configuration
- Handset audio optimization
- Session timeout management
```

### **PHASE 2: Airport Flip Display System (Week 2)**
#### Display Architecture
- [ ] Create React/Vue app for airport-style flip animation
- [ ] Design split-flap character animations (CSS/JS)
- [ ] Implement real-time Supabase transcript fetching
- [ ] Create text chunking system for 2 displays

#### Animation System
```css
/* Airport flip animation concept */
.flip-character {
  transform-style: preserve-3d;
  animation: flip 0.6s ease-in-out;
}
```

#### Data Integration
- [ ] Connect to Supabase archive via API
- [ ] Implement text streaming/chunking
- [ ] Real-time updates when new transcripts arrive
- [ ] Text preprocessing for optimal display

### **PHASE 3: Instagram Feed Display (Week 2-3)**
#### Instagram Integration
- [ ] Create Instagram Basic Display API connection
- [ ] Real-time feed fetching and caching
- [ ] Vertical display optimization
- [ ] Auto-refresh system for new posts

#### Visual Design
- [ ] Instagram-style feed layout for vertical TV
- [ ] Post transition animations
- [ ] Image/video display optimization
- [ ] Responsive design for exhibition viewing

### **PHASE 4: Raspberry Pi Deployment (Week 3)**
#### Hardware Setup
- [ ] Raspberry Pi OS configuration for each unit
- [ ] Audio routing for vintage handsets
- [ ] TV display configuration (HDMI output)
- [ ] Network connectivity setup

#### Software Deployment
- [ ] Deploy voice activation app to Pi units 1-5
- [ ] Deploy Wiktoria special station to Pi unit 6
- [ ] Deploy display apps to TV Pi units
- [ ] Create startup scripts and auto-launch

### **PHASE 5: Enhanced Twilio Integration (Week 3-4)**
#### Cellular Integration
- [ ] Enhance existing Twilio setup
- [ ] Configure outbound/inbound calling
- [ ] Test cellular number integration
- [ ] Optimize call quality for exhibition

#### n8n Instagram Enhancement
- [ ] Review existing n8n workflow
- [ ] Enhance Instagram post creation
- [ ] Add call transcript integration
- [ ] Real-time Instagram feed updates

### **PHASE 6: Exhibition Website (Week 4)**
#### Website Development
- [ ] Create project overview website
- [ ] Include live app demo version
- [ ] Add exhibition information
- [ ] Document technical architecture
- [ ] Artist statement and concept explanation

---

## 🛠️ DEVELOPMENT STRATEGY

### **Parallel Development Approach**
1. **Main Agent**: Voice activation + Raspberry Pi integration
2. **Second Agent**: Airport flip display system
3. **Third Agent**: Instagram feed display + website

### **Component Breakdown**

#### **A. Voice Activation App** (Stations 1-5)
```
/voice-station-app/
├── src/
│   ├── audio/
│   │   ├── VoiceDetector.ts
│   │   ├── AudioProcessor.ts
│   │   └── HandsetInterface.ts
│   ├── conversation/
│   │   ├── UltravoxConnector.ts
│   │   └── SessionManager.ts
│   └── intro/
│       ├── IntroPlayer.ts
│       └── LoopManager.ts
```

#### **B. Airport Display App** (TVs 2-3)
```
/airport-display-app/
├── src/
│   ├── components/
│   │   ├── FlipBoard.tsx
│   │   ├── FlipCharacter.tsx
│   │   └── TextChunker.tsx
│   ├── services/
│   │   ├── SupabaseConnector.ts
│   │   └── TranscriptStreamer.ts
│   └── animations/
│       └── FlipAnimations.css
```

#### **C. Instagram Display App** (TV 1)
```
/instagram-display-app/
├── src/
│   ├── components/
│   │   ├── InstagramFeed.tsx
│   │   └── PostDisplay.tsx
│   └── services/
│       └── InstagramAPI.ts
```

#### **D. Exhibition Website**
```
/exhibition-website/
├── src/
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── LiveDemo.tsx
│   │   └── About.tsx
│   └── components/
│       └── ConceptExplanation.tsx
```

---

## 📋 IMPLEMENTATION TASKS

### **Week 1: Foundation**
- [ ] Voice activation system development
- [ ] Audio intro creation and implementation
- [ ] Handset integration testing
- [ ] Basic Raspberry Pi setup

### **Week 2: Display Systems**
- [ ] Airport flip animation development
- [ ] Instagram feed display creation
- [ ] Supabase integration for displays
- [ ] Real-time update systems

### **Week 3: Integration**
- [ ] Raspberry Pi deployment and testing
- [ ] Hardware integration (handsets + TVs)
- [ ] Network setup and connectivity
- [ ] Exhibition space testing

### **Week 4: Polish & Launch**
- [ ] Final testing and optimization
- [ ] Exhibition website completion
- [ ] Documentation and setup guides
- [ ] Final rehearsal and calibration

---

## 🔧 TECHNICAL SPECIFICATIONS

### **Hardware Requirements**
- **6x Raspberry Pi 4** (minimum 4GB RAM)
- **3x Vertical TVs** with HDMI input
- **6x Vintage handsets** with 3.5mm connection
- **Network infrastructure** (WiFi/Ethernet)
- **Audio amplification** for handsets if needed

### **Software Stack**
- **Voice Stations**: Node.js + WebRTC + Ultravox API
- **Displays**: React/Vue + Supabase + Instagram API
- **Backend**: Existing Supabase + Ultravox infrastructure
- **Deployment**: Docker containers on Raspberry Pi

### **API Integrations**
- **Ultravox**: Voice conversation handling
- **Supabase**: Transcript archive and real-time data
- **Instagram Basic Display API**: Feed fetching
- **Twilio**: Cellular call integration
- **n8n**: Instagram post automation

---

## 🎨 CREATIVE CONSIDERATIONS

### **User Experience Flow**
1. **Approach**: Visitor sees stations with vintage handsets
2. **Pickup**: Lifting handset triggers voice detection
3. **Intro**: Lars welcomes in both languages
4. **Conversation**: Natural voice interaction begins
5. **Observation**: Visitors can watch transcript displays
6. **Instagram**: Live posts create during Wiktoria calls

### **Exhibition Aesthetics**
- **Vintage handsets**: Nostalgic technology contrast
- **Airport displays**: Dynamic, mesmerizing text animation
- **Instagram feed**: Modern social media integration
- **Multilingual**: Polish/English accessibility

---

## 📅 TIMELINE TO JULY 18TH

### **Critical Path** (4 weeks total)
- **Week 1** (June 28 - July 5): Core voice activation
- **Week 2** (July 6 - July 12): Display systems
- **Week 3** (July 13 - July 19): Integration & testing
- **Week 4** (July 20+): Final polish & exhibition

### **Risk Mitigation**
- **Hardware backup**: Extra Raspberry Pi units
- **Network fallback**: Local caching for displays
- **Audio testing**: Multiple handset configurations
- **Content preparation**: Pre-recorded fallbacks

---

## 🚀 SUCCESS METRICS

### **Technical Goals**
- [ ] 100% reliable voice activation
- [ ] <2 second response time
- [ ] Seamless handset audio quality
- [ ] Real-time display updates
- [ ] 6-hour continuous operation

### **Exhibition Goals**
- [ ] Intuitive visitor interaction
- [ ] Engaging visual displays
- [ ] Multilingual accessibility
- [ ] Instagram content generation
- [ ] Technical reliability throughout exhibition

---

**Next Steps**: Confirm this plan and begin Phase 1 development with voice activation system.