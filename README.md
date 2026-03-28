# CineMash AI - Full-Stack Production Architecture

## Overview

CineMash AI is a production-ready Next.js 16 application that uses artificial intelligence to create unique movie fusions by combining elements from different films. The application features a modern full-stack architecture with Supabase PostgreSQL, real-time capabilities, and comprehensive accessibility support.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│                 │    │                 │    │   Services      │
│ Next.js 16      │◄──►│  Redis State    │◄──►│  • Groq AI      │
│ React 19        │    │  Job Queue      │    │  • OpenRouter   │
│ TypeScript      │    │  BG Worker      │    │  • TMDB API     │
│ Tailwind CSS    │    │  Distributed RL │    │                 │
│ Framer Motion   │    │                 │    └─────────────────┘
│ shadcn/ui       │    │                 │
└─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         └──────────────►│   Database      │
                        │                 │
                        │ Supabase PG     │
                        │ • Fusions       │
                        │ • Movies        │
                        │ • Votes         │
                        │ • Token Usage   │
                        └─────────────────┘
```

## Tech Stack

### Frontend Stack
- **Framework**: Next.js 16 App Router with React 19
- **Language**: TypeScript with strict typing
- **Styling**: Tailwind CSS 4 with modern design patterns
- **UI Components**: shadcn/ui library with Radix UI primitives
- **Animations**: Framer Motion for cinematic effects
- **Theme Support**: next-themes (dark/light mode with system detection)
- **Icons**: Lucide React icon library

### Backend Stack
- **Runtime**: Node.js with Edge Runtime support
- **Database**: Supabase PostgreSQL with real-time capabilities
- **API Layer**: Next.js API routes with RESTful conventions
- **Validation**: Zod schemas for all inputs
- **AI Services**: Groq LLaMA 3.3-70B (primary) + OpenRouter GPT-4o-mini (fallback)
- **External APIs**: TMDB (The Movie Database) integration

### Development & Ops
- **Queue Management**: BullMQ for distributed task processing
- **Distributed State**: Redis for global rate limiting and caching
- **Package Management**: npm with custom scripts
- **Type Safety**: Strict TypeScript configuration
- **Database Management**: Supabase Dashboard and drizzle-kit

## Database Schema

### Supabase PostgreSQL Tables

#### `fusions`
Core table storing all movie fusion data with JSON fields for flexibility.

```sql
CREATE TABLE fusions (
  id TEXT PRIMARY KEY,
  share_token TEXT UNIQUE NOT NULL,
  movie_ids TEXT NOT NULL, -- JSON array of TMDB movie objects
  fusion_data TEXT NOT NULL, -- Full AI response as JSON
  ip_hash TEXT, -- for anonymous tracking
  created_at TIMESTAMP DEFAULT NOW(),
  upvotes INTEGER DEFAULT 0
);
```

#### `fusion_votes`
Voting system with IP-based duplicate prevention.

```sql
CREATE TABLE fusion_votes (
  id TEXT PRIMARY KEY,
  fusion_id TEXT NOT NULL REFERENCES fusions(share_token),
  vote_type TEXT CHECK (vote_type IN ('up', 'down')),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `token_usage`
Daily token budget management for AI services.

```sql
CREATE TABLE token_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD format
  tokens_used INTEGER DEFAULT 0
);
```

#### `movies`
Enhanced movie data with TMDB integration.

```sql
CREATE TABLE movies (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL,
  title TEXT NOT NULL,
  overview TEXT NOT NULL,
  poster_path TEXT,
  release_date TEXT,
  vote_average REAL,
  genre_ids TEXT, -- JSON array
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Frontend Components

### Core Pages
- **Home Page** (`/`): Hero section with trending fusions and call-to-action
- **Studio Page** (`/studio`): Interactive movie fusion creation interface
- **Gallery Page** (`/gallery`): Browse and discover community fusions
- **Accessibility Page** (`/accessibility`): WCAG 2.2 Level AA compliance statement

### Key Components
- **CreativeCanvas**: Main fusion creation interface with movie selection
- **MovieBrowser**: TMDB movie search and selection with poster display
- **FusionResultCard**: Displays generated fusion results with cast and scenes
- **RefinementChat**: Live AI chat for fusion modifications
- **TrendingSidebar**: Real-time trending fusions display
- **Navbar**: Navigation with theme toggle and accessibility features

### UI/UX Features
- **Glassmorphism Design**: Modern glass-like effects with backdrop blur
- **Cinematic Animations**: Parallax scrolling and smooth transitions
- **Dark/Light Themes**: System preference detection with manual override
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Accessibility**: WCAG 2.2 Level AA compliance with keyboard navigation

## API Endpoints

### Core Fusion API

#### `POST /api/fuse-simple`
**Purpose**: Generate movie fusions using AI
**Features**:
- Input validation (2-4 movie IDs)
- Token budget enforcement (1000 tokens per fusion)
- Mock AI responses for development
- Unique share token generation
- Database persistence

**Request Format**:
```json
{
  "movieIds": [550, 13],
  "constraints": "Make it darker and more intense"
}
```

### Job & Scaling API

#### `POST /api/fuse`
**Purpose**: Enqueue a movie fusion request
**Features**:
- Input validation (2-4 movie IDs)
- Atomically adds job to BullMQ `fusion-tasks` queue
- Returns a `jobId` for client polling
- Global rate-limit check via Redis

#### `GET /api/fuse/status/[jobId]`
**Purpose**: Poll for result of a background job
**Features**:
- Returns `queued`, `active`, `completed`, or `failed`
- Provides AI result immediately upon completion
- Error reporting for background failures

#### `GET /api/health`
**Purpose**: System health monitoring
**Features**:
- Database connectivity check
- Redis latency and memory report
- Queue status (waiting/active count)
- Environment variable validation

### TMDB Proxy API

#### `GET/POST /api/tmdb/[...path]`
**Purpose**: Secure TMDB API proxy
**Features**:
- Server-side API key injection
- Request forwarding with query params
- Response caching (1-hour TTL)
- Rate limit header logging
- Error handling for 429 responses

## Environment Variables

```env
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# TMDB API
TMDB_READ_TOKEN=your_tmdb_read_token
TMDB_BASE_URL=https://api.themoviedb.org/3

# AI Services
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Token Budget & Rate Limiting
AI_DAILY_TOKEN_BUDGET=500000
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_MEMORY_LIMIT=1000
RATE_LIMIT_CLEANUP_INTERVAL=60

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
VERCEL_URL=
VERCEL_ENV=
NODE_ENV=development
```

## Development Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:seed": "node scripts/seed.mjs"
  }
}
```

## Security Features

### API Key Protection
- All API keys stored server-side only
- TMDB calls proxied through `/api/tmdb/*`
- No client-side external API calls
- Environment variable validation

### Rate Limiting
- Per-IP rate limiting (10 requests/minute)
- In-memory cache with database fallback
- Automatic cleanup of expired entries
- IP address hashing for privacy

### Token Budget Management
- Daily token quotas (500,000 tokens/user/day)
- Real-time token tracking
- Midnight UTC reset
- Budget exceeded responses with retry information

## Error Handling

### Standardized Response Format
```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "timestamp": string
}
```

### HTTP Status Codes
- `200`: Success
- `400`: Invalid request
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Internal server error

## Production Deployment

### Platform Configuration
- **Recommended Platform**: Vercel (optimal for Next.js 16)
- **Database**: Supabase managed PostgreSQL with auto-scaling
- **CDN**: Global content delivery via Vercel Edge Network
- **Monitoring**: Built-in Vercel Analytics and error tracking
- **Environment**: Production-optimized builds with minification

### Environment Setup
- **Automatic**: Vercel automatically injects environment variables
- **Database**: Supabase handles connection pooling and scaling
- **Security**: All API keys stored server-side only
- **Performance**: Edge functions for global distribution

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed database with sample data
npm run db:seed
```

### API Testing
```bash
# Health check
curl http://localhost:3000/api/health

# Create fusion
curl -X POST http://localhost:3000/api/fuse-simple \
  -H "Content-Type: application/json" \
  -d '{"movieIds": [550, 13]}'

# Get gallery
curl http://localhost:3000/api/gallery?page=1&limit=10

# Vote on fusion
curl -X POST http://localhost:3000/api/vote \
  -H "Content-Type: application/json" \
  -d '{"shareToken": "abc123", "voteType": "up"}'
```

## Accessibility Compliance

### WCAG 2.2 Level AA Features
- **Keyboard Navigation**: Full keyboard support with Tab, Enter, Space, and Arrow keys
- **High Contrast**: Minimum 4.5:1 color contrast ratios in both themes
- **Screen Reader Support**: Semantic HTML5, ARIA labels, and live regions
- **Reduced Motion**: Respects prefers-reduced-motion setting
- **Focus Management**: Enhanced focus indicators with 3px thickness
- **Skip Links**: Skip-to-main-content for keyboard users

## High-Concurrency Scaling (100+ Users)

CineMash AI is architected to handle large bursts of traffic while strictly adhering to AI provider rate limits.

### 🧵 Distributed Job Queue
Instead of long-running synchronous requests, we use a **Task Queue (BullMQ)**:
- **Serialization**: Requests are processed sequentially to prevent "429 Too Many Requests" during spikes.
- **Failover**: Failed AI calls are automatically retried with exponential backoff.
- **Polling**: The UI handles `202 Accepted` states and polls the status API for a silky-smooth user experience.

### ⚡ Redis-Backed Distributed Rate Limiting
- **Global Tokens**: Unlike in-memory limiters, our Redis implementation tracks user usage across multiple server instances (e.g., in a Vercel/Kubernetes cluster).
- **Atomic Counting**: Uses Redis `MULTI` and `INCR` for thread-safe state management.

### 🏃 Running the Background Worker
In a production environment, you should run the worker as a separate process. In development, use the provided script:

```bash
# Start the background worker
npx ts-node -P tsconfig.json -r tsconfig-paths/register scripts/worker-dev.ts
```

## Redis Memory Optimization & Scaling Strategy

### 🧠 Pure Cache Architecture
CineMash AI is configured to use Redis in **Pure Cache Mode**. This means:
- **No Persistence**: RDB snapshots and AOF logs are disabled (`CONFIG SET save ""` and `appendonly no`). This eliminates all disk I/O overhead, ensuring that Redis operations are restricted to RAM for maximum throughput and zero latency stutters.
- **Eviction Policy**: `allkeys-lru` — Automatically removes the least recently used keys when memory limit is reached.
- **Lazy Freed**: Background deletion enabled to avoid blocking the main thread.
- **JSON Compression**: Large entries are compressed via GZIP to maximize memory efficiency.

### ⏳ Tiered TTL Strategy
Cache lifetimes are categorized into tiers, all of which are environment-configurable for fine-grained tuning:

| Tier | Default TTL | Description | Key Variable |
|------|-------------|-------------|--------------|
| **Metadata** | 1 Hour | TMDB API responses and movie details. | `REDIS_TTL_TMDB` |
| **Fusions** | 30 Mins | AI-generated movie fusion results. | `REDIS_TTL_FUSION` |
| **Gallery** | 5 Mins | Public feeds and trending lists. | `REDIS_TTL_GALLERY` |
| **Security** | 1 Min | Rate limiting and token budget tracking. | `REDIS_TTL_RATE_LIMIT` |

### 📈 Future Scaling (Redis Cluster)
The application is architecturally ready for horizontal scaling via Redis Cluster. To enable cluster mode in the future:
...

1. **Infrastructure**: Deploy a Redis Cluster (e.g., via AWS ElastiCache, Redis Enterprise, or manual Docker Compose).
2. **Environment**:
   - Set `REDIS_CLUSTER_ENABLED=true`
   - Set `REDIS_CLUSTER_NODES=redis://node1:6379,redis://node2:6379,...`
   - **Tuning**: Adjust `REDIS_TTL_*` variables to optimize cache lifetimes for your specific load.
3. **Consistency**: The `lib/redis.ts` client automatically detects cluster mode and uses `ioredis.Cluster` for distributed command routing.
4. **Monitoring**: Use the `/api/redis/health` endpoint to monitor hit rates and fragmentation across the cluster.

---

## Redis Security & Defragmentation

### 🛡️ Security Best Practices
CineMash AI implements multiple layers of security to protect the caching infrastructure:
- **TLS/SSL Encryption**: Automatically enforced for `rediss://` connections (e.g., in production).
- **Password Protection**: Securely handled via `REDIS_PASSWORD` environment variable.
- **Connection Hardening**: Configured with 5s connection timeouts and 2s command timeouts to prevent blocking.
- **Input Sanitization**: All cache keys are sanitized before ingestion to prevent command injection or multi-key attacks.
- **ACL Enforcement**: Recommendations included for disabling dangerous commands (`CONFIG`, `FLUSHALL`, `KEYS`) at the infrastructure level.

### 🧹 Active Defragmentation
To ensure long-term stability without performance degradation, **Active Defragmentation** is enabled:
- **How it works**: Redis periodically scans memory and reallocates fragmented blocks into contiguous chunks.
- **Why it matters**: In high-churn cache environments (like movie fusions), memory fragmentation can lead to 20-30% "ghost" memory usage.
- **Monitoring**: We monitor the `mem_fragmentation_ratio` via `/api/redis/health`. A ratio above 1.5 indicates a need for deeper defrag tuning.

### 🚀 Production Hardening Checklist
- [ ] Use `rediss://` for all production endpoints.
- [ ] Set a strong `REDIS_PASSWORD`.
- [ ] Monitor the health endpoint for `hit_rate` and `fragmentation_ratio`.
- [ ] Ensure Redis server is VPC-isolated from public internet.

---

Built with ❤️ and AI-powered movie magic
