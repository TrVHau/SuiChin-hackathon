import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import * as dotenv from 'dotenv';
import gameRouter from './routes/game';
import { attachWebSocket } from './ws-handler';

dotenv.config();

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',');

const app = express();
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// REST routes
app.use('/api', gameRouter);

// HTTP server shared with WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
attachWebSocket(wss);

server.listen(PORT, () => {
  console.log(`[SuiChin Backend] Listening on port ${PORT}`);
  console.log(`  REST: http://localhost:${PORT}/api`);
  console.log(`  WS:   ws://localhost:${PORT}/ws`);
});

export default app;
