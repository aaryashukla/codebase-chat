# Codebase Chat 🤖

An AI-powered tool that lets you chat with any public GitHub repository. Paste a repo URL and ask questions about the code in plain English.

## 💡 What it does

Most developers have spent hours trying to understand an unfamiliar codebase. Codebase Chat solves this by letting you ask natural language questions and getting answers with specific file references — like having a senior engineer who has read the entire codebase sitting next to you.

- **Paste any public GitHub URL** — the app clones and indexes it automatically
- **Ask anything** — "How is auth handled?", "Where are API routes defined?", "Explain the folder structure"
- **Get answers with file references** — responses cite the exact files they pulled from
- **Streaming responses** — answers stream in real time like ChatGPT

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma ORM |
| LLM | Groq API (Llama 3.3 70B) |
| Search | Keyword-based chunk search |
| Styling | Tailwind CSS |
| Repo Ingestion | simple-git |

## 🧠 How it works

This project implements a simplified **RAG (Retrieval Augmented Generation)** pipeline:
```
GitHub URL
    ↓
Clone repo (simple-git)
    ↓
Read all code files (.ts, .js, .py, .go, etc.)
    ↓
Split files into chunks (~1500 chars each)
    ↓
Store chunks in PostgreSQL
    ↓
         ── at query time ──
User asks a question
    ↓
Search for relevant chunks (keyword matching)
    ↓
Send chunks + question to Groq LLM
    ↓
Stream answer back to UI
```

## 🏃 Running locally

### Prerequisites

- Node.js 18+
- PostgreSQL
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

1. **Clone the repo**
```bash
git clone https://github.com/aaryashukla/codebase-chat.git
cd codebase-chat
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file and fill in:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/codebasechat"
GROQ_API_KEY="your-groq-api-key"
NEXTAUTH_SECRET="any-random-string"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Set up the database**
```bash
npx prisma migrate dev
```

5. **Create a demo user in Prisma Studio**
```bash
npx prisma studio
```
Add a user with id: `demo-user`, email: `demo@demo.com`, password: `password`

6. **Run the app**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and paste any public GitHub URL to get started.

## 📁 Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── chat/        # Streaming LLM response endpoint
│   │   └── repos/       # Repo ingestion + status endpoints
│   └── page.tsx         # Main chat UI
├── lib/
│   ├── ingest.ts        # Repo cloning, chunking, indexing
│   ├── search.ts        # Chunk search logic
│   └── prisma.ts        # Prisma client
prisma/
└── schema.prisma        # Database schema
```

## 🔮 Planned improvements

- [ ] Vector embeddings (pgvector) for semantic search
- [ ] User authentication and saved repo history
- [ ] Inline file explorer showing indexed files
- [ ] Source citations showing which chunks were used
- [ ] Support for private repos via GitHub OAuth
- [ ] Deployment on Railway

## 📄 License

MIT