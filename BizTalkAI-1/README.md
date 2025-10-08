# BizTalkAI - Voice Assistant Interface

A real-time voice conversation interface with AI assistant for businesses.

## Features

- 🎤 Real-time voice transcription
- 🤖 AI-powered customer service assistant
- 📱 Mobile-optimized interface
- 🏢 Multi-company support
- 💬 Live chat transcript display

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd BizTalkAI-1-working-copy-4th-october
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   PORT=3000
   NODE_ENV=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Getting an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/account/api-keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key and paste it in your `.env` file

## Deployment

### Replit Setup

1. **Import your Git repository** to Replit
2. **Add environment variables** in Replit:
   - Go to Secrets tab
   - Add `OPENAI_API_KEY` with your actual API key
   - Add `PORT` with value `3000`
   - Add `NODE_ENV` with value `production`

3. **Run the project**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/         # Custom hooks
│   │   └── pages/         # Page components
├── server/                # Express backend
│   ├── index.ts          # Main server file
│   ├── routes.ts         # API routes
│   └── realtime.ts       # WebSocket handling
├── shared/               # Shared schemas
└── package.json         # Dependencies
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `PORT` | Server port | No (default: 3000) |
| `NODE_ENV` | Environment mode | No (default: development) |

## Security

- Never commit your `.env` file to Git
- Use `.env.example` as a template
- Keep your API keys secure
- Use environment variables in production

## License

MIT License
