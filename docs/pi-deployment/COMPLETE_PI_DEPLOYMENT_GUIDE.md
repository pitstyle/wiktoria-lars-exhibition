# Complete Pi Deployment Guide - Exhibition Ready

## 🎯 **COMPREHENSIVE DEPLOYMENT DOCUMENTATION**

**Based on actual deployment experience - Jan 14, 2025**

This guide documents every critical step, issue, and solution discovered during Pi deployment. Use this for rapid deployment to multiple Pis.

---

## **Phase 1: Pi System Setup (Prerequisites)**

### **1. Node.js Installation (CRITICAL - FIRST STEP)**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (REQUIRED for Next.js 13.5.6)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be 20.x
npm --version   # Should be 10.x+
```

**❌ Common Issue**: `npm: command not found`
**✅ Solution**: Node.js wasn't installed. Run the curl command above.

### **2. Additional System Dependencies**

```bash
# Install audio tools (for USB audio configuration)
sudo apt install -y alsa-utils

# Install Chromium browser (REQUIRED for WebRTC audio)
sudo apt install -y chromium-browser

# Install build tools (for npm packages)
sudo apt install -y build-essential
```

### **3. SSH Setup (For Deployment Access)**

```bash
# Enable SSH (if not already enabled)
sudo systemctl enable ssh
sudo systemctl start ssh

# Find Pi IP address
ip addr show | grep inet
```

---

## **Phase 2: Build Configuration (On Mac)**

### **1. Create Pi-Specific Files**

These files are essential for Pi deployment:

#### **package.pi.json** - Next.js 13.5.6 Configuration
```json
{
  "name": "wiktoria-lars-pi-exhibition",
  "version": "2.0.0-pi",
  "dependencies": {
    "next": "13.5.6",
    "eslint-config-next": "13.5.6"
  },
  "scripts": {
    "build": "NODE_OPTIONS=\"--max-old-space-size=1024\" next build",
    "start": "NODE_OPTIONS=\"--max-old-space-size=1024\" next start"
  }
}
```

#### **.babelrc** - ARM Compatibility
```json
{
  "presets": ["next/babel"]
}
```

#### **next.config.pi.mjs** - WITHOUT Redirect Loops
```javascript
const nextConfig = {
  experimental: {
    forceSwcTransforms: false,
  },
  output: 'standalone',
  poweredByHeader: false,
  // DO NOT include redirects() function - causes infinite loops
};
export default nextConfig;
```

### **2. Critical Configuration Issues**

**❌ Issue**: Next.js 14+ fails on ARM architecture
**✅ Solution**: Use Next.js 13.5.6 exactly

**❌ Issue**: SWC compiler not available on ARM
**✅ Solution**: Force Babel with `.babelrc` file

**❌ Issue**: Infinite redirect loops in browser
**✅ Solution**: Remove `redirects()` function from Pi config

**❌ Issue**: Pi runs out of memory during build
**✅ Solution**: Use `NODE_OPTIONS="--max-old-space-size=1024"`

---

## **Phase 3: SSH Authentication Setup**

### **1. SSH Key Generation (On Mac)**

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
# Press Enter for all prompts (default location, no passphrase)
```

### **2. Copy Key to Pi**

**Method 1: Manual Copy (Most Reliable)**
```bash
# Display your public key
cat ~/.ssh/id_rsa.pub

# SSH to Pi and run these commands:
ssh pitstyle@PI_IP
mkdir -p ~/.ssh
echo "PASTE_YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Method 2: ssh-copy-id (If Working)**
```bash
ssh-copy-id pitstyle@PI_IP
```

**❌ Issue**: SSH requires password for every command
**✅ Solution**: Set up SSH keys for passwordless authentication

---

## **Phase 4: Build Process**

### **1. Pi-Specific Build Script**

Create `scripts/build-pi.sh`:
```bash
#!/bin/bash
set -e

echo "🏗️  Building for Raspberry Pi (ARM64)..."

# Backup current package.json
cp package.json package.json.backup

# Use Pi-specific configs
cp package.pi.json package.json
cp next.config.pi.mjs next.config.mjs

# Install Pi-compatible dependencies
npm install

# Build with Pi constraints
NODE_OPTIONS="--max-old-space-size=1024" npm run build

echo "✅ Pi build completed successfully!"
```

### **2. Common Build Issues**

**❌ Issue**: `Failed to load SWC binary for linux/arm`
**✅ Solution**: Use Next.js 13.5.6 + .babelrc file

**❌ Issue**: Build process runs out of memory
**✅ Solution**: Use `NODE_OPTIONS="--max-old-space-size=1024"`

**❌ Issue**: TypeScript compilation errors
**✅ Solution**: Install correct eslint-config-next version (13.5.6)

---

## **Phase 5: Deployment Process**

### **1. File Transfer**

```bash
# Copy build to Pi
scp -r .next/ pitstyle@PI_IP:/home/pitstyle/exhibition/

# Copy Pi-specific configs
scp package.pi.json pitstyle@PI_IP:/home/pitstyle/exhibition/package.json
scp next.config.pi.mjs pitstyle@PI_IP:/home/pitstyle/exhibition/next.config.mjs
scp .babelrc pitstyle@PI_IP:/home/pitstyle/exhibition/

# Copy environment variables (CRITICAL)
scp .env.local pitstyle@PI_IP:/home/pitstyle/exhibition/
```

### **2. Pi Installation**

```bash
# SSH to Pi
ssh pitstyle@PI_IP

# Navigate to exhibition directory
cd /home/pitstyle/exhibition

# Install dependencies
npm install

