# Local Whisper Debugging Improvements

## Problem
The local Whisper transcription wasn't working - only showing OpenAI Realtime transcriptions.

## Debugging Improvements Added

### 1. **Enhanced Logging in useLocalWhisper.ts**
- Added detailed logging for MediaRecorder setup
- Added format fallback detection (webm/opus → webm → mp4)
- Added audio chunk and blob size logging
- Added API request/response logging
- Added error handling with detailed error messages

### 2. **Enhanced Logging in useWebRTCVoice.ts**
- Added logging for local stream availability
- Added logging for stream track count
- Added confirmation that local Whisper is being started

### 3. **Enhanced Logging in Backend (routes.ts)**
- Added request received logging
- Added file size and type logging
- Added OpenAI API request/response logging
- Added detailed error logging

### 4. **Adjusted Configuration**
- **Silence Threshold**: 2s → 3s (less aggressive)
- **Minimum Audio Length**: 1s → 0.5s (more permissive)
- **Maximum Audio Length**: 10s → 15s (longer recordings)

### 5. **Added Debug UI**
- Added status indicators showing "Local Recording: Active/Inactive"
- Added "Processing: Active/Inactive" status
- Real-time visibility into local Whisper state

## How to Debug

### 1. **Check Browser Console**
Look for these log messages:
```
[LocalWhisper] Starting MediaRecorder...
[LocalWhisper] MediaRecorder created with mimeType: audio/webm;codecs=opus
[LocalWhisper] Local recording started
[LocalWhisper] Audio chunk received: 1234 bytes
[LocalWhisper] MediaRecorder stopped, processing audio...
[LocalWhisper] Audio blob created: 5678 bytes, type: audio/webm
[LocalWhisper] Processing audio blob (1234ms estimated duration)
[LocalWhisper] Sending request to /api/whisper/transcribe...
[LocalWhisper] Response received: 200 OK
[LocalWhisper] Local transcription successful: "Hello world"
```

### 2. **Check Server Console**
Look for these log messages:
```
[Whisper] Transcription request received
[Whisper] Processing audio file: audio.webm, size: 5678 bytes, type: audio/webm
[Whisper] Sending request to OpenAI Whisper API...
[Whisper] OpenAI response: 200 OK
[Whisper] Transcription result: { text: "Hello world", ... }
```

### 3. **Check UI Status**
- Look for "Recording your speech..." indicator
- Look for "Local Recording: Active" in debug info
- Look for "Processing: Active" when transcribing

## Common Issues to Check

### 1. **MediaRecorder Support**
- Check if browser supports `audio/webm;codecs=opus`
- Fallback to `audio/webm` or `audio/mp4`

### 2. **Audio Stream Issues**
- Verify microphone permission granted
- Check if audio stream has tracks
- Verify stream is not muted

### 3. **API Issues**
- Check if `/api/whisper/transcribe` endpoint is accessible
- Verify OpenAI API key is configured
- Check network requests in browser dev tools

### 4. **Timing Issues**
- Audio might be too short (< 0.5s)
- Silence detection might be too aggressive
- Processing might be taking too long

## Next Steps

1. **Test the voice chat** and check browser console for logs
2. **Look for error messages** in both browser and server console
3. **Check the debug UI** to see if local recording is active
4. **Verify API calls** in browser Network tab

The enhanced logging should help identify exactly where the local Whisper transcription is failing.
