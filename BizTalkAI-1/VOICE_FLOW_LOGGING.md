# Voice Message Flow Console Logging

This document outlines the comprehensive console logging added to track the complete flow of a user sending a voice message in the BizTalkAI application.

## Overview

The voice messaging system uses WebRTC for real-time audio communication with OpenAI's Realtime API. The logging covers the entire flow from user interaction to AI response.

## Flow Components

### 1. Client-Side Components

#### VoiceModal Component (`client/src/components/VoiceModal.tsx`)
- **Purpose**: UI component that handles user interactions
- **Log Prefix**: `[VoiceModal]`
- **Key Events**:
  - Audio element setup and cleanup
  - User button clicks (call, hangup, mute, speaker)
  - Session connection status changes

#### useWebRTCVoice Hook (`client/src/hooks/useWebRTCVoice.ts`)
- **Purpose**: Manages WebRTC connection and voice session
- **Log Prefix**: `[useWebRTCVoice]`
- **Key Events**:
  - Session start/stop
  - WebRTC connection establishment
  - Audio stream handling
  - Data channel messages
  - Transcription events

### 2. Server-Side Components

#### Session Routes (`server/routes.ts`)
- **Purpose**: Handles session creation and ephemeral token generation
- **Log Prefix**: `[Session]`
- **Key Events**:
  - Session creation requests
  - OpenAI API calls
  - Instruction handling
  - Error handling

#### Realtime WebSocket (`server/realtime.ts`)
- **Purpose**: Manages WebSocket connections between client and OpenAI
- **Log Prefix**: `[RealtimeWS]`
- **Key Events**:
  - WebSocket connection setup
  - Message forwarding
  - Connection state changes
  - Error handling

## Complete Voice Message Flow

### Phase 1: User Initiates Call

```
[VoiceModal] User clicked call button
[useWebRTCVoice] 🚀 Starting voice session
[useWebRTCVoice] 📡 Requesting ephemeral token from server
[Session] 🚀 Creating session
[Session] ✅ OpenAI API key found
[Session] 🔍 Looking up ainager instructions
[Session] ✅ Found ainager instructions
[Session] 📤 Sending request to OpenAI
[Session] ✅ Session created successfully
[useWebRTCVoice] ✅ Ephemeral token received
```

### Phase 2: WebRTC Connection Setup

```
[useWebRTCVoice] 🎤 Requesting microphone access
[useWebRTCVoice] ✅ Microphone access granted
[useWebRTCVoice] 🔗 Creating WebRTC connection
[useWebRTCVoice] 📤 Adding local audio stream to peer connection
[useWebRTCVoice] 📡 Creating data channel for OpenAI events
[useWebRTCVoice] ✅ Data channel opened successfully
[useWebRTCVoice] 🔄 Starting activity timer and session tracking
[useWebRTCVoice] 📤 Sending session configuration
[useWebRTCVoice] ✅ Session config sent for [company]
```

### Phase 3: Connection Establishment

```
[useWebRTCVoice] 📋 Creating SDP offer
[useWebRTCVoice] ✅ Local description set
[useWebRTCVoice] 📤 Sending offer to OpenAI
[useWebRTCVoice] ✅ Received SDP answer from OpenAI
[useWebRTCVoice] ✅ Remote description set successfully
[useWebRTCVoice] 🎉 WebRTC connection flow completed
[useWebRTCVoice] 🔗 Connection state changed
[useWebRTCVoice] 🎉 WebRTC connection established successfully
[useWebRTCVoice] 💬 Adding initial greeting
[useWebRTCVoice] ✅ Session started successfully with latency monitoring
[VoiceModal] Session connected - ready for real-time transcription
```

### Phase 4: Voice Message Processing

#### User Starts Speaking
```
[useWebRTCVoice] 🎤 User started speaking
[RealtimeWS] 📨 Message from client
[RealtimeWS] ✅ Forwarded message to OpenAI
[RealtimeWS] 📨 Message from OpenAI
[RealtimeWS] ✅ Forwarded message to client
[useWebRTCVoice] 📨 Data channel message received
```

#### User Stops Speaking
```
[useWebRTCVoice] 🔇 User stopped speaking
[useWebRTCVoice] 📨 Data channel message received
[useWebRTCVoice] 👤 User transcript completed
[useWebRTCVoice] Adding transcription message
```

#### AI Response Generation
```
[useWebRTCVoice] 📨 Data channel message received
[useWebRTCVoice] 🤖 AI transcript delta
[useWebRTCVoice] 📨 Data channel message received
[useWebRTCVoice] 🤖 AI transcript completed
[useWebRTCVoice] Adding transcription message
[useWebRTCVoice] 🔊 Received remote audio stream
[useWebRTCVoice] ✅ Audio stream assigned to audio element
```

### Phase 5: Session Management

#### User Controls
```
[VoiceModal] User clicked mute button
[VoiceModal] User clicked speaker button
```

#### Session End
```
[VoiceModal] User clicked hangup button
[useWebRTCVoice] 🛑 Stopping session
[useWebRTCVoice] ⏱️ Latency monitoring stopped
[useWebRTCVoice] 🔌 Closing peer connection
[useWebRTCVoice] 🎤 Stopping local audio stream
[useWebRTCVoice] 🔊 Resetting audio element
[useWebRTCVoice] ✅ Session ended and cleaned up
[VoiceModal] Cleaning up audio element
```

## Error Handling

### Common Error Scenarios

#### Microphone Access Denied
```
[useWebRTCVoice] ❌ Microphone access denied
[useWebRTCVoice] ❌ Connection failed
[useWebRTCVoice] 🧹 Cleaning up session due to error
```

#### OpenAI API Errors
```
[Session] ❌ OpenAI API Error
[useWebRTCVoice] ❌ Session request failed
[useWebRTCVoice] ❌ Connection failed
```

#### WebSocket Connection Issues
```
[RealtimeWS] ❌ OpenAI WebSocket error
[RealtimeWS] ❌ Client WebSocket error
[useWebRTCVoice] ❌ WebRTC connection failed
```

## Log Format

All logs follow this format:
```
[Component] 🎯 Action Description { metadata }
```

Where:
- **Component**: The source component (VoiceModal, useWebRTCVoice, Session, RealtimeWS)
- **Action Description**: Human-readable description with emoji for quick scanning
- **Metadata**: Structured data object with relevant information

## Benefits

1. **Complete Visibility**: Track every step of the voice message flow
2. **Debugging**: Easy to identify where issues occur
3. **Performance Monitoring**: Track timing and data sizes
4. **User Experience**: Monitor user interactions and system responses
5. **Error Tracking**: Comprehensive error logging with context

## Usage

To view these logs:
1. Open browser developer tools
2. Go to Console tab
3. Start a voice session
4. Watch the real-time flow of logs

The logs provide a complete picture of the voice messaging system's behavior and help identify any issues in the communication flow.

