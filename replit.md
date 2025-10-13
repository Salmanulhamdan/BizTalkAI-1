# BizTalkAI - Voice Assistant Interface

## Overview

BizTalkAI (also known as Hainager) is an AI-powered business directory application that enables users to browse companies and initiate real-time voice conversations with AI assistants representing those businesses. The platform features a mobile-first, iOS-inspired interface for seamless voice interactions with company representatives powered by OpenAI's Realtime API.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Core Technology Stack:**
- **React 18 with TypeScript** - Type-safe component development with modern React patterns
- **Vite** - Fast build tool and development server with hot module replacement
- **Wouter** - Lightweight client-side routing (file-based routing with `/` for home and `/p/:ainagerName` for direct calls)
- **TanStack Query (React Query)** - Server state management with caching, pagination, and real-time data synchronization
- **Tailwind CSS** - Utility-first styling with custom design system

**Design System:**
- iOS/Apple Human Interface Guidelines (HIG) inspired aesthetic
- Custom theme configuration with light/dark mode support
- Mobile-first responsive design with safe area insets for iOS devices
- shadcn/ui component library for consistent, accessible UI components
- Custom color palette with CSS variables for dynamic theming

**Key UI Components:**
- `DirectoryHeader` - Animated header with company branding
- `CompanyList` & `CompanyListItem` - Scrollable directory with search
- `VoiceModal` - Full-screen voice call interface
- `VoiceVisualizer` - Real-time audio state visualization
- `SearchBar` - Debounced search with instant feedback

**State Management Strategy:**
- React Query for server state (company data, pagination)
- Local component state with hooks for UI interactions
- Custom hooks for complex logic (`useWebRTCVoice`, `useAinagers`)
- No global state management - component composition preferred

### Backend Architecture

**Server Framework:**
- **Express.js** - RESTful API server with middleware-based architecture
- **TypeScript with ES Modules** - Type-safe server code with modern import syntax
- **HTTP Server** - Base server wrapped by Express for WebSocket upgrade support

**API Design:**
- RESTful endpoints under `/api` prefix
- Pagination support with query parameters (`page`, `limit`, `search`)
- Health check endpoint at `/api/health` for deployment monitoring
- WebSocket endpoint for real-time voice communication

**WebSocket Architecture:**
- Client WebSocket connection upgrades at `/realtime/:company/:ainagerId`
- Proxy pattern: Client ↔ Server WebSocket ↔ OpenAI Realtime API WebSocket
- Bidirectional audio streaming with PCM16 encoding
- Company-specific AI instructions dynamically injected based on business type

**Audio Processing:**
- AudioWorklet for client-side PCM16 encoding (`pcm16-encoder.js`)
- Real-time audio capture via WebRTC MediaStream API
- Base64-encoded audio chunks for WebSocket transmission
- Audio playback through dynamically created HTML Audio elements

**Session Management:**
- Idle timeout: 8 minutes of inactivity triggers auto-disconnect
- Hard timeout: 10 minutes maximum session duration
- Activity tracking for cost control and resource optimization
- Graceful cleanup with connection state management

### Data Layer

**Database Configuration:**
- **MySQL** database via `mysql2` driver with connection pooling
- **Drizzle ORM** for type-safe database queries and schema management
- Database credentials configured via environment variables
- Connection pooling for efficient resource utilization

**Schema Design:**
- `chat_ainager` table - Stores AI assistant (Ainager) metadata
  - Primary key: `ainager_id`
  - Core fields: `ainager_name`, `ainager_description`, `ainager_type`
  - Configuration: `openai_key`, `ainager_instruction`, `is_active`
  - Relationships: `parent_ainager` for hierarchical structures
  - Audit fields: `ainager_create_date`, `ainager_delete_date`

**Data Access Patterns:**
- Repository pattern with `IStorage` interface
- Pagination with offset/limit for large datasets
- Case-insensitive search across company names
- Caching strategy via React Query (5-minute stale time)

**Query Optimization:**
- Database connection pool prevents connection exhaustion
- Indexed queries on `ainager_name` for search performance
- Prepared statements via Drizzle ORM for SQL injection prevention

### AI Integration

**OpenAI Realtime API:**
- Model: `gpt-4o-realtime-preview-2024-12-17`
- Real-time bidirectional audio streaming over WebSocket
- Dynamic system instructions based on company context
- Voice selection: "marin" personality for consistent experience

**Company-Specific Instructions:**
- Context-aware AI behavior based on company name patterns
- Predefined templates for: bakery, restaurant, clinic, hotel, bank, tech, logistics, food distribution
- Fallback to generic professional assistant for unlisted business types
- Professional, warm, and helpful conversational tone

**Voice Features:**
- Real-time speech-to-text transcription
- AI response generation with company context
- Audio streaming with minimal latency
- Conversation state tracking (idle, connecting, listening, speaking, error)

### Development & Deployment

**Build System:**
- Vite for frontend bundling with code splitting
- esbuild for server-side TypeScript compilation
- Development mode: Vite middleware integrated with Express
- Production build: Separate frontend and backend bundles

**Environment Configuration:**
- `.env` file for local development
- Replit Secrets for production credentials
- Required secrets: `OPENAI_API_KEY`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`
- Port configuration: Server runs on port 5000 (configurable via `PORT` env var)

**Deployment Strategy:**
- Autoscale deployment type (stateless architecture)
- Build command: `npm run build`
- Start command: `npm run start`
- Health check endpoint for monitoring
- Host configuration: `0.0.0.0` for Replit proxy compatibility

## External Dependencies

**Core Services:**
- **OpenAI Realtime API** - Real-time voice conversation engine (requires API key from platform.openai.com)
- **MySQL Database** - Persistent storage for company/Ainager data (currently hosted at billsphere.com)

**Frontend Libraries:**
- **@tanstack/react-query** - Server state management and caching
- **wouter** - Lightweight routing
- **@radix-ui/* components** - Accessible UI primitives (20+ components)
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** & **clsx** - Component variant styling
- **lucide-react** - Icon library
- **date-fns** - Date formatting utilities

**Backend Libraries:**
- **express** - Web server framework
- **ws** - WebSocket implementation
- **mysql2** - MySQL database driver
- **drizzle-orm** & **drizzle-kit** - Type-safe ORM and migrations
- **dotenv** - Environment variable management
- **nanoid** - Unique ID generation

**Build Tools:**
- **vite** - Frontend build tool
- **esbuild** - Server bundler
- **tsx** - TypeScript execution
- **typescript** - Type checking
- **cross-env** - Cross-platform environment variables

**Development Tools:**
- **@replit/vite-plugin-*** - Replit-specific development enhancements (error overlay, cartographer, dev banner)
- **postcss** & **autoprefixer** - CSS processing

**Audio Processing:**
- Native Web APIs: WebRTC MediaStream, AudioWorklet, Web Audio API
- Custom PCM16 encoder worklet for audio format conversion