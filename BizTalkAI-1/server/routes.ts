import type { Express } from "express";
import type { Multer } from "multer";
import { createServer, type Server } from "http";
import { storage } from "./storage";

// Helper function to generate company-specific instructions


export async function registerRoutes(app: Express, upload: Multer): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    res.json({
      status: "Realtime voice server is up",
      environment: process.env.NODE_ENV || 'unknown',
      deployment: process.env.REPLIT_DEPLOYMENT === '1',
      apiKeyConfigured: hasApiKey
    });
  });

  // Get ainagers endpoint with pagination and search
  app.get("/api/ainagers", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      
      const result = await storage.getAinagers(page, limit, search);
      res.json(result);
    } catch (error) {
      console.error("Error fetching ainagers:", error);
      res.status(500).json({ 
        error: "Failed to fetch ainagers from database" 
      });
    }
  });

  // Get specific ainager by ID endpoint
  app.get("/api/ainagers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const ainager = await storage.getAinagerById(id);
      
      if (!ainager) {
        return res.status(404).json({ 
          error: "Ainager not found" 
        });
      }
      
      res.json(ainager);
    } catch (error) {
      console.error("Error fetching ainager:", error);
      res.status(500).json({ 
        error: "Failed to fetch ainager from database" 
      });
    }
  });

  // Whisper transcription endpoint
  app.post("/api/whisper/transcribe", upload.single('audio'), async (req, res) => {
    try {
      console.log("[Whisper] Transcription request received");
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error("[Whisper] OpenAI API key not configured");
        return res.status(500).json({ 
          error: "OpenAI API key not configured" 
        });
      }

      if (!req.file) {
        console.error("[Whisper] No audio file provided");
        return res.status(400).json({ 
          error: "No audio file provided" 
        });
      }

      console.log(`[Whisper] Processing audio file: ${req.file.originalname}, size: ${req.file.size} bytes, type: ${req.file.mimetype}`);

      // Create FormData for OpenAI Whisper API
      const formData = new FormData();
      formData.append('file', new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype }), req.file.originalname);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');
      formData.append('language', 'en');

      console.log("[Whisper] Sending request to OpenAI Whisper API...");

      const whisperResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      console.log(`[Whisper] OpenAI response: ${whisperResponse.status} ${whisperResponse.statusText}`);

      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        console.error("Whisper API Error:", whisperResponse.status, errorText);
        return res.status(whisperResponse.status).json({ 
          error: `Whisper API error: ${errorText}` 
        });
      }

      const result = await whisperResponse.json();
      console.log("[Whisper] Transcription result:", result);
      res.json(result);
      
    } catch (error) {
      console.error("Whisper transcription error:", error);
      res.status(500).json({ 
        error: "Failed to transcribe audio" 
      });
    }
  });

  // Text-to-Speech endpoint
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "nova" } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "OpenAI API key not configured" 
        });
      }

      console.log(`[TTS] Converting text to speech`, { 
        textLength: text.length,
        voice,
        textPreview: text.substring(0, 100) + '...'
      });

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: voice,
          input: text,
          response_format: "mp3"
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("TTS API Error:", response.status, errorText);
        return res.status(response.status).json({ 
          error: `TTS API error: ${errorText}` 
        });
      }

      const audioBuffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.byteLength);
      res.send(Buffer.from(audioBuffer));
      
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ 
        error: "Failed to convert text to speech" 
      });
    }
  });

  // Session endpoint to mint ephemeral client secrets
  app.post("/api/session", async (req, res) => {
    try {
      const { voice = "marin", model = "gpt-realtime", company = "", ainagerId = "" } = req.body;

      console.log(`[Session] 🚀 Creating session`, { 
        company: `"${company}"`, 
        ainagerId: `"${ainagerId}"`,
        voice,
        model,
        timestamp: new Date().toISOString()
      });

      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.error(`[Session] ❌ OpenAI API key missing`, {
          isDevelopment: process.env.NODE_ENV === 'development',
          isDeployment: process.env.REPLIT_DEPLOYMENT === '1',
          availableKeys: Object.keys(process.env).filter(key => key.includes('OPENAI')),
          timestamp: new Date().toISOString()
        });
        return res.status(500).json({ 
          error: "OpenAI API key not configured. Please ensure OPENAI_API_KEY is set in your Replit Secrets." 
        });
      }

      console.log(`[Session] ✅ OpenAI API key found`, { 
        keyLength: OPENAI_API_KEY.length,
        keyPrefix: OPENAI_API_KEY.substring(0, 10) + '...'
      });

      // Call OpenAI's client secrets endpoint to mint ephemeral token
      const sessionBody: any = {
        model: "gpt-4o-realtime-preview-2024-10-01",
        voice: voice,
      };

      // Try to get instructions from database first, then fallback to static
      let instructions = "";
      
      if (ainagerId) {
        console.log(`[Session] 🔍 Looking up ainager instructions`, { ainagerId });
        const ainager = await storage.getAinagerById(ainagerId);
        if (ainager) {
          instructions = ainager.ainagerInstruction || "";
          console.log(`[Session] ✅ Found ainager instructions`, { 
            ainagerId,
            instructionsLength: instructions.length,
            instructionsPreview: instructions.substring(0, 100) + '...'
          });
        } else {
          console.log(`[Session] ⚠️ Ainager not found`, { ainagerId });
        }
      }
      
      // Add welcome message directive based on the ainager instruction
      if (instructions) {
        // Only add if not already present
        if (!instructions.includes("When the call starts")) {
          instructions += `\n\nIMPORTANT: When the call starts, immediately greet the caller with a warm welcome and briefly introduce yourself based on your role and capabilities described above. Use the information from your instructions to explain what you can help with.`;
        }
        sessionBody.instructions = instructions;
        console.log(`[Session] 📝 Instructions added to session body`, { 
          instructionsLength: instructions.length
        });
      } else {
        console.log(`[Session] ⚠️ No instructions found, using default behavior`);
      }

      console.log(`[Session] 📤 Sending request to OpenAI`, { 
        endpoint: "https://api.openai.com/v1/realtime/sessions",
        method: "POST",
        sessionBodyKeys: Object.keys(sessionBody),
        hasInstructions: !!sessionBody.instructions
      });

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
        console.error(`[Session] ❌ OpenAI API Error`, {
          status: sessionResponse.status,
          statusText: sessionResponse.statusText,
          errorText: errorText.substring(0, 500) + '...',
          timestamp: new Date().toISOString()
        });
        return res.status(sessionResponse.status).json({ 
          error: `OpenAI API error: ${errorText}` 
        });
      }

      const sessionData = await sessionResponse.json();
      console.log(`[Session] ✅ Session created successfully`, { 
        sessionId: sessionData.id,
        hasClientSecret: !!sessionData.client_secret,
        clientSecretLength: sessionData.client_secret?.length || 0,
        timestamp: new Date().toISOString()
      });

      res.json({
        client_secret: sessionData.client_secret,
        session: sessionData,
      });
    } catch (error) {
      console.error(`[Session] ❌ Session creation error`, { 
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack?.substring(0, 300) + '...' : undefined,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        error: "Failed to create session. Please check your OpenAI API key and try again." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}