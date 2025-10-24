# Debug Flow: User Question → AI Answer

This document explains the complete flow of how a user asks a question and receives an answer, with console.log statements to trace each step.

## Flow Overview

```
User Click "Call" → Session Creation → WebRTC Connection → User Speaks → 
Audio Sent to OpenAI → AI Processes → Answer Audio + Transcription → Display to User
```

---

## Step-by-Step Flow with Debug Points

### 1. **User Initiates Call** 
**File:** `client/src/components/VoiceModal.tsx`

**Location:** Line 256-259
```typescript
const handleCallButton = () => {
  console.log('[DEBUG 1] User clicked Call button');
  if (state.connectionStatus === "idle" || state.connectionStatus === "error" || state.connectionStatus === "disconnected") {
    console.log('[DEBUG 2] Starting session...');
    startSession();
  }
};
```

**What to add:**
```typescript
const handleCallButton = () => {
  console.log('[DEBUG 1] 🟢 User clicked Call button');
  console.log('[DEBUG 1.1] Current connection status:', state.connectionStatus);
  console.log('[DEBUG 1.2] Company:', ainager.ainagerName);
  console.log('[DEBUG 1.3] Ainager ID:', ainager.ainagerId);
  
  if (state.connectionStatus === "idle" || state.connectionStatus === "error" || state.connectionStatus === "disconnected") {
    console.log('[DEBUG 2] 🚀 Starting session...');
    startSession();
  } else {
    console.log('[DEBUG 2] ❌ Cannot start session - already connected or connecting');
  }
};
```

---

### 2. **Session Creation Request**
**File:** `client/src/hooks/useWebRTCVoice.ts`

**Location:** Line 113-129
```typescript
const startSession = useCallback(async () => {
  try {
    logActivity("Requesting session start...");
    updateConnectionStatus("connecting");

    // Step 1: Get ephemeral client secret from our server
    logActivity("Requesting ephemeral token...");
    const sessionResponse = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        voice: state.selectedVoice,
        model: "gpt-4o-realtime-preview-2024-10-01",
        company: company,
        ainagerId: ainagerId
      }),
    });
```

**What to add:**
```typescript
const startSession = useCallback(async () => {
  try {
    console.log('[DEBUG 3] 📞 startSession() called');
    console.log('[DEBUG 3.1] Company:', company);
    console.log('[DEBUG 3.2] Ainager ID:', ainagerId);
    console.log('[DEBUG 3.3] Voice:', state.selectedVoice);
    
    logActivity("Requesting session start...");
    updateConnectionStatus("connecting");

    // Step 1: Get ephemeral client secret from our server
    logActivity("Requesting ephemeral token...");
    console.log('[DEBUG 4] 🌐 Sending POST request to /api/session');
    console.log('[DEBUG 4.1] Request body:', JSON.stringify({ 
      voice: state.selectedVoice,
      model: "gpt-4o-realtime-preview-2024-10-01",
      company: company,
      ainagerId: ainagerId
    }, null, 2));
    
    const sessionResponse = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        voice: state.selectedVoice,
        model: "gpt-4o-realtime-preview-2024-10-01",
        company: company,
        ainagerId: ainagerId
      }),
    });
    
    console.log('[DEBUG 5] 📥 Received response from /api/session');
    console.log('[DEBUG 5.1] Status:', sessionResponse.status);
    console.log('[DEBUG 5.2] OK:', sessionResponse.ok);
```

---

### 3. **Server Processes Session Request**
**File:** `server/routes.ts`

**Location:** Line 89-136
```typescript
app.post("/api/session", async (req, res) => {
  try {
    const { voice = "marin", model = "gpt-realtime", company = "", ainagerId = "" } = req.body;

    console.log(`[Session] Creating session for company: "${company}", ainagerId: "${ainagerId}"`);

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key missing. Environment:", {
        isDevelopment: process.env.NODE_ENV === 'development',
        isDeployment: process.env.REPLIT_DEPLOYMENT === '1',
        availableKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
      });
      return res.status(500).json({ 
        error: "OpenAI API key not configured. Please ensure OPENAI_API_KEY is set in your Replit Secrets." 
      });
    }

    // Call OpenAI's client secrets endpoint to mint ephemeral token
    const sessionBody: any = {
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: voice,
    };

    // Try to get instructions from database first, then fallback to static
    let instructions = "";
    
    if (ainagerId) {
      const ainager = await storage.getAinagerById(ainagerId);
      if (ainager) {
        instructions = ainager.ainagerInstruction || "";
        console.log(`[Session] Using ainager instructions for ID "${ainagerId}": ${instructions.substring(0, 100)}...`);
      }
    }
    
    // Fallback to company-specific instructions if no ainager found
    if (!instructions && company) {
      instructions = getCompanyInstructions(company);
      console.log(`[Session] Using fallback instructions for "${company}": ${instructions.substring(0, 100)}...`);
    }
    
    if (instructions) {
      sessionBody.instructions = instructions;
    } else {
      console.log('[Session] No instructions found, using default behavior');
    }
```

**What to add:**
```typescript
app.post("/api/session", async (req, res) => {
  try {
    console.log('[DEBUG 6] 🔧 Server received /api/session request');
    console.log('[DEBUG 6.1] Request body:', JSON.stringify(req.body, null, 2));
    
    const { voice = "marin", model = "gpt-realtime", company = "", ainagerId = "" } = req.body;

    console.log(`[DEBUG 7] 🎯 Creating session`);
    console.log(`[DEBUG 7.1] Company: "${company}"`);
    console.log(`[DEBUG 7.2] Ainager ID: "${ainagerId}"`);
    console.log(`[DEBUG 7.3] Voice: "${voice}"`);

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.error('[DEBUG 7.4] ❌ OpenAI API key missing!');
      console.error('[DEBUG 7.5] Environment check:', {
        isDevelopment: process.env.NODE_ENV === 'development',
        isDeployment: process.env.REPLIT_DEPLOYMENT === '1',
        availableKeys: Object.keys(process.env).filter(key => key.includes('OPENAI'))
      });
      return res.status(500).json({ 
        error: "OpenAI API key not configured. Please ensure OPENAI_API_KEY is set in your Replit Secrets." 
      });
    }
    
    console.log('[DEBUG 7.6] ✅ OpenAI API key found');

    // Call OpenAI's client secrets endpoint to mint ephemeral token
    const sessionBody: any = {
      model: "gpt-4o-realtime-preview-2024-10-01",
      voice: voice,
    };

    // Try to get instructions from database first, then fallback to static
    let instructions = "";
    
    if (ainagerId) {
      console.log('[DEBUG 8] 🔍 Looking up ainager in database...');
      const ainager = await storage.getAinagerById(ainagerId);
      if (ainager) {
        instructions = ainager.ainagerInstruction || "";
        console.log(`[DEBUG 8.1] ✅ Found ainager in database`);
        console.log(`[DEBUG 8.2] Instructions (first 200 chars): ${instructions.substring(0, 200)}...`);
      } else {
        console.log(`[DEBUG 8.3] ❌ Ainager not found in database`);
      }
    }
    
    // Fallback to company-specific instructions if no ainager found
    if (!instructions && company) {
      console.log('[DEBUG 9] 🔄 Using fallback instructions based on company name');
      instructions = getCompanyInstructions(company);
      console.log(`[DEBUG 9.1] Fallback instructions (first 200 chars): ${instructions.substring(0, 200)}...`);
    }
    
    if (instructions) {
      sessionBody.instructions = instructions;
      console.log('[DEBUG 10] ✅ Instructions added to session body');
    } else {
      console.log('[DEBUG 10] ⚠️ No instructions found, using default behavior');
    }
    
    console.log('[DEBUG 11] 📤 Sending session request to OpenAI...');
    console.log('[DEBUG 11.1] Session body:', JSON.stringify(sessionBody, null, 2));
```

---

### 4. **OpenAI Session Created**
**File:** `server/routes.ts`

**Location:** Line 137-158
```typescript
const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(sessionBody),
});

if (!sessionResponse.ok) {
  const errorText = await sessionResponse.text();
  console.error("=== FULL OPENAI API ERROR ===");
  console.error("Status:", sessionResponse.status);
  console.error("Status Text:", sessionResponse.statusText);
  console.error("Full Error Response:", errorText);
  console.error("=============================");
  return res.status(sessionResponse.status).json({ 
    error: `OpenAI API error: ${errorText}` 
  });
}

const sessionData = await sessionResponse.json();
```