# Start the application
npm start
```

**❌ Issue**: `scp: stat local ".next/": No such file or directory`
**✅ Solution**: Run `scp` commands from Mac, not from Pi

**❌ Issue**: Files copied but app won't start
**✅ Solution**: Ensure .env.local is copied with API key

---

## **Phase 6: Common Issues & Solutions**

### **1. Port Conflicts**

**❌ Issue**: `Error: listen EADDRINUSE: address already in use :::3000`

**✅ Solutions**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill specific process (replace PID)
kill -9 PID

# Nuclear option - kill everything on port 3000
sudo fuser -k 3000/tcp
```

### **2. API Authentication**

**❌ Issue**: `HTTP error! status: 500, message: {"error":"Error calling Ultravox API","details":"Ultravox API error: 403, {\"detail\":\"Invalid API key\"}"`

**✅ Solution**: 
```bash
# Ensure .env.local exists on Pi
ssh pitstyle@PI_IP "cd /home/pitstyle/exhibition && cat .env.local"

# If missing, create it
ssh pitstyle@PI_IP "cd /home/pitstyle/exhibition && echo 'ULTRAVOX_API_KEY=s0ybpQ0H.nIiU1cIDzg26xUu4y6otRzIUMtFg07EH' > .env.local"
```

### **3. Redirect Loops**

**❌ Issue**: `ERR_TOO_MANY_REDIRECTS` in browser

**✅ Solution**: Remove redirects() function from next.config.pi.mjs
```javascript
// Remove this entire section:
async redirects() {
  if (process.env.NODE_ENV === 'production') {
    return [
      {
        source: '/',
        destination: '/?exhibition=true',
        permanent: false,
      },
    ];
  }
  return [];
}
```

### **4. Audio Setup**

**❌ Issue**: Voice activation not working

**✅ USB Audio Detection**:
```bash
# Check USB audio is detected
aplay -l   # Should show USB Audio as card 3
arecord -l # Should show microphone capability
```

**✅ Configure USB Audio as Default**:
```bash
# Create audio configuration
cat > ~/.asoundrc << 'EOF'
defaults.pcm.card 3
defaults.ctl.card 3
EOF
```

**❌ Issue**: Can't hear speaker output
**✅ Partial Solution**: Microphone works (Lars hears user), speaker output needs additional configuration

---

## **Phase 7: Testing Procedure**

### **1. Basic App Test**

```bash
# Test basic connectivity
curl http://PI_IP:3000
# Should return HTML, not redirect errors
```

### **2. Exhibition Mode Test**

**From Mac browser**: `http://PI_IP:3000/?exhibition=true`
**From Pi browser**: `http://localhost:3000/?exhibition=true`

**Expected behavior**:
- ✅ Exhibition interface loads
- ✅ No redirect loops
- ✅ Voice activation interface visible

### **3. Voice Test**

1. **Connect USB audio adapter** to Pi
2. **Plug handset** into USB adapter
3. **Speak into handset** - Lars should detect voice
4. **Check conversation flow** - Lars → Wiktoria → Lars

**Current Status**:
- ✅ Microphone works (Lars hears user)
- ⚠️ Speaker output needs additional configuration

---

## **🎯 DEPLOYMENT CHECKLIST**

### **System Setup:**
- [ ] Node.js 20.x installed (`node --version`)
- [ ] npm available (`npm --version`)
- [ ] SSH enabled and accessible
- [ ] Audio tools installed (`alsa-utils`)
- [ ] Chromium browser installed

### **Build Process:**
- [ ] Next.js 13.5.6 configured (NOT 14+)
- [ ] .babelrc created for ARM compatibility
- [ ] Pi config without redirects() function
- [ ] Build completes successfully (158 kB optimized)

### **Deployment:**
- [ ] SSH keys set up for passwordless access
- [ ] .env.local copied with ULTRAVOX_API_KEY
- [ ] All files transferred (.next, configs, .babelrc)
- [ ] npm install successful on Pi
- [ ] App starts without port conflicts

### **Testing:**
- [ ] Basic page loads: `http://PI_IP:3000`
- [ ] Exhibition mode loads: `http://PI_IP:3000/?exhibition=true`
- [ ] Voice activation works (microphone detection)
- [ ] API authentication works (no 403 errors)
- [ ] No redirect loops in browser

### **Known Issues:**
- [ ] Speaker output configuration needs additional work
- [ ] Voice detection works, audio output needs ALSA configuration
- [ ] Browser audio vs command-line audio use different paths

---

## **🚀 RAPID DEPLOYMENT COMMANDS**

**For experienced users, these commands deploy to a fresh Pi:**

```bash
# On Pi (one-time setup)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs alsa-utils chromium-browser build-essential

# On Mac (build and deploy)
./scripts/build-pi.sh
scp -r .next/ package.pi.json next.config.pi.mjs .babelrc .env.local pitstyle@PI_IP:/home/pitstyle/exhibition/
ssh pitstyle@PI_IP "cd /home/pitstyle/exhibition && npm install && npm start"
```

---

## **📊 SUCCESS METRICS**

**Deployment successful when**:
- ✅ App loads without errors
- ✅ Exhibition mode accessible
- ✅ Voice activation detected
- ✅ Agent conversations work
- ✅ No redirect loops
- ✅ API authentication working

**Current Achievement**: 90% functional
- Voice input: ✅ Working
- Agent responses: ✅ Working
- Audio output: ⚠️ Needs configuration

---

**This guide represents the complete knowledge gained from actual Pi deployment. Use it for rapid deployment to multiple Pis.**