# PRD: Airport-Style Text Display App - Development Prompt

## Project Brief
You are tasked with building a standalone full-screen web application that displays transcript text from a Supabase database using realistic airport-style split-flap animations. The app should create an immersive experience similar to vintage airport departure boards.

## Reference Implementation
**Starting Point**: Use this CodePen as your foundation: https://codepen.io/branlok/pen/qBQEGJy
- This provides the core split-flap animation mechanics using CSS keyframes and rotateX transforms
- Extract the flip animation logic, timing functions, and visual styling approach
- Adapt the character-by-character animation system for dynamic text display

## Technical Specifications

### Database Integration
**Supabase Connection:**
- Connect to existing `transcripts` table with fields: `id`, `conversation_id`, `speaker`, `content`, `timestamp`, `stage`
- Implement real-time subscription using Supabase JavaScript client
- Query transcripts ordered by timestamp for chronological display
- Handle connection errors and reconnection logic

### Core Display Requirements
1. **Full-Screen Layout**: 
   - No navigation, headers, or UI chrome
   - White background (#FFFFFF)
   - Text fills entire viewport systematically

2. **Text Flow Pattern**:
   - Display transcript content chunk by chunk
   - Fill screen row by row, left to right
   - Automatic text wrapping at word boundaries
   - Clear completed rows when screen fills

3. **Typography**:
   - Monospace font (Courier New or similar)
   - Large, readable text size (approximately 24-32px)
   - High contrast black text on white background
   - Consistent character spacing for animation alignment

### Animation System
**Split-Flap Mechanics** (based on CodePen reference):
- Individual character animations using CSS rotateX transforms
- Mechanical flip timing: ~150-250ms per character
- Staggered delays between characters (50-100ms offset)
- Realistic easing curves (cubic-bezier for mechanical feel)
- Half-flip effect showing character transition

**Animation Sequence**:
1. New transcript chunk arrives from Supabase
2. Queue characters for display
3. Calculate positioning for next available screen space
4. Animate each character with split-flap effect
5. Continue until chunk complete, then await next chunk

### Technical Implementation
**Architecture:**
```
index.html          - Main application shell
styles.css          - Split-flap animations and layout
app.js             - Main application logic
supabase-client.js - Database connection and subscriptions
animation.js       - Flip animation controller
text-manager.js    - Text queuing and positioning
```

**Key Functions to Implement:**
1. `initSupabaseConnection()` - Setup real-time transcript subscription
2. `queueTextChunk(text)` - Add new content to display queue
3. `calculateNextPosition()` - Determine where to place next characters
4. `animateCharacterFlip(char, position)` - Execute split-flap animation
5. `clearRowWhenFull()` - Manage screen space and text overflow

### Data Flow
1. App connects to Supabase on load
2. Subscribe to new transcript entries
3. Process incoming text chunks in chronological order
4. Split text into individual characters
5. Queue characters for sequential animation
6. Display characters using split-flap animations
7. Manage screen space and continue with new content

### Performance Considerations
- Optimize animations for 60fps performance
- Limit DOM elements for large text volumes
- Implement efficient text queuing system
- Handle rapid incoming transcript updates gracefully

### Error Handling
- Supabase connection failures with retry logic
- Missing or malformed transcript data
- Animation performance degradation
- Screen overflow management

## Deliverables
1. Fully functional standalone web application
2. Real-time Supabase integration for transcript display
3. Smooth split-flap animations based on CodePen reference
4. Responsive full-screen text display system
5. Clean, production-ready code with proper error handling

## Success Criteria
- Text appears dynamically with realistic airport-style flip animations
- Seamless real-time updates from Supabase transcript database
- Full-screen display with no UI distractions
- Smooth performance with large volumes of text
- Professional visual quality matching vintage airport displays

Use the provided CodePen as your animation foundation and build a complete application around it for live transcript visualization.

## Reference Code from CodePen

### Modified HTML Structure (for transcript display)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Airport Transcript Display</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="transcript-display">
        <!-- Dynamic flap characters will be generated here -->
        <div class="split-flap-wrapper flex-center-all" id="flapDisplay">
            <!-- Flap elements will be dynamically created -->
        </div>
    </div>
    <script src="supabase-client.js"></script>
    <script src="animation.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### Core CSS Animations (adapted from CodePen)
```css
@keyframes flip {
  from {
    transform: rotateX(-0deg);
  }
  to {
    transform: rotateX(-90deg);
  }
}

@keyframes bflip {
  from {
    transform: rotateX(90deg);
  }
  to {
    transform: rotateX(0deg);
  }
}

* {
  box-sizing: border-box;
  padding: 0px;
  margin: 0px;
}

html, body {
  height: 100%;
  width: 100%;
  background-color: #FFFFFF; /* White background for transcript display */
  color: #000000; /* Black text */
  font-family: 'Courier New', monospace;
  overflow: hidden;
}

.transcript-display {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 20px;
}

.split-flap-wrapper {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
  align-content: flex-start;
  gap: 5px;
}

.flap {
  width: 40px;
  height: 60px;
  border: 1px solid #333;
  font-size: 32px;
  flex-direction: column;
  display: flex;
  background-color: #f5f5f5;
  perspective: 700px;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin: 2px;
}

.top {
  border-bottom: 1px solid #ddd;
}

.top, .bottom {
  width: 100%;
  height: 50%;
  text-align: center;
  position: relative;
  overflow: hidden;
  background-color: #ffffff;
}

.top-flap-visible,
.top-flap-queued {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 100%;
  background-color: #ffffff;
  z-index: 2;
  border-radius: 4px 4px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.top-flap-queued {
  z-index: 1;
}

.bottom-flap-visible,
.bottom-flap-queued {
  position: absolute;
  top: 0px;
  left: 0px;
  height: 100%;
  width: 100%;
  background-color: #ffffff;
  z-index: 1;
  overflow: hidden;
  border-radius: 0 0 4px 4px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 50%;
}

.bottom-flap-queued {
  z-index: 2;
  transform: rotateX(90deg);
  overflow: hidden;
}

.top-flap-animation {
  animation: flip 0.15s ease-in;
  transform-origin: bottom;
}

.bottom-flap-animation {
  animation: bflip 0.15s ease-in;
  transform-origin: top;
  animation-delay: 0.15s;
}

/* Space character styling */
.space-char {
  width: 20px;
  background: transparent;
  border: none;
  box-shadow: none;
}
```

### Core JavaScript Animation Logic (adapted from CodePen)
```javascript
"use strict";

// Character set for split-flap display
const FLAP_CHARACTERS = 
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:-_() ";

class SplitFlapDisplay {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.flaps = [];
    this.currentRow = 0;
    this.currentCol = 0;
    this.charsPerRow = Math.floor(window.innerWidth / 45); // Approximate based on flap width
    this.maxRows = Math.floor(window.innerHeight / 65); // Approximate based on flap height
  }

  createFlap() {
    const flap = document.createElement('div');
    flap.className = 'flap flex-center-all';
    
    flap.innerHTML = `
      <div class="top">
        <div class="top-flap-queued"><span> </span></div>
        <div class="top-flap-visible"><span> </span></div>
      </div>
      <div class="bottom">
        <div class="bottom-flap-queued"><span> </span></div>
        <div class="bottom-flap-visible"><span> </span></div>
      </div>
    `;
    
    return flap;
  }

  addCharacter(targetChar) {
    if (this.currentCol >= this.charsPerRow) {
      this.currentRow++;
      this.currentCol = 0;
      
      // Clear screen if we've reached max rows
      if (this.currentRow >= this.maxRows) {
        this.clearDisplay();
        this.currentRow = 0;
      }
    }

    const flap = this.createFlap();
    this.container.appendChild(flap);
    this.flaps.push(flap);

    // Handle space characters differently
    if (targetChar === ' ') {
      flap.classList.add('space-char');
      this.currentCol++;
      return;
    }

    this.animateToCharacter(flap, targetChar);
    this.currentCol++;
  }

  animateToCharacter(flap, targetChar) {
    const topFlapVisible = flap.querySelector('.top-flap-visible');
    const topFlapQueued = flap.querySelector('.top-flap-queued');
    const bottomFlapVisible = flap.querySelector('.bottom-flap-visible');
    const bottomFlapQueued = flap.querySelector('.bottom-flap-queued');

    let currentIndex = 0;
    const targetIndex = FLAP_CHARACTERS.indexOf(targetChar);
    
    if (targetIndex === -1) return; // Character not found

    const animateStep = () => {
      if (currentIndex === targetIndex) return;

      const currentChar = FLAP_CHARACTERS[currentIndex];
      const nextChar = FLAP_CHARACTERS[(currentIndex + 1) % FLAP_CHARACTERS.length];

      // Set up the flaps
      topFlapVisible.innerHTML = `<span>${currentChar}</span>`;
      topFlapQueued.innerHTML = `<span>${nextChar}</span>`;
      bottomFlapQueued.innerHTML = `<span>${nextChar}</span>`;
      bottomFlapVisible.innerHTML = `<span>${currentChar}</span>`;

      // Start animations
      topFlapVisible.classList.add('top-flap-animation');
      bottomFlapQueued.classList.add('bottom-flap-animation');

      // Handle animation completion
      const handleTopAnimationEnd = () => {
        topFlapVisible.innerHTML = `<span>${nextChar}</span>`;
        topFlapQueued.innerHTML = `<span>${FLAP_CHARACTERS[(currentIndex + 2) % FLAP_CHARACTERS.length]}</span>`;
        topFlapVisible.classList.remove('top-flap-animation');
        topFlapVisible.removeEventListener('animationend', handleTopAnimationEnd);
      };

      const handleBottomAnimationEnd = () => {
        bottomFlapVisible.innerHTML = `<span>${nextChar}</span>`;
        bottomFlapQueued.innerHTML = `<span>${FLAP_CHARACTERS[(currentIndex + 2) % FLAP_CHARACTERS.length]}</span>`;
        bottomFlapQueued.classList.remove('bottom-flap-animation');
        bottomFlapQueued.removeEventListener('animationend', handleBottomAnimationEnd);
        
        currentIndex++;
        if (currentIndex < targetIndex) {
          setTimeout(animateStep, 100); // Delay between character changes
        }
      };

      topFlapVisible.addEventListener('animationend', handleTopAnimationEnd);
      bottomFlapQueued.addEventListener('animationend', handleBottomAnimationEnd);
    };

    animateStep();
  }

  displayText(text) {
    for (const char of text) {
      this.addCharacter(char);
    }
  }

  clearDisplay() {
    this.container.innerHTML = '';
    this.flaps = [];
    this.currentRow = 0;
    this.currentCol = 0;
  }
}

// Usage example:
// const display = new SplitFlapDisplay('flapDisplay');
// display.displayText('Hello World');
```

### Supabase Integration Template
```javascript
// supabase-client.js
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

class TranscriptManager {
  constructor(displayInstance) {
    this.display = displayInstance;
    this.lastTimestamp = null;
    this.setupRealtimeSubscription();
  }

  async setupRealtimeSubscription() {
    // Subscribe to new transcript entries
    const subscription = supabase
      .channel('transcripts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcripts'
      }, (payload) => {
        this.handleNewTranscript(payload.new);
      })
      .subscribe();

    // Load initial transcripts
    await this.loadInitialTranscripts();
  }

  async loadInitialTranscripts() {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .order('timestamp', { ascending: true })
      .limit(10);

    if (data) {
      for (const transcript of data) {
        this.display.displayText(transcript.content + ' ');
      }
    }
  }

  handleNewTranscript(transcript) {
    // Add new transcript content to display
    this.display.displayText(transcript.content + ' ');
  }
}
```

## Implementation Notes
- Remove all UI elements (forms, buttons, titles) from the original CodePen
- Adapt the flap sizing for full-screen text display
- Change color scheme to white background with black text
- Implement dynamic flap creation for unlimited text
- Add row/column management for proper text flow
- Integrate with Supabase for real-time transcript updates

The provided code snippets show the essential modifications needed to transform the CodePen demo into a full-screen transcript display system.

## Auto-Start Configuration

### Main App Initialization (app.js)
```javascript
// app.js - Auto-start the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the split-flap display
        const display = new SplitFlapDisplay('flapDisplay');
        
        // Initialize transcript manager (will auto-connect to Supabase)
        const transcriptManager = new TranscriptManager(display);
        
        console.log('Airport Display System: Ready and connected to Supabase');
        
        // Optional: Show connection status
        display.displayText('SYSTEM READY - WAITING FOR TRANSCRIPTS...');
        
    } catch (error) {
        console.error('Failed to initialize Airport Display:', error);
        // Fallback display
        document.body.innerHTML = `
            <div style="color: red; font-size: 24px; text-align: center; margin-top: 50vh;">
                CONNECTION ERROR: Check Supabase credentials
            </div>`;
    }
});
```

### Environment Configuration Template
```javascript
// config.js - Replace with your actual Supabase credentials
const CONFIG = {
    SUPABASE_URL: 'https://your-project-id.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    
    // Display settings
    ANIMATION_SPEED: 150, // ms per character flip
    CHARACTERS_PER_ROW: Math.floor(window.innerWidth / 45),
    MAX_ROWS: Math.floor(window.innerHeight / 65),
    
    // Auto-clear screen when full
    AUTO_CLEAR: true,
    
    // Real-time subscription settings
    REALTIME_CHANNEL: 'transcripts',
    INITIAL_LOAD_LIMIT: 50 // Load last 50 transcripts on startup
};
```

### Updated Supabase Integration (Auto-Connect)
```javascript
// supabase-client.js - Updated with auto-connection
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

class TranscriptManager {
    constructor(displayInstance) {
        this.display = displayInstance;
        this.supabase = null;
        this.isConnected = false;
        this.init();
    }

    async init() {
        try {
            // Auto-connect to Supabase
            this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
            
            // Test connection
            const { data, error } = await this.supabase.from('transcripts').select('count').limit(1);
            
            if (error) throw error;
            
            this.isConnected = true;
            console.log('Connected to Supabase successfully');
            
            // Start real-time subscription
            await this.setupRealtimeSubscription();
            
            // Load and display recent transcripts
            await this.loadInitialTranscripts();
            
        } catch (error) {
            console.error('Supabase connection failed:', error);
            this.display.displayText(`CONNECTION ERROR: ${error.message}`);
        }
    }

    async setupRealtimeSubscription() {
        if (!this.isConnected) return;

        const subscription = this.supabase
            .channel(CONFIG.REALTIME_CHANNEL)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'transcripts'
            }, (payload) => {
                console.log('New transcript received:', payload.new);
                this.handleNewTranscript(payload.new);
            })
            .subscribe((status) => {
                console.log('Subscription status:', status);
            });

        console.log('Real-time subscription active');
    }

    async loadInitialTranscripts() {
        if (!this.isConnected) return;

        try {
            const { data, error } = await this.supabase
                .from('transcripts')
                .select('content, speaker, timestamp')
                .order('timestamp', { ascending: true })
                .limit(CONFIG.INITIAL_LOAD_LIMIT);

            if (error) throw error;

            if (data && data.length > 0) {
                // Clear "SYSTEM READY" message
                this.display.clearDisplay();
                
                // Display each transcript with speaker prefix
                for (const transcript of data) {
                    const formattedText = `${transcript.speaker}: ${transcript.content} `;
                    this.display.displayText(formattedText);
                }
                
                console.log(`Loaded ${data.length} initial transcripts`);
            }
        } catch (error) {
            console.error('Failed to load initial transcripts:', error);
        }
    }

    handleNewTranscript(transcript) {
        // Format and display new transcript
        const formattedText = `${transcript.speaker}: ${transcript.content} `;
        this.display.displayText(formattedText);
        
        console.log(`Displayed: ${formattedText.slice(0, 50)}...`);
    }
}
```

### Complete HTML with Auto-Start
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Airport Transcript Display</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="transcript-display">
        <div class="split-flap-wrapper" id="flapDisplay">
            <!-- Flap elements will be dynamically created -->
        </div>
    </div>
    
    <!-- Scripts in order -->
    <script src="config.js"></script>
    <script src="animation.js"></script>
    <script src="supabase-client.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

## Quick Setup Instructions

1. **Replace credentials in `config.js`:**
   ```javascript
   const CONFIG = {
       SUPABASE_URL: 'https://your-actual-project.supabase.co',
       SUPABASE_ANON_KEY: 'your-actual-anon-key'
   };
   ```

2. **Open `index.html` in browser** - the app will:
   - Auto-connect to Supabase
   - Load recent transcripts with flip animations
   - Start real-time listening for new transcripts
   - Display each new transcript as it arrives

3. **That's it!** The display will automatically show live transcripts from your Supabase database with airport-style flip animations.

## Expected Behavior
- **On Load**: Shows "SYSTEM READY" then loads recent transcripts
- **Live Updates**: New transcripts appear automatically with flip animations
- **Screen Management**: Auto-clears when screen fills, continues with new content
- **Error Handling**: Shows connection errors if Supabase credentials are wrong

The app is designed to be completely autonomous once the Supabase credentials are provided.

## React Implementation

### Updated React Component with Supabase Integration
```jsx
// TranscriptFlapDisplay.jsx
import React, { useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const TranscriptFlapDisplay = ({ 
  supabaseUrl, 
  supabaseKey,
  animationSpeed = 200 // ms per character flip
}) => {
  const containerRef = useRef(null);
  const [supabase, setSupabase] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [displayQueue, setDisplayQueue] = useState([]);
  const [currentFlaps, setCurrentFlaps] = useState([]);
  
  // Character set for split-flap display
  const FLAP_CHARACTERS = 
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:-_() ";

  // Supabase connection setup
  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) return;
    
    const initSupabase = async () => {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        
        // Test connection
        const { data, error } = await client.from('transcripts').select('count').limit(1);
        if (error) throw error;
        
        setSupabase(client);
        setIsConnected(true);
        console.log('Connected to Supabase successfully');
        
        // Load initial transcripts
        loadInitialTranscripts(client);
        
        // Setup real-time subscription
        setupRealtimeSubscription(client);
        
      } catch (error) {
        console.error('Supabase connection failed:', error);
        // Display error message
        displayText(`CONNECTION ERROR: ${error.message}`);
      }
    };
    
    initSupabase();
  }, [supabaseUrl, supabaseKey]);

  const loadInitialTranscripts = async (client) => {
    try {
      const { data, error } = await client
        .from('transcripts')
        .select('content, speaker, timestamp')
        .order('timestamp', { ascending: true })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        // Display each transcript
        for (const transcript of data) {
          const formattedText = `${transcript.speaker}: ${transcript.content} `;
          displayText(formattedText);
        }
      }
    } catch (error) {
      console.error('Failed to load initial transcripts:', error);
    }
  };

  const setupRealtimeSubscription = (client) => {
    const subscription = client
      .channel('transcripts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transcripts'
      }, (payload) => {
        console.log('New transcript received:', payload.new);
        const formattedText = `${payload.new.speaker}: ${payload.new.content} `;
        displayText(formattedText);
      })
      .subscribe();
  };

  const displayText = (text) => {
    setDisplayQueue(prev => [...prev, text]);
  };

  // Process display queue
  useEffect(() => {
    if (displayQueue.length === 0) return;
    
    const processQueue = async () => {
      const nextText = displayQueue[0];
      await animateText(nextText);
      setDisplayQueue(prev => prev.slice(1));
    };
    
    processQueue();
  }, [displayQueue]);

  const animateText = async (text) => {
    return new Promise((resolve) => {
      if (!containerRef.current) {
        resolve();
        return;
      }

      const container = containerRef.current;
      const centerDiv = container.querySelector('.center') || createCenterDiv();
      
      // Create flaps for each character
      const textArray = text.toUpperCase().split('');
      
      // Clear existing flaps if needed for new row
      const maxFlapsPerRow = Math.floor(window.innerWidth / 120); // Approximate
      const currentFlapCount = centerDiv.children.length;
      
      if (currentFlapCount + textArray.length > maxFlapsPerRow) {
        // Clear display for new row
        centerDiv.innerHTML = '';
        setCurrentFlaps([]);
      }

      // Create and animate new flaps
      textArray.forEach((char, index) => {
        setTimeout(() => {
          createAndAnimateFlap(centerDiv, char);
          if (index === textArray.length - 1) {
            setTimeout(resolve, animationSpeed * 2);
          }
        }, index * 50); // Staggered timing
      });
    });
  };

  const createCenterDiv = () => {
    if (!containerRef.current) return null;
    
    containerRef.current.innerHTML = '';
    const centerDiv = document.createElement('div');
    centerDiv.className = 'center';
    containerRef.current.appendChild(centerDiv);
    return centerDiv;
  };

  const createAndAnimateFlap = (container, targetChar) => {
    // Create flap HTML structure
    const flapDiv = document.createElement('div');
    flapDiv.className = 'splitflap';
    flapDiv.innerHTML = `
      <div class="top"></div>
      <div class="bottom"></div>
      <div class="nextHalf"></div>
      <div class="nextFull"></div>
    `;
    
    container.appendChild(flapDiv);

    // Get flap elements
    const top = flapDiv.querySelector('.top');
    const bottom = flapDiv.querySelector('.bottom');
    const nextHalf = flapDiv.querySelector('.nextHalf');
    const nextFull = flapDiv.querySelector('.nextFull');

    // Set animation duration
    bottom.style.animationDuration = `${animationSpeed}ms`;
    nextHalf.style.animationDuration = `${animationSpeed}ms`;

    // Handle space characters
    if (targetChar === ' ') {
      flapDiv.style.visibility = 'hidden';
      flapDiv.style.width = '30px'; // Smaller width for spaces
      return;
    }

    // Animate to target character
    const targetIndex = FLAP_CHARACTERS.indexOf(targetChar);
    if (targetIndex === -1) return;

    let currentIndex = 0;
    
    const animateStep = () => {
      if (currentIndex === targetIndex) return;

      const currentChar = FLAP_CHARACTERS[currentIndex];
      const nextChar = FLAP_CHARACTERS[currentIndex + 1] || FLAP_CHARACTERS[0];

      // Set up the flaps
      top.innerHTML = currentChar;
      bottom.innerHTML = currentChar;
      nextFull.innerHTML = nextChar;
      nextHalf.innerHTML = nextChar;

      // Trigger animations
      bottom.classList.remove('flip1');
      void bottom.offsetWidth; // Force reflow
      bottom.classList.add('flip1');

      nextHalf.classList.remove('flip2');
      void nextHalf.offsetWidth; // Force reflow
      nextHalf.classList.add('flip2');

      currentIndex++;
      
      if (currentIndex <= targetIndex) {
        setTimeout(animateStep, animationSpeed);
      }
    };

    // Start animation sequence
    setTimeout(animateStep, 100);
  };

  // Initialize display on mount
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create initial structure
    const centerDiv = createCenterDiv();
    
    if (!isConnected) {
      displayText('SYSTEM READY - CONNECTING TO SUPABASE...');
    }
  }, []);

  return (
    <>
      {/* CSS Styles - Updated for transcript display */}
      <style>{`
        .transcript-split-flap-container {
          width: 100vw;
          height: 100vh;
          background-color: #FFFFFF;
          display: flex;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 20px;
          overflow: hidden;
        }
        
        .splitflap {
          position: relative;
          min-width: 80px;
          height: 80px;
          margin: 3px;
          line-height: 80px;
          font-size: 60px;
          font-family: 'Courier New', monospace;
          text-align: center;
          color: white;
        }
        
        .center {
          position: relative;
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
        }
        
        .top {
          position: relative;
          height: 50%;
          width: 100%;
          background-color: #333333;
          border-radius: 8px 8px 0 0;
          overflow: hidden;
          z-index: 0;
          border: 1px solid #555;
        }
        
        .center > div {
          perspective: 500px;
        }
        
        .bottom {
          position: relative;
          height: 100%;
          width: 100%;
          margin-top: -50%;
          border-radius: 8px 8px 8px 8px;
          z-index: -1;
          background-color: #222222;
          background-image: linear-gradient(rgba(51, 51, 51, 0), #333333);
          transform-origin: center;
          border: 1px solid #555;
        }
        
        .nextHalf {
          position: relative;
          height: 50%;
          width: 100%;
          margin-top: -100%;
          overflow: hidden;
          border-radius: 8px 8px 0 0;
          z-index: 2;
          background-color: #222222;
          background-image: linear-gradient(#333333, rgba(51, 51, 51, 0));
          transform-origin: bottom;
          border: 1px solid #555;
        }
        
        .nextFull {
          position: relative;
          height: 100%;
          width: 100%;
          background-color: #333333;
          margin-top: -50%;
          border-radius: 8px 8px 8px 8px;
          z-index: -3;
          border: 1px solid #555;
        }
        
        .flip1 {
          animation: flip1 ease-in 1;
        }
        
        .flip2 {
          animation: flip2 ease-out 1;
        }
        
        @keyframes flip1 {
          0% {
            transform: rotateX(0deg);
            background-color: #333333;
          }
          50% {
            transform: rotateX(90deg);
            background-color: #111111;
          }
          100% {
            transform: rotateX(90deg);
          }
        }
        
        @keyframes flip2 {
          0% {
            transform: rotateX(-90deg);
          }
          50% {
            transform: rotateX(-90deg);
          }
          100% {
            transform: rotateX(0deg);
            background-color: #333333;
          }
        }
      `}</style>
      
      <div 
        ref={containerRef}
        className="transcript-split-flap-container"
      />
    </>
  );
};

export default TranscriptFlapDisplay;
```

### Usage in App.js
```jsx
// App.js
import React from 'react';
import TranscriptFlapDisplay from './TranscriptFlapDisplay';

function App() {
  return (
    <div>
      <TranscriptFlapDisplay 
        supabaseUrl="https://your-project-id.supabase.co"
        supabaseKey="your-anon-key-here"
        animationSpeed={200}
      />
    </div>
  );
}

export default App;
```

### Required Dependencies
```bash
npm install @supabase/supabase-js
```

## Key Features of React Implementation

1. **Auto-Connect**: Connects to Supabase automatically when component mounts
2. **Real-time Updates**: Subscribes to new transcript entries
3. **Dynamic Display**: Creates flaps dynamically for unlimited text
4. **Row Management**: Auto-wraps text and clears screen when full
5. **Error Handling**: Shows connection errors in the display
6. **Customizable**: Animation speed and styling can be adjusted
7. **Clean Integration**: Just pass Supabase credentials as props

## Setup Process
1. Install Supabase dependency
2. Replace `supabaseUrl` and `supabaseKey` props with your credentials
3. The component will auto-connect and start displaying transcripts immediately

The React implementation maintains the original flip animation while adding full Supabase integration for live transcript display.