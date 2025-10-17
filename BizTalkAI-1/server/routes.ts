import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

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

  baseInstructions += ` Be conversational, warm, and helpful. Answer questions clearly and concisely. Since this is a demo, you can provide reasonable and professional responses based on the company name and type. Always mention that we are located in Dubai when relevant.

IMPORTANT: When the call starts, immediately greet the caller and briefly introduce yourself and what you can help with. Start the conversation proactively with a warm welcome.`;

  return baseInstructions;
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Session endpoint to mint ephemeral client secrets
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
      
      // Add welcome message directive based on the ainager instruction
      if (instructions) {
        // Only add if not already present
        if (!instructions.includes("When the call starts")) {
          instructions += `\n\nIMPORTANT: When the call starts, immediately greet the caller with a warm welcome and briefly introduce yourself based on your role and capabilities described above. Use the information from your instructions to explain what you can help with.`;
        }
        sessionBody.instructions = instructions;
      } else {
        console.log('[Session] No instructions found, using default behavior');
      }

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

      res.json({
        client_secret: sessionData.client_secret,
        session: sessionData,
      });
    } catch (error) {
      console.error("Session creation error:", error);
      res.status(500).json({ 
        error: "Failed to create session. Please check your OpenAI API key and try again." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}