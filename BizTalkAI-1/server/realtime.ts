import { WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { storage } from "./storage";

export async function setupRealtimeWebSocket(
  clientWs: WebSocket,
  company: string,
  ainagerId: string | undefined,
  req: IncomingMessage
) {
  console.log(`[RealtimeWS] Setting up WebSocket connection for company: "${company}"`);
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[RealtimeWS] ❌ OPENAI_API_KEY not found");
    clientWs.close(1008, "Server configuration error");
    return;
  }

  // Get instructions from database
  let instructions = "";
  if (ainagerId) {
    const ainager = await storage.getAinagerById(ainagerId);
    if (ainager?.ainagerInstruction) {
      instructions = ainager.ainagerInstruction;
      console.log(`[RealtimeWS] ✅ Loaded instructions from database`, {
        ainagerId,
        instructionsLength: instructions.length
      });
    }
  }

  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
  console.log(`[RealtimeWS] 📡 Connecting to OpenAI Realtime API`, { 
    url: url.substring(0, 50) + '...',
    company,
    hasApiKey: !!apiKey,
    hasInstructions: !!instructions
  });
  
  const openaiWs = new WebSocket(url, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  openaiWs.on("open", () => {
    console.log(`[RealtimeWS] ✅ Connected to OpenAI Realtime API`, { 
      company,
      timestamp: new Date().toISOString()
    });

    // Configure session with database instructions
    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        ...(instructions && { instructions }),
        voice: "alloy",
        input_audio_format: "pcm16",
        output_audio_format: "pcm16",
        input_audio_transcription: {
          model: "whisper-1"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.3,
          prefix_padding_ms: 500,
          silence_duration_ms: 1000,
        },
      },
    };

    console.log(`[RealtimeWS] 📤 Sending session configuration`, { 
      company,
      instructionsLength: instructions.length,
      voice: sessionConfig.session.voice,
      modalities: sessionConfig.session.modalities
    });

    openaiWs.send(JSON.stringify(sessionConfig));
    console.log(`[RealtimeWS] ✅ Session configuration sent for ${company}`);
  });

  openaiWs.on("message", (data: Buffer) => {
    // Forward messages from OpenAI to client
    console.log(`[RealtimeWS] 📨 Message from OpenAI`, { 
      dataSize: data.length,
      timestamp: new Date().toISOString()
    });
    
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data.toString());
      console.log(`[RealtimeWS] ✅ Forwarded message to client`, { 
        clientReadyState: clientWs.readyState,
        messageSize: data.length
      });
    } else {
      console.log(`[RealtimeWS] ⚠️ Client WebSocket not open, cannot forward message`, { 
        clientReadyState: clientWs.readyState
      });
    }
  });

  openaiWs.on("error", (error) => {
    console.error(`[RealtimeWS] ❌ OpenAI WebSocket error`, { 
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    
    if (clientWs.readyState === WebSocket.OPEN) {
      const errorMessage = JSON.stringify({
        type: "error",
        error: { message: "OpenAI connection error" },
      });
      clientWs.send(errorMessage);
      console.log(`[RealtimeWS] 📤 Sent error message to client`, { 
        messageSize: errorMessage.length
      });
    }
  });

  openaiWs.on("close", () => {
    console.log(`[RealtimeWS] 🔌 OpenAI WebSocket closed`, { 
      timestamp: new Date().toISOString()
    });
    
    if (clientWs.readyState === WebSocket.OPEN) {
      console.log(`[RealtimeWS] 🔌 Closing client WebSocket due to OpenAI closure`);
      clientWs.close();
    }
  });

  // Forward messages from client to OpenAI
  clientWs.on("message", (data: Buffer) => {
    console.log(`[RealtimeWS] 📨 Message from client`, { 
      dataSize: data.length,
      timestamp: new Date().toISOString()
    });
    
    if (openaiWs.readyState === WebSocket.OPEN) {
      openaiWs.send(data.toString());
      console.log(`[RealtimeWS] ✅ Forwarded message to OpenAI`, { 
        openaiReadyState: openaiWs.readyState,
        messageSize: data.length
      });
    } else {
      console.log(`[RealtimeWS] ⚠️ OpenAI WebSocket not open, cannot forward message`, { 
        openaiReadyState: openaiWs.readyState
      });
    }
  });

  clientWs.on("close", () => {
    console.log(`[RealtimeWS] 🔌 Client WebSocket closed`, { 
      timestamp: new Date().toISOString()
    });
    
    if (openaiWs.readyState === WebSocket.OPEN) {
      console.log(`[RealtimeWS] 🔌 Closing OpenAI WebSocket due to client closure`);
      openaiWs.close();
    }
  });

  clientWs.on("error", (error) => {
    console.error(`[RealtimeWS] ❌ Client WebSocket error`, { 
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    });
    
    if (openaiWs.readyState === WebSocket.OPEN) {
      console.log(`[RealtimeWS] 🔌 Closing OpenAI WebSocket due to client error`);
      openaiWs.close();
    }
  });
}
