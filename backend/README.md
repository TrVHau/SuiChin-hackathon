# SuiChin Backend (Online Duel)

## Quick Start (Memory mode)
1. Copy `.env.example` to `.env`.
2. Keep:
   - `BACKEND_STORAGE=memory`
   - `MATCHMAKING_BACKEND=memory`
3. Run:
   - `npm install`
   - `npm run build`
   - `npm run test`
   - `npm run dev`

## Quick Start (Prisma + Redis mode)
1. Copy `.env.prisma-redis.example` to `.env`.
2. Start infra:
   - `npm run infra:up`
3. Generate Prisma client:
   - `npm run prisma:gen`
4. Push schema:
   - `npm run prisma:push`
5. Start backend:
   - `npm run dev`

## Health/Readiness endpoints
- `GET /api/health`: basic process health + selected backends.
- `GET /api/ready`: dependency readiness check (Prisma/Redis when enabled).
