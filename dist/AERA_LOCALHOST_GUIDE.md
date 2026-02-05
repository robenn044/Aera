# AERA Smart Mirror - Complete Localhost Development Guide

> Run AERA on your local machine for development and testing

---

## Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Quick Start](#2-quick-start)
3. [Environment Configuration](#3-environment-configuration)
4. [Gemini API Setup](#4-gemini-api-setup)
5. [Running Locally](#5-running-locally)
6. [Keyboard Shortcuts](#6-keyboard-shortcuts)
7. [Viewing Logs](#7-viewing-logs)
8. [Troubleshooting](#8-troubleshooting)
9. [Raspberry Pi Deployment](#9-raspberry-pi-deployment)

---

## 1. Prerequisites

- **Node.js** 18+ and npm/bun
- **Modern browser** (Chrome/Edge recommended for Web Speech API)
- **Webcam** (for simulation mode camera features)
- **Microphone** (for voice input)

---

## 2. Quick Start

```bash
# Clone/download the project
cd aera-smart-mirror

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and add your Gemini API key
nano .env

# Start development server
npm run dev
```

Open: **http://localhost:5173**

---

## 3. Environment Configuration

Create a `.env` file in the project root:

```env
# ============================================================
# SIMULATION MODE - Set to 'true' for local development
# ============================================================
VITE_SIMULATION_MODE=true

# ============================================================
# GEMINI API KEY (Required for AI features)
# ============================================================
# Get your key from: https://makersuite.google.com/app/apikey
VITE_GEMINI_API_KEY=your_api_key_here

# ============================================================
# RASPBERRY PI (Only needed when SIMULATION_MODE=false)
# ============================================================
VITE_RASPBERRY_PI_IP=192.168.1.100
VITE_SENSOR_PORT=5000
VITE_CAMERA_PORT=8080
```

### Environment Variables Explained

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SIMULATION_MODE` | No | `false` | Set to `true` for local dev without Pi |
| `VITE_GEMINI_API_KEY` | Yes | - | Your Google Gemini API key |
| `VITE_RASPBERRY_PI_IP` | No | - | Pi's IP address (production only) |
| `VITE_SENSOR_PORT` | No | `5000` | Flask sensor server port |
| `VITE_CAMERA_PORT` | No | `8080` | MJPEG camera server port |

---

## 4. Gemini API Setup

### Step 1: Get Your API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key

### Step 2: Configure the Key

Add to your `.env` file:
```env
VITE_GEMINI_API_KEY=AIzaSyB...your-key-here
```

### Step 3: Verify Configuration

When you start the app, check the browser console for:
```
[GEMINI] ℹ️ Sending message to Gemini... { messageLength: 42 }
[GEMINI] ✅ Response received successfully { responseLength: 156 }
```

### API Key Security Notes

⚠️ **Important**: The API key is exposed client-side. For production:
1. **Restrict the key** in Google Cloud Console to your domain
2. **Set usage quotas** to prevent abuse
3. **Enable billing alerts** to monitor usage

---

## 5. Running Locally

### Development Mode (with hot reload)

```bash
npm run dev
```

This starts Vite's dev server at **http://localhost:5173**

### Production Build

```bash
# Build the app
npm run build

# Preview production build
npm run preview
```

### What Simulation Mode Does

When `VITE_SIMULATION_MODE=true`:

| Feature | Behavior |
|---------|----------|
| **Sensors** | Simulated random data (motion, temp, light) |
| **Camera** | Uses your browser's webcam |
| **Voice** | Full functionality via Web Speech API |
| **AI** | Real Gemini API calls (needs valid key) |

---

## 6. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Space** | Send a random question to Gemini |
| **C** | Capture camera image and analyze with Gemini |
| **Escape** | Stop current speech output |

### Testing Voice Flow
1. Click the orb or press **Space**
2. Watch the orb change states:
   - 🔵 **Idle** → Ready
   - 🟢 **Listening** → Recording your voice
   - 🟠 **Thinking** → Processing with Gemini
   - 🟣 **Speaking** → Playing response

#### Voice model (Microsoft Edge Neural - Anila)
- The app now prefers the Microsoft Edge Neural voice `sq-AL-AnilaNeural` for Albanian speech. If you don't hear the Anila voice, ensure you're using Microsoft Edge or a Chromium build that exposes Edge Neural voices and that the Web Speech API has access to neural voices.
- To check available voices in your browser console run:

```js
window.speechSynthesis.getVoices().map(v => `${v.name} | ${v.lang} | ${v.voiceURI}`)
```

- Look for entries containing `Anila` or `sq-AL-AnilaNeural`. If not present, try restarting the browser or enabling enhanced/experimental speech features in Edge.


---

## 7. Viewing Logs

### Browser Console Logs

Open Developer Tools (**F12** or **Cmd+Option+I**) → Console tab

#### Log Prefixes
```
[GEMINI]  - Text AI requests/responses
[VISION]  - Image analysis logs
[AERA]    - General app logs
[SENSORS] - Sensor data logs
```

#### Log Levels
- ℹ️ **Info** - Normal operations
- ✅ **Success** - Completed successfully
- ⚠️ **Warning** - Non-critical issues
- ❌ **Error** - Failures requiring attention
- 🔍 **Debug** - Detailed debugging info

### Filtering Logs

In Chrome DevTools:
1. Click the **Filter** box
2. Type prefix like `[GEMINI]` to filter
3. Or use log level buttons (Errors, Warnings, Info)

### Example Console Output

```
[AERA] ℹ️ Running in SIMULATION MODE
[GEMINI] ℹ️ Sending message to Gemini... {messageLength: 23}
[GEMINI] 🔍 Attempt 1/3
[GEMINI] 🔍 Request body prepared {totalMessages: 4}
[GEMINI] 🔍 Response received {status: 200, ok: true}
[GEMINI] ✅ Response received successfully {responseLength: 142}

[VISION] ℹ️ Requesting browser camera access
[VISION] 🔍 Camera stream obtained {tracks: 1}
[VISION] ✅ Browser camera image captured {dataLength: 45632}
[VISION] ℹ️ Analyzing image with Gemini {questionLength: 28}
[VISION] ✅ Vision analysis complete {responseLength: 198}
```

---

## 8. Troubleshooting

### "Gemini API key is not configured"

**Solution**: Add `VITE_GEMINI_API_KEY` to your `.env` file

### "Camera access denied"

**Solution**: 
1. Click the lock icon in the address bar
2. Allow camera permissions
3. Reload the page

### "Speech recognition not supported"

**Solution**: Use Chrome or Edge browser

### "Request timed out"

**Causes**:
- Slow internet connection
- Gemini API overloaded

**Solution**: 
- Check your internet
- Wait and try again
- The app retries automatically (2 retries)

### "HTTP Error 429"

**Cause**: Rate limited by Gemini API

**Solution**: Wait 1 minute and try again

### "HTTP Error 400"

**Cause**: Invalid API key or request

**Solution**: 
1. Check your API key is correct
2. Check console for detailed error message

### Console Shows No Logs

1. Ensure you're on the **Console** tab
2. Check log level filters aren't hiding messages
3. Clear console and try again

---

## 9. Raspberry Pi Deployment

When ready to deploy to Raspberry Pi:

1. Set `VITE_SIMULATION_MODE=false`
2. Set `VITE_RASPBERRY_PI_IP` to your Pi's IP
3. Build the project: `npm run build`
4. Deploy `dist/` folder to a web server
5. Or use the published URL

See `AERA_COMPLETE_SETUP_GUIDE.md` for full Pi setup instructions.

### Quick Pi Commands

```bash
# Copy Python servers to Pi
scp -r public/raspberry-pi/* pi@192.168.1.100:~/aera/

# SSH into Pi
ssh pi@192.168.1.100

# Start AERA services
cd ~/aera
chmod +x start_aera.sh
./start_aera.sh
```

---

## Quick Reference

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview build

# Environment
VITE_SIMULATION_MODE=true    # Local development
VITE_GEMINI_API_KEY=...      # Required for AI

# Keyboard
Space     # Random question
C         # Camera capture
Escape    # Stop speaking

# Logs (Browser Console)
[GEMINI]  # Text AI
[VISION]  # Image AI
[AERA]    # App logs
```

---

**Happy Development! 🪞✨**
