# Hainager Voice Directory

## Overview

Hainager is an AI-powered business directory application that enables users to browse companies and initiate voice conversations with AI assistants representing those businesses. The application features a clean, iOS-inspired interface with real-time voice communication capabilities powered by OpenAI's Realtime API. Users can search through a directory of companies and engage in natural voice conversations to inquire about services, make appointments, or get information.

## User Preferences

Preferred communication style: Simple, everyday language.

## Replit Setup Instructions

### Environment Configuration
The application requires the following environment variable to enable voice features:

- `OPENAI_API_KEY`: Your OpenAI API key from https://platform.openai.com/account/api-keys

**Important:** The application will run without the API key, but voice functionality will not work until the key is configured.

### Development
- The development server runs on port 5000 (configured in `server/index.ts`)
- Vite dev server is integrated with Express for hot module replacement
- The server is configured to accept all hosts (`allowedHosts: true`) for Replit's proxy environment

### Deployment
- Build command: `npm run build`
- Start command: `npm run start`
- Deployment type: Autoscale (stateless web application)
- The production build bundles both frontend (via Vite) and backend (via esbuild)

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query for server state management
- Shadcn/ui component library built on Radix UI primitives

**Design System:**
- iOS/Apple Human Interface Guidelines inspired design
- Mobile-first responsive approach with 420px max-width container
- Tailwind CSS for utility-first styling with custom design tokens
- Light and dark mode support with CSS variables
- Custom elevation system using rgba overlays for interactive states

**Key Components:**
- `DirectoryHeader`: Animated header with brand identity and subtitle rotation
- `SearchBar`: Real-time company search with keyboard navigation
- `CompanyList`: Virtualized list of companies with filtering
- `VoiceModal`: Full-screen modal for voice conversation interface
- `VoiceVisualizer`: Animated visual feedback for conversation states (idle/connecting/listening/speaking/error)

**State Management Pattern:**
- Local component state for UI interactions
- TanStack Query for any future server data fetching needs
- Custom React hooks for complex logic encapsulation (e.g., `useRealtimeVoice`)

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript for the Node.js server
- WebSocket server for real-time bidirectional communication
- Vite middleware integration for development mode hot module replacement

**Real-time Voice Architecture:**
- WebSocket proxy pattern: Client connects to backend WebSocket, which establishes connection to OpenAI Realtime API
- Backend acts as secure gateway, injecting API keys and company-specific instructions
- Audio streaming in both directions: microphone input (24kHz, 16-bit PCM) and AI response audio
- Dynamic instruction generation based on company type (bakery, restaurant, clinic, hotel, etc.)
- Comprehensive error handling with specific user feedback:
  - Microphone permission denied: Prompts user to allow permissions
  - No microphone device: Alerts user to connect a microphone
  - WebSocket connection failure: Suggests checking internet connection
  - Error states preserved until user reconnects or closes modal

**Data Storage:**
- In-memory storage implementation via `MemStorage` class
- Drizzle ORM configured for PostgreSQL (ready for database integration)
- Schema defined but storage layer currently uses in-memory fallback
- User authentication structure prepared but not actively used

**Session Management:**
- Stateless WebSocket connections identified by company query parameter
- No persistent sessions currently implemented
- Future-ready with connect-pg-simple for PostgreSQL session store

### External Dependencies

**OpenAI Realtime API Integration:**
- WebSocket-based connection to `wss://api.openai.com/v1/realtime`
- Model: `gpt-4o-realtime-preview-2024-12-17`
- Server-side API key management via environment variables
- Custom system instructions generated per company type
- Audio format: 24kHz sample rate, 16-bit PCM, mono channel

**Database (Configured but Optional):**
- Neon Serverless PostgreSQL driver (`@neondatabase/serverless`)
- Drizzle ORM for type-safe database operations
- Connection via `DATABASE_URL` environment variable
- Migration system ready via `drizzle-kit`

**UI Component Library:**
- Radix UI primitives for accessible, unstyled components
- 30+ pre-built Shadcn components with custom theming
- Icons from Lucide React
- Form handling with React Hook Form and Zod validation

**Audio Processing:**
- Web Audio API for microphone capture and audio playback
- ScriptProcessorNode for audio stream processing
- Base64 encoding for WebSocket audio transmission
- Echo cancellation and noise suppression enabled

**Development Tools:**
- Replit-specific plugins for runtime error overlay and development banner
- TypeScript strict mode for type safety
- PostCSS with Tailwind and Autoprefixer
- ESBuild for production server bundling