# Zivo 🎥

Anonymous random video chat — no signup needed.

## Quick Start

### 1. Backend

```bash
cd backend
npm install
npm run dev        # starts on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # starts on http://localhost:3000
```

Open two browser tabs at `http://localhost:3000/chat` to test matching.

---

## Deployment

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Import into Vercel
3. Set environment variable: `NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app`

### Backend → Railway / Render

1. Push `backend/` to a GitHub repo
2. Set start command: `node server.js`
3. Set env var: `PORT=4000`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Real-time | Socket.IO |
| Video | WebRTC (peer-to-peer) |
| Backend | Node.js, Express, Socket.IO |

## Project Structure

```
omingle/
├── frontend/          # Next.js app
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── chat/page.tsx      # Video chat
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── guidelines/page.tsx
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Modal.tsx
│   │   └── modals/
│   └── .env.local
│
└── backend/           # Signaling server
    ├── server.js
    ├── matchmaking.js
    └── .env
```
