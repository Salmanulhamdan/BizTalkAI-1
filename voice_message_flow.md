# Voice Message Flow in BizTalkAI

## Complete User Voice Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           VOICE MESSAGE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

1. USER INITIATES VOICE SESSION
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ User clicks green "Call" button in ChatPage or VoiceModal                   │
   │ → Triggers handleCallClick() in ChatPage.tsx (line 107)                     │
   │ → Calls startSession() from useWebRTCVoice hook                             │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
2. SESSION SETUP
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ useWebRTCVoice.startSession() (line 116):                                   │
   │                                                                             │
   │ a) Request ephemeral token from /api/session                                │
   │    → Server calls OpenAI's /v1/realtime/sessions                            │
   │    → Returns client_secret for authentication                               │
   │                                                                             │
   │ b) Request microphone permission                                            │
   │    → navigator.mediaDevices.getUserMedia()                                  │
   │    → Audio config: echoCancellation, noiseSuppression, autoGainControl      │
   │                                                                             │
   │ c) Create RTCPeerConnection                                                 │
   │    → Add local audio stream to peer connection                              │
   │    → Create data channel for events                                         │
   │                                                                             │
   │ d) Send session configuration via data channel                              │
   │    → Company-specific instructions                                          │
   │    → Voice settings, audio formats, transcription models                    │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
3. WEBRTC CONNECTION ESTABLISHMENT
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ a) Create SDP offer                                                         │
   │ b) Send offer to OpenAI Realtime API                                        │
   │    → POST https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview  │
   │ c) Receive SDP answer from OpenAI                                           │
   │ d) Set remote description                                                   │
   │ e) Connection established, status = "connected"                             │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
4. USER SPEAKS (VOICE INPUT)
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ User speaks into microphone                                                 │
   │                                                                             │
   │ DUAL AUDIO PROCESSING:                                                      │
   │                                                                             │
   │ Path A - Real-time Streaming (AI Processing Only):                          │
   │ → Audio stream sent via WebRTC to OpenAI                                    │
   │ → OpenAI processes audio for AI responses                                   │
   │ → Server-side VAD detects speech start/stop                                 │
   │ → Threshold: 0.5, Silence duration: 500ms                                  │
   │ → NO user transcription (disabled to avoid duplicates)                      │
   │                                                                             │
   │ Path B - Local Whisper Transcription (User Speech Only):                    │
   │ → MediaRecorder captures audio chunks (100ms intervals)                     │
   │ → Local silence detection (2s threshold)                                    │
   │ → Audio chunks sent to /api/whisper/transcribe                              │
   │ → OpenAI Whisper API transcribes locally                                    │
   │ → Immediate local transcription feedback for user speech                    │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
5. SEPARATED TRANSCRIPTION EVENTS
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ TWO SEPARATE TRANSCRIPTION STREAMS:                                         │
   │                                                                             │
   │ Stream A - OpenAI Realtime Events (AI Responses Only):                      │
   │ → "input_audio_buffer.speech_started" (for VAD only)                       │
   │ → "response.audio_transcript.delta" (AI response transcription)             │
   │ → "response.audio_transcript.done" (AI response completed)                  │
   │ → User transcription events DISABLED to avoid duplicates                    │
   │                                                                             │
   │ Stream B - Local Whisper Events (User Speech Only):                         │
   │ → MediaRecorder.onstop triggers processing                                  │
   │ → Audio blob sent to /api/whisper/transcribe                               │
   │ → OpenAI Whisper API returns transcription                                 │
   │ → onTranscriptionUpdate callback triggered                                  │
   │                                                                             │
   │ Processing in useWebRTCVoice:                                               │
   │ → Only local Whisper calls addTranscriptionMessage() for user speech        │
   │ → Only OpenAI Realtime calls addTranscriptionMessage() for AI responses     │
   │ → Local transcriptions marked with isLocal: true                           │
   │ → Confidence scores included for local transcriptions                       │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
6. MESSAGE DISPLAY
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ addTranscriptionMessage() (line 99):                                        │
   │ → Creates TranscriptionMessage object with isLocal flag                     │
   │ → Adds to state.transcription array                                         │
   │ → Logs activity for debugging                                               │
   │                                                                             │
   │ ChatPage.tsx useEffect (lines 77-105):                                     │
   │ → Watches state.transcription changes                                       │
   │ → Converts transcriptions to Message objects                                │
   │ → Adds to messages array for display                                        │
   │ → Messages appear in chat UI with indicators:                               │
   │   • "AI Response" for OpenAI Realtime AI transcriptions                     │
   │   • "Local Transcription" for Whisper user transcriptions                   │
   │   • Confidence percentage for local transcriptions                          │
   │                                                                             │
   │ Visual Indicators:                                                          │
   │ → "Recording your speech..." status when MediaRecorder active               │
   │ → "Transcribing your speech..." status when Whisper processing              │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
7. AI RESPONSE GENERATION
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ OpenAI processes user's voice input:                                        │
   │ → Transcribes user speech to text                                           │
   │ → Generates AI response using GPT-4o Realtime                               │
   │ → Converts response to speech using selected voice                          │
   │ → Sends audio back via WebRTC                                               │
   │                                                                             │
   │ Response Events:                                                            │
   │ → "response.audio_transcript.delta"                                         │
   │ → "response.audio_transcript.done"                                          │
   │ → "response.done"                                                           │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
8. AI RESPONSE DISPLAY & AUDIO
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ AI Response Processing (lines 289-332):                                     │
   │ → Extract transcript from response events                                   │
   │ → Call addTranscriptionMessage("Efa", transcript)                          │
   │ → Display AI message in chat UI                                             │
   │                                                                             │
   │ Audio Playback:                                                             │
   │ → AI audio stream received via WebRTC                                       │
   │ → Set to audioElement.srcObject                                             │
   │ → Auto-plays through user's speakers                                        │
   │ → User hears AI response in real-time                                       │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
9. CONTINUOUS CONVERSATION
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ Process repeats for each voice exchange:                                    │
   │ → User speaks → Transcription → AI processes → AI responds → Audio plays    │
   │                                                                             │
   │ Activity Tracking:                                                          │
   │ → resetActivityTimer() called on any activity                               │
   │ → 8-minute idle timeout prevents runaway costs                              │
   │ → 15-minute hard limit for total session time                               │
   └─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
10. SESSION END
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ User clicks red "End Call" button or session times out:                     │
   │                                                                             │
   │ stopSession() cleanup (line 423):                                           │
   │ → Clear all timeout timers                                                  │
   │ → Close RTCPeerConnection                                                   │
   │ → Stop local media stream                                                   │
   │ → Reset audio element                                                       │
   │ → Clear transcription state                                                 │
   │ → Set connection status to "idle"                                           │
   └─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              KEY COMPONENTS                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

📱 Frontend Components:
   • ChatPage.tsx - Main chat interface with voice controls
   • VoiceModal.tsx - Dedicated voice call interface
   • useWebRTCVoice.ts - Core WebRTC and voice logic
   • useLocalWhisper.ts - Local Whisper transcription hook
   • VoiceVisualizer.tsx - Visual feedback during calls

🔧 Backend Components:
   • /api/session - Creates OpenAI Realtime sessions
   • /api/whisper/transcribe - Local Whisper transcription endpoint
   • routes.ts - Handles session creation and company instructions
   • index.ts - Express server setup with multer middleware

🌐 External Services:
   • OpenAI Realtime API - Voice processing and AI responses
   • OpenAI Whisper API - Local speech-to-text transcription
   • WebRTC - Real-time audio streaming

⚙️ Configuration:
   • Voice: "marin" (default)
   • Model: "gpt-4o-realtime-preview-2024-10-01"
   • Audio Format: PCM16 (Realtime), WebM/Opus (Local)
   • VAD: Server-side with 0.5 threshold, 500ms silence
   • Local Recording: 100ms chunks, 2s silence threshold, 10s max
   • Timeouts: 8min idle, 15min hard limit

🔒 Security & Cost Controls:
   • Ephemeral tokens for session authentication
   • Activity-based timeout system
   • Automatic session cleanup on page unload
   • Cost safeguards to prevent runaway sessions
