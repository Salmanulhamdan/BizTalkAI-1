import { WebSocket } from "ws";
import type { IncomingMessage } from "http";

// Helper function to generate company-specific instructions
function getCompanyInstructions(company: string): string {
  const companyLower = company.toLowerCase();

  let baseInstructions = `You are an AI assistant working as the Enterprise Front/Friend Ainager for ${company}, a hypothetical company based in Dubai. You are professional, helpful, and knowledgeable about the company's services. `;

  if (companyLower.includes("bakery")) {
    baseInstructions += `You work at a bakery that offers fresh bread baked daily from 6 AM, specialty pastries, custom cakes, gluten-free options, and catering services. Help customers with orders, answer questions about products, and provide information about our services.`;
  } else if (companyLower.includes("restaurant")) {
    baseInstructions += `You work at a restaurant open 11 AM - 10 PM daily. Reservations are recommended for weekends. We serve traditional and contemporary cuisine with private dining rooms available. Help customers make reservations, answer menu questions, and provide dining information.`;
  } else if (companyLower.includes("clinic") || companyLower.includes("health")) {
    baseInstructions += `You work at a medical clinic offering walk-in appointments, specialist consultations, health check-up packages, and 24/7 emergency services. Help patients schedule appointments, answer questions about services, and provide general information.`;
  } else if (companyLower.includes("hotel")) {
    baseInstructions += `You work at a luxury hotel with modern amenities, conference facilities, fine dining, and a spa. Help guests with reservations, answer questions about facilities and services, and provide concierge assistance.`;
  } else if (companyLower.includes("bank")) {
    baseInstructions += `You work at a bank offering personal and business banking, investment and loan services, 24/7 online banking, and financial advisory. Help customers with account inquiries, service information, and general banking questions.`;
  } else if (companyLower.includes("tech") || companyLower.includes("digital") || companyLower.includes("systems")) {
    baseInstructions += `You work at a technology company providing custom software development, cloud infrastructure, IT consulting and support, and digital transformation services. Help clients understand our solutions and services.`;
  } else if (companyLower.includes("industries") || companyLower.includes("solutions")) {
    baseInstructions += `You work at an industrial company providing equipment, machinery, custom manufacturing, quality control, and worldwide shipping. Help clients with product inquiries and service information.`;
  } else if (companyLower.includes("logistics") || companyLower.includes("travel")) {
    baseInstructions += `You work at a logistics company offering domestic and international shipping, real-time tracking, express delivery, and warehouse services. Help customers with shipping inquiries and tracking information.`;
  } else if (companyLower.includes("foods")) {
    baseInstructions += `You work at a food distribution company offering premium quality products, wholesale and retail distribution, fresh produce, and bulk order discounts. Help customers with product information and orders.`;
  } else {
    baseInstructions += `You provide professional business services with a customer-focused approach. Help callers with their inquiries and provide information about your services.`;
  }

  baseInstructions += ` Be conversational, warm, and helpful. Answer questions clearly and concisely. Since this is a demo, you can provide reasonable and professional responses based on the company name and type. Always mention that we are located in Dubai when relevant.`;

  return baseInstructions;
}

export function setupRealtimeWebSocket(
  clientWs: WebSocket,
  company: string,
  req: IncomingMessage
) {
  console.log(`[RealtimeWS] Setting up WebSocket connection for company: "${company}"`);
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[RealtimeWS] ❌ OPENAI_API_KEY not found");
    clientWs.close(1008, "Server configuration error");
    return;
  }

  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17";
  console.log(`[RealtimeWS] 📡 Connecting to OpenAI Realtime API`, { 
    url: url.substring(0, 50) + '...',
    company,
    hasApiKey: !!apiKey
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

    // Configure session with company-specific instructions
    const sessionConfig = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        instructions: getCompanyInstructions(company),
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
      instructionsLength: sessionConfig.session.instructions.length,
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
