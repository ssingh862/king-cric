import express from 'express';
import cors from 'cors';
import http from 'http';
import os from 'os';
import { Server } from 'socket.io';
import { config } from './config';
import { connectDb } from './db';
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import playerRoutes from './routes/players';
import { createMatchesRouter } from './routes/matches';

async function main() {
  await connectDb();

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: config.corsOrigin === '*' ? true : config.corsOrigin },
  });

  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/auth', authRoutes);
  app.use('/tournaments', tournamentRoutes);
  app.use('/teams', teamRoutes);
  app.use('/players', playerRoutes);
  app.use('/matches', createMatchesRouter(io));

  io.on('connection', (socket) => {
    socket.on('join_innings', (inningsId: string) => {
      socket.join(`innings:${inningsId}`);
    });
    socket.on('leave_innings', (inningsId: string) => {
      socket.leave(`innings:${inningsId}`);
    });
  });

  server.listen(config.port, '0.0.0.0', () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .find((n) => n && !n.internal && n.family === 'IPv4')?.address;

    console.log(`KingCric API running on http://localhost:${config.port}`);
    if (lan) {
      console.log(`  Phone/emulator: set EXPO_PUBLIC_API_URL=http://${lan}:${config.port}`);
    }
    console.log('  Android emulator: http://10.0.2.2:' + config.port);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