**What to add:**
```typescript
const sessionResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(sessionBody),
});

console.log('[DEBUG 12] 📥 Received response from OpenAI');
console.log('[DEBUG 12.1] Status:', sessionResponse.status);
console.log('[DEBUG 12.2] OK:', sessionResponse.ok);

if (!sessionResponse.ok) {
  const errorText = await sessionResponse.text();
  console.error('[DEBUG 12.3] ❌ OpenAI API Error');
  console.error("=== FULL OPENAI API ERROR ===");
  console.error("Status:", sessionResponse.status);
  console.error("Status Text:", sessionResponse.statusText);
  console.error("Full Error Response:", errorText);
  console.error("=============================");
  return res.status(sessionResponse.status).json({ 
    error: `OpenAI API error: ${errorText}` 
  });
}

const sessionData = await sessionResponse.json();
console.log('[DEBUG 13] ✅ Session created successfully');
console.log('[DEBUG 13.1] Session ID:', sessionData.id);
console.log('[DEBUG 13.2] Client Secret (first 20 chars):', sessionData.client_secret?.value?.substring(0, 20) + '...');
```

---

### 5. **WebRTC Connection Established**
**File:** `client/src/hooks/useWebRTCVoice.ts`

**Location:** Line 136-361
```typescript
const { client_secret, session } = await sessionResponse.json();
const tokenValue = client_secret.value || client_secret;
logActivity(`Ephemeral token received: ${tokenValue.substring(0, 10)}...`);

// Step 2: Request microphone permission
logActivity("Requesting microphone access...");
try {
  localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } 
  });
  logActivity("Microphone access granted");
} catch (micError) {
  throw new Error("Microphone access denied. Please allow microphone access and try again.");
}

// Step 3: Create RTCPeerConnection
logActivity("Creating WebRTC connection...");
peerConnectionRef.current = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});
```

**What to add:**
```typescript
const { client_secret, session } = await sessionResponse.json();
const tokenValue = client_secret.value || client_secret;
console.log('[DEBUG 14] 🔑 Received client secret from server');
console.log('[DEBUG 14.1] Token (first 20 chars):', tokenValue.substring(0, 20) + '...');
console.log('[DEBUG 14.2] Session ID:', session.id);

logActivity(`Ephemeral token received: ${tokenValue.substring(0, 10)}...`);

// Step 2: Request microphone permission
console.log('[DEBUG 15] 🎤 Requesting microphone access...');
logActivity("Requesting microphone access...");
try {
  localStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } 
  });
  console.log('[DEBUG 15.1] ✅ Microphone access granted');
  console.log('[DEBUG 15.2] Audio tracks:', localStreamRef.current.getAudioTracks().length);
  logActivity("Microphone access granted");
} catch (micError) {
  console.error('[DEBUG 15.3] ❌ Microphone access denied:', micError);
  throw new Error("Microphone access denied. Please allow microphone access and try again.");
}

// Step 3: Create RTCPeerConnection
console.log('[DEBUG 16] 🔗 Creating WebRTC connection...');
logActivity("Creating WebRTC connection...");
peerConnectionRef.current = new RTCPeerConnection({
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
});
console.log('[DEBUG 16.1] ✅ RTCPeerConnection created');
```

---

### 6. **Data Channel Setup for Events**
**File:** `client/src/hooks/useWebRTCVoice.ts`

**Location:** Line 169-284
```typescript
// Step 5: Create data channel for events (optional but recommended)
const dataChannel = pc.createDataChannel("oai-events");
dataChannel.onopen = () => {
  logActivity("Data channel opened");
  
  // ✅ Start activity tracking when session begins
  // Record session start time for hard limit calculation
  sessionStartTimeRef.current = Date.now();
  resetActivityTimer();
  
  // Generate company-specific instructions
  const companyLower = company.toLowerCase();
  let instructions = `You are an AI assistant working as the Enterprise Front/Friend Ainager for ${company}, a hypothetical company based in Dubai. You are professional, helpful, and knowledgeable about the company's services. `;

  if (companyLower.includes("bakery")) {
    instructions += `You work at a bakery that offers fresh bread baked daily from 6 AM, specialty pastries, custom cakes, gluten-free options, and catering services. Help customers with orders, answer questions about products, and provide information about our services.`;
  } else if (companyLower.includes("restaurant")) {
    instructions += `You work at a restaurant open 11 AM - 10 PM daily. Reservations are recommended for weekends. We serve traditional and contemporary cuisine with private dining rooms available. Help customers make reservations, answer menu questions, and provide dining information.`;
  } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
    instructions += `You work at a medical clinic offering walk-in appointments, specialist consultations, health check-up packages, and 24/7 emergency services. Help patients schedule appointments, answer questions about services, and provide general information.`;
  } else if (companyLower.includes("hotel")) {
    instructions += `You work at a luxury hotel with modern amenities, conference facilities, fine dining, and a spa. Help guests with reservations, answer questions about facilities and services, and provide concierge assistance.`;
  } else if (companyLower.includes("bank")) {
    instructions += `You work at a bank offering personal and business banking, investment and loan services, 24/7 online banking, and financial advisory. Help customers with account inquiries, service information, and general banking questions.`;
  } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
    instructions += `You work at a technology company providing custom software development, cloud infrastructure, IT consulting and support, and digital transformation services. Help clients understand our solutions and services.`;
  } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
    instructions += `You work at an industrial company providing equipment, machinery, custom manufacturing, quality control, and worldwide shipping. Help clients with product inquiries and service information.`;
  } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
    instructions += `You work at a logistics company offering domestic and international shipping, real-time tracking, express delivery, and warehouse services. Help customers with shipping inquiries and tracking information.`;
  } else if (companyLower.includes("foods")) {
    instructions += `You work at a food distribution company offering premium quality products, wholesale and retail distribution, fresh produce, and bulk order discounts. Help customers with product information and orders.`;
  } else {
    instructions += `You provide professional business services with a customer-focused approach. Help callers with their inquiries and provide information about your services.`;
  }

  instructions += ` Be conversational, warm, and helpful. Answer questions clearly and concisely. Since this is a demo, you can provide reasonable and professional responses based on the company name and type. Always mention that we are located in Dubai when relevant.`;
  
  // Send session configuration with company-specific instructions
  const sessionConfig = {
    type: "session.update",
    session: {
      modalities: ["text", "audio"],
      instructions: instructions,
      voice: state.selectedVoice,
      input_audio_transcription: {
        model: "whisper-1"
      },
      output_audio_transcription: {
        model: "whisper-1"
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        silence_duration_ms: 500
      }
    }
  };
  
  dataChannel.send(JSON.stringify(sessionConfig));
  logActivity(`Sent session config for ${company}`);
};
```

**What to add:**
```typescript
// Step 5: Create data channel for events (optional but recommended)
console.log('[DEBUG 17] 📡 Creating data channel for events...');
const dataChannel = pc.createDataChannel("oai-events");
dataChannel.onopen = () => {
  console.log('[DEBUG 18] ✅ Data channel opened');
  logActivity("Data channel opened");
  
  // ✅ Start activity tracking when session begins
  // Record session start time for hard limit calculation
  sessionStartTimeRef.current = Date.now();
  resetActivityTimer();
  
  console.log('[DEBUG 19] 📋 Generating company-specific instructions...');
  // Generate company-specific instructions
  const companyLower = company.toLowerCase();
  let instructions = `You are an AI assistant working as the Enterprise Front/Friend Ainager for ${company}, a hypothetical company based in Dubai. You are professional, helpful, and knowledgeable about the company's services. `;

  if (companyLower.includes("bakery")) {
    instructions += `You work at a bakery that offers fresh bread baked daily from 6 AM, specialty pastries, custom cakes, gluten-free options, and catering services. Help customers with orders, answer questions about products, and provide information about our services.`;
  } else if (companyLower.includes("restaurant")) {
    instructions += `You work at a restaurant open 11 AM - 10 PM daily. Reservations are recommended for weekends. We serve traditional and contemporary cuisine with private dining rooms available. Help customers make reservations, answer menu questions, and provide dining information.`;
  } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
    instructions += `You work at a medical clinic offering walk-in appointments, specialist consultations, health check-up packages, and 24/7 emergency services. Help patients schedule appointments, answer questions about services, and provide general information.`;
  } else if (companyLower.includes("hotel")) {
    instructions += `You work at a luxury hotel with modern amenities, conference facilities, fine dining, and a spa. Help guests with reservations, answer questions about facilities and services, and provide concierge assistance.`;
  } else if (companyLower.includes("bank")) {
    instructions += `You work at a bank offering personal and business banking, investment and loan services, 24/7 online banking, and financial advisory. Help customers with account inquiries, service information, and general banking questions.`;
  } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
    instructions += `You work at a technology company providing custom software development, cloud infrastructure, IT consulting and support, and digital transformation services. Help clients understand our solutions and services.`;
  } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
    instructions += `You work at an industrial company providing equipment, machinery, custom manufacturing, quality control, and worldwide shipping. Help clients with product inquiries and service information.`;
  } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
    instructions += `You work at a logistics company offering domestic and international shipping, real-time tracking, express delivery, and warehouse services. Help customers with shipping inquiries and tracking information.`;
  } else if (companyLower.includes("foods")) {
    instructions += `You work at a food distribution company offering premium quality products, wholesale and retail distribution, fresh produce, and bulk order discounts. Help customers with product information and orders.`;
  } else {
    instructions += `You provide professional business services with a customer-focused approach. Help callers with their inquiries and provide information about your services.`;
  }

  instructions += ` Be conversational, warm, and helpful. Answer questions clearly and concisely. Since this is a demo, you can provide reasonable and professional responses based on the company name and type. Always mention that we are located in Dubai when relevant.`;
  
  console.log('[DEBUG 20] 📤 Sending session configuration to OpenAI...');
  console.log('[DEBUG 20.1] Instructions (first 200 chars):', instructions.substring(0, 200) + '...');
  
  // Send session configuration with company-specific instructions
  const sessionConfig = {
    type: "session.update",
    session: {
      modalities: ["text", "audio"],
      instructions: instructions,
      voice: state.selectedVoice,
      input_audio_transcription: {
        model: "whisper-1"
      },
      output_audio_transcription: {
        model: "whisper-1"
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        silence_duration_ms: 500
      }
    }
  };
  
  dataChannel.send(JSON.stringify(sessionConfig));
  console.log('[DEBUG 20.2] ✅ Session configuration sent');
  logActivity(`Sent session config for ${company}`);
};
```

---

### 7. **User Speaks - Audio Captured**
**File:** `client/src/hooks/useWebRTCVoice.ts`

**Location:** Line 231-284 (dataChannel.onmessage)
```typescript
dataChannel.onmessage = (event) => {
  // ✅ Any message received = activity detected, reset idle timer
  resetActivityTimer();
  
  try {
    const data = JSON.parse(event.data);
    logActivity(`Data channel message: ${JSON.stringify(data, null, 2)}`);
    
    // Handle different message types
    if (data.type === "conversation.item.input_audio_transcription.completed") {
      // User speech transcribed
      const transcript = data.transcript;
      if (transcript) {
        logActivity(`User transcript: ${transcript}`);
        addTranscriptionMessage("You", transcript);
      }
    } else if (data.type === "conversation.item.input_audio_transcription.failed") {
      logActivity("User transcription failed");
    } else if (data.type === "input_audio_buffer.speech_started") {
      logActivity("User started speaking");
    } else if (data.type === "input_audio_buffer.speech_stopped") {
      logActivity("User stopped speaking");
    } else if (data.type === "response.audio_transcript.delta") {
      // AI response transcription in progress
      if (data.delta) {
        logActivity(`AI transcript delta: ${data.delta}`);
      }
    } else if (data.type === "response.audio_transcript.done") {
      // AI response transcription completed
      const transcript = data.transcript;
      if (transcript) {
        logActivity(`AI transcript: ${transcript}`);
        addTranscriptionMessage("Efa", transcript);
      }
    } else if (data.type === "response.done") {
      // AI response completed - check if we have a transcript
      if (data.response && data.response.output && data.response.output.length > 0) {
        const lastOutput = data.response.output[data.response.output.length - 1];
        if (lastOutput.type === "message" && lastOutput.content) {
          // Extract text content from the response
          const textContent = lastOutput.content.find((item: any) => item.type === "text");
          if (textContent && textContent.text) {
            logActivity(`AI response text: ${textContent.text}`);
            addTranscriptionMessage("Efa", textContent.text);
          }
        }
      }
    } else if (data.type === "error") {
      logActivity(`Error: ${data.error?.message || 'Unknown error'}`);
    }
  } catch (error) {
    logActivity(`Data channel message (raw): ${event.data}`);
  }
};
```

**What to add:**
```typescript
dataChannel.onmessage = (event) => {
  // ✅ Any message received = activity detected, reset idle timer
  resetActivityTimer();
  
  console.log('[DEBUG 21] 📨 Received message on data channel');
  
  try {
    const data = JSON.parse(event.data);
    console.log('[DEBUG 21.1] Message type:', data.type);
    console.log('[DEBUG 21.2] Full message:', JSON.stringify(data, null, 2));
    
    logActivity(`Data channel message: ${JSON.stringify(data, null, 2)}`);
    
    // Handle different message types
    if (data.type === "conversation.item.input_audio_transcription.completed") {
      // User speech transcribed
      console.log('[DEBUG 22] 👤 USER QUESTION TRANSCRIBED');
      const transcript = data.transcript;
      if (transcript) {
        console.log('[DEBUG 22.1] User said:', transcript);
        logActivity(`User transcript: ${transcript}`);
        addTranscriptionMessage("You", transcript);
      }
    } else if (data.type === "conversation.item.input_audio_transcription.failed") {
      console.error('[DEBUG 22.2] ❌ User transcription failed');
      logActivity("User transcription failed");
    } else if (data.type === "input_audio_buffer.speech_started") {
      console.log('[DEBUG 23] 🎤 User started speaking');
      logActivity("User started speaking");
    } else if (data.type === "input_audio_buffer.speech_stopped") {
      console.log('[DEBUG 24] 🎤 User stopped speaking');
      logActivity("User stopped speaking");
    } else if (data.type === "response.audio_transcript.delta") {
      // AI response transcription in progress
      if (data.delta) {
        console.log('[DEBUG 25] 🤖 AI response (partial):', data.delta);
        logActivity(`AI transcript delta: ${data.delta}`);
      }
    } else if (data.type === "response.audio_transcript.done") {
      // AI response transcription completed
      console.log('[DEBUG 26] ✅ AI ANSWER COMPLETED');
      const transcript = data.transcript;
      if (transcript) {
        console.log('[DEBUG 26.1] AI said:', transcript);
        logActivity(`AI transcript: ${transcript}`);
        addTranscriptionMessage("Efa", transcript);
      }
    } else if (data.type === "response.done") {
      // AI response completed - check if we have a transcript
      console.log('[DEBUG 27] ✅ AI response done');
      if (data.response && data.response.output && data.response.output.length > 0) {
        const lastOutput = data.response.output[data.response.output.length - 1];
        if (lastOutput.type === "message" && lastOutput.content) {
          // Extract text content from the response
          const textContent = lastOutput.content.find((item: any) => item.type === "text");
          if (textContent && textContent.text) {
            console.log('[DEBUG 27.1] AI response text:', textContent.text);
            logActivity(`AI response text: ${textContent.text}`);
            addTranscriptionMessage("Efa", textContent.text);
          }
        }
      }
    } else if (data.type === "error") {
      console.error('[DEBUG 28] ❌ Error from OpenAI:', data.error?.message || 'Unknown error');
      logActivity(`Error: ${data.error?.message || 'Unknown error'}`);
    } else {
      console.log('[DEBUG 29] ℹ️ Other message type:', data.type);
    }
  } catch (error) {
    console.error('[DEBUG 30] ❌ Error parsing data channel message:', error);
    logActivity(`Data channel message (raw): ${event.data}`);
  }
};
```

---

### 8. **Audio Response Playback**
**File:** `client/src/hooks/useWebRTCVoice.ts`

**Location:** Line 286-294
```typescript
// Step 6: Handle incoming audio stream
pc.ontrack = (event) => {
  logActivity("Received remote audio stream");
  // ✅ Audio received = activity detected
  resetActivityTimer();
  if (audioElementRef.current) {
    audioElementRef.current.srcObject = event.streams[0];
  }
};
```

**What to add:**
```typescript
// Step 6: Handle incoming audio stream
pc.ontrack = (event) => {
  console.log('[DEBUG 31] 🔊 Received audio stream from AI');
  logActivity("Received remote audio stream");
  // ✅ Audio received = activity detected
  resetActivityTimer();
  if (audioElementRef.current) {
    console.log('[DEBUG 31.1] ✅ Audio element configured for playback');
    audioElementRef.current.srcObject = event.streams[0];
  } else {
    console.error('[DEBUG 31.2] ❌ Audio element not available');
  }
};
```

---

## Complete Flow Summary

```
[DEBUG 1]  🟢 User clicked Call button
[DEBUG 2]  🚀 Starting session...
[DEBUG 3]  📞 startSession() called
[DEBUG 4]  🌐 Sending POST request to /api/session
[DEBUG 5]  📥 Received response from /api/session
[DEBUG 6]  🔧 Server received /api/session request
[DEBUG 7]  🎯 Creating session
[DEBUG 8]  🔍 Looking up ainager in database...
[DEBUG 9]  🔄 Using fallback instructions based on company name
[DEBUG 10] ✅ Instructions added to session body
[DEBUG 11] 📤 Sending session request to OpenAI...
[DEBUG 12] 📥 Received response from OpenAI
[DEBUG 13] ✅ Session created successfully
[DEBUG 14] 🔑 Received client secret from server
[DEBUG 15] 🎤 Requesting microphone access...
[DEBUG 16] 🔗 Creating WebRTC connection...
[DEBUG 17] 📡 Creating data channel for events...
[DEBUG 18] ✅ Data channel opened
[DEBUG 19] 📋 Generating company-specific instructions...
[DEBUG 20] 📤 Sending session configuration to OpenAI...
[DEBUG 21] 📨 Received message on data channel
[DEBUG 23] 🎤 User started speaking
[DEBUG 24] 🎤 User stopped speaking
[DEBUG 22] 👤 USER QUESTION TRANSCRIBED
[DEBUG 25] 🤖 AI response (partial): ...
[DEBUG 26] ✅ AI ANSWER COMPLETED
[DEBUG 31] 🔊 Received audio stream from AI
```

---

## How to Use This Debug Guide

1. **Open your browser's Developer Console** (F12 or Right-click → Inspect → Console)
2. **Open your server terminal** to see server-side logs
3. **Click the Call button** in the VoiceModal
4. **Watch the console** for these debug messages
5. **Speak into your microphone** and watch for:
   - `[DEBUG 22] 👤 USER QUESTION TRANSCRIBED` - Your question
   - `[DEBUG 26] ✅ AI ANSWER COMPLETED` - AI's answer
   - `[DEBUG 31] 🔊 Received audio stream from AI` - Audio playback

---

## Common Issues and Solutions

### Issue 1: No microphone access
**Look for:** `[DEBUG 15.3] ❌ Microphone access denied`
**Solution:** Allow microphone permissions in your browser

### Issue 2: OpenAI API key missing
**Look for:** `[DEBUG 7.4] ❌ OpenAI API key missing!`
**Solution:** Check your .env file for OPENAI_API_KEY

### Issue 3: Session creation failed
**Look for:** `[DEBUG 12.3] ❌ OpenAI API Error`
**Solution:** Check your OpenAI API key and account status

### Issue 4: No transcription appearing
**Look for:** Missing `[DEBUG 22]` or `[DEBUG 26]`
**Solution:** Check if audio is being captured and sent

### Issue 5: Audio not playing
**Look for:** `[DEBUG 31.2] ❌ Audio element not available`
**Solution:** Check browser autoplay permissions

---

## Next Steps

1. Add these console.log statements to your code
2. Test the flow and observe the debug messages
3. Share the console output if you encounter issues
4. Use the debug messages to identify where the flow breaks

