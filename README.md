# Template.net AI Chat

A full-stack AI chat application powered by Google Gemini with streaming responses, file upload with dual RAG indexing, and persistent conversation management.

## Tech Stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Frontend   | React, TypeScript, Vite, Tailwind CSS             |
| Backend    | NestJS, TypeORM, MySQL                            |
| AI         | Google Gemini (chat + embeddings + file indexing) |
| Storage    | MinIO (S3-compatible object storage)              |
| Vector DB  | Qdrant (semantic search / RAG)                    |
| Infra      | Docker, Docker Compose                            |

## Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) installed and running
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd template.net
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your Gemini API key:

```env
GEMINI_API_KEY=your_key_here
```

All other values are pre-configured for Docker and work out of the box.

### 3. Start everything

```bash
make up
```

This builds Docker images and starts all services:

| Service    | URL                                                |
|------------|----------------------------------------------------|
| Frontend   | http://localhost:4000                              |
| Backend    | http://localhost:8000                              |
| MinIO UI   | http://localhost:9001 (minioadmin / minioadmin123) |

Database migrations run automatically on backend startup.

## Make Commands

```bash
make up        # Build images and start all services
make down      # Stop and remove all containers
make restart   # Full rebuild + restart
make logs      # Tail logs from all services
make build     # Rebuild Docker images without starting
```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── common/
│   │   │   ├── middleware/          # HTTP request logger
│   │   │   └── repositories/        # Base repository abstraction
│   │   ├── database/
│   │   │   ├── data-source.ts
│   │   │   └── migrations/          # TypeORM migrations
│   │   └── modules/
│   │       ├── auth/                # JWT authentication (register, login, me)
│   │       ├── users/               # User entity & repository
│   │       ├── chat/                # Conversations, messages, SSE streaming
│   │       ├── files/               # Presigned upload pipeline & file metadata
│   │       ├── ai/                  # Gemini chat & embedding service
│   │       ├── rag/                 # Text chunking, embedding & Qdrant indexing
│   │       └── storage/             # MinIO & Qdrant clients
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── constants/               # Shared numeric/string constants
│   │   ├── types/                   # TypeScript domain types & SSE event types
│   │   ├── utils/                   # Auth token helper, MIME inference, sleep
│   │   ├── services/                # API clients split by domain
│   │   │   ├── http.ts              # Axios instance + auth interceptor
│   │   │   ├── auth.api.ts
│   │   │   ├── conversations.api.ts
│   │   │   ├── messages.api.ts      # Paginated fetch + SSE stream
│   │   │   └── files.api.ts         # Presigned upload flow
│   │   ├── hooks/
│   │   │   └── useAuth.ts           # User state + sign-out
│   │   ├── components/
│   │   │   ├── BrandLogo.tsx        # Shared SVG logo
│   │   │   └── Sidebar.tsx
│   │   ├── features/
│   │   │   └── chat/
│   │   │       ├── hooks/
│   │   │       │   └── useMessages.ts   # Message state & streaming logic
│   │   │       ├── ChatPage.tsx
│   │   │       ├── ChatInput.tsx
│   │   │       ├── MessageList.tsx
│   │   │       ├── Message.tsx
│   │   │       └── ConversationList.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── SignupPage.tsx
│   │       └── ComponentsPage.tsx   # UI component showcase
│   └── .env.example
├── docker/
│   └── docker-compose.yml
└── Makefile
```

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint       | Auth | Description              |
|--------|----------------|------|--------------------------|
| POST   | /auth/register | No   | Create a new account     |
| POST   | /auth/login    | No   | Login and receive a JWT  |
| GET    | /auth/me       | Yes  | Get the current user     |

**Request body (register):** `{ name, email, password }`
**Request body (login):** `{ email, password }`
**Response:** `{ user: { id, name, email }, accessToken }`

### Conversations

| Method | Endpoint                | Auth | Description                              |
|--------|-------------------------|------|------------------------------------------|
| POST   | /chat/conversations     | Yes  | Create a new conversation                |
| GET    | /chat/conversations     | Yes  | List all conversations for current user  |
| GET    | /chat/conversations/:id | Yes  | Get conversation with full message list  |
| PATCH  | /chat/conversations/:id | Yes  | Rename a conversation                    |
| DELETE | /chat/conversations/:id | Yes  | Delete a conversation                    |

### Messages

| Method | Endpoint                           | Auth | Description                                   |
|--------|------------------------------------|------|-----------------------------------------------|
| GET    | /chat/conversations/:id/messages   | Yes  | Paginated messages (query: `before`, `limit`) |
| POST   | /chat/messages/stream              | Yes  | Send a message — SSE streaming response       |

**Stream request body:** `{ conversationId, content, fileIds?: string[] }`

**SSE event types emitted by the stream:**

| Event type          | Data      | Description                               |
|---------------------|-----------|-------------------------------------------|
| `userMessage`       | `Message` | Persisted user message with real ID       |
| `chunk`             | `string`  | Incremental AI token                      |
| `aiMessage`         | `Message` | Final persisted AI response               |
| `conversationTitle` | `string`  | Auto-generated title on the first turn    |
| `error`             | `string`  | Error from the AI or backend              |

### Files

| Method | Endpoint                | Auth | Description                                        |
|--------|-------------------------|------|----------------------------------------------------|
| POST   | /files/presigned-upload | Yes  | Get a presigned PUT URL to upload directly to MinIO|
| POST   | /files/:id/confirm      | Yes  | Confirm upload complete, start RAG indexing        |
| GET    | /files                  | Yes  | List current user's files                          |
| GET    | /files/:id              | Yes  | Get file metadata and processing status            |
| GET    | /files/:id/url          | Yes  | Get a short-lived presigned download URL           |
| DELETE | /files/:id              | Yes  | Delete from MinIO, Gemini, and Qdrant              |

**File statuses:** `processing` → `ready` | `failed`

**Presigned upload flow:**
```
1. POST /files/presigned-upload   →  { fileId, uploadUrl }
2. PUT  <uploadUrl>               →  browser PUTs file directly to MinIO
3. POST /files/:fileId/confirm    →  triggers async dual indexing
4. Poll GET /files/:id until status === "ready"
```

**Accepted file types:** PDF, plain text, CSV, Markdown, JSON, JPEG, PNG, GIF, WebP
**Max file size:** 50 MB (configurable via `MAX_FILE_SIZE`)

## Architecture

### Dual RAG Indexing

When a file upload is confirmed, two indexing jobs run in parallel:

```
File confirmed in MinIO
        │
        ├─► Gemini Files API  →  stores file URI (48h TTL) in DB
        │
        └─► RAG pipeline
              ├─ Extract text (PDF → pdf-parse, text/* → UTF-8, images → skipped)
              ├─ Chunk text (~400 words with ~80-word overlap)
              ├─ Embed chunks with gemini-embedding-001 (768 dimensions)
              └─ Upsert vectors into Qdrant collection
```

### Hybrid Retrieval at Query Time

When a message is sent with attached files:

```
For each attached file:
  - Gemini URI age < 47h  →  pass URI directly to Gemini (native multimodal)
  - Gemini URI expired    →  retrieve top-5 relevant chunks from Qdrant
                              and inject as text context into the prompt
```

### Streaming Flow

```
Client sends POST /chat/messages/stream
        │
        ├─ Persist user message  →  emit "userMessage"
        ├─ Build AI context (history + files)
        ├─ Stream Gemini response →  emit "chunk" per token
        ├─ Persist AI message    →  emit "aiMessage"
        └─ Generate title (first turn only) →  emit "conversationTitle"
```

## Environment Variables

All variables are documented in [`backend/.env.example`](backend/.env.example). The only one you **must** set is `GEMINI_API_KEY`.

| Variable                | Default              | Description                                   |
|-------------------------|----------------------|-----------------------------------------------|
| `PORT`                  | `8000`               | Backend server port                           |
| `NODE_ENV`              | `production`         | Node environment                              |
| `DB_HOST`               | `mysql`              | MySQL hostname                                |
| `DB_PORT`               | `3306`               | MySQL port                                    |
| `DB_USERNAME`           | `chatuser`           | MySQL user                                    |
| `DB_PASSWORD`           | `chatpassword`       | MySQL password                                |
| `DB_DATABASE`           | `templatenet_chat`   | Database name                                 |
| `JWT_SECRET`            | *(change me)*        | JWT signing secret — **change in production** |
| `JWT_EXPIRES_IN`        | `7d`                 | JWT token lifetime                            |
| `GEMINI_API_KEY`        | —                    | **Required.** Google Gemini API key           |
| `MINIO_ENDPOINT`        | `minio`              | MinIO hostname (internal Docker network)      |
| `MINIO_PORT`            | `9000`               | MinIO S3 API port                             |
| `MINIO_PUBLIC_ENDPOINT` | `localhost`          | MinIO hostname reachable by the browser       |
| `MINIO_PUBLIC_PORT`     | `9000`               | MinIO public port                             |
| `MINIO_ACCESS_KEY`      | `minioadmin`         | MinIO access key                              |
| `MINIO_SECRET_KEY`      | `minioadmin123`      | MinIO secret key                              |
| `MINIO_BUCKET`          | `templatenet-files`  | S3 bucket name                                |
| `MINIO_USE_SSL`         | `false`              | Enable SSL for MinIO                          |
| `QDRANT_HOST`           | `qdrant`             | Qdrant hostname                               |
| `QDRANT_PORT`           | `6333`               | Qdrant REST API port                          |
| `MAX_FILE_SIZE`         | `52428800`           | Max upload size in bytes (default 50 MB)      |

## Features

- **Streaming chat** — AI responses stream token-by-token via SSE
- **File upload & RAG** — Attach PDF, images, or text files; indexed into both Gemini Files API and Qdrant for persistent semantic search
- **Hybrid retrieval** — Fresh files use Gemini's native file URI; expired files fall back to Qdrant RAG chunks automatically
- **Conversation history** — Persisted in MySQL with cursor-based pagination (scroll up to load older messages)
- **Optimistic UI** — Messages appear immediately while the network request is in-flight; rolled back cleanly on error
- **JWT auth** — Register and login with email/password; token persisted in localStorage
- **Inline title editing** — Double-click a conversation to rename it
- **Quota handling** — Gemini rate-limit errors return a friendly streamed message instead of crashing
