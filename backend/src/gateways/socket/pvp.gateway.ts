import { Server, Socket } from 'socket.io';
import { matchmakingService, RoomState } from '../../modules/matchmaking/matchmaking.service';
import { logger } from '../../shared/logger';

export class PvpGateway {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.initializeHandlers();
  }

  private initializeHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('join_room', (data: { roomId: string; walletAddress: string }) => {
        try {
          const { roomId, walletAddress } = data;
          socket.join(roomId);
          
          let room = matchmakingService.handleReconnection(roomId, walletAddress, socket.id);
          if (!room) {
             room = matchmakingService.createOrJoinRoom(roomId, walletAddress, socket.id);
          }

          logger.info(`Player ${walletAddress} joined room ${roomId}`);

          // Emit to room
          this.emitToRoom(roomId, 'room_state_update', {
            state: room.state,
            playersReady: room.players.size,
          });

        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('select_nft', (data: { roomId: string; walletAddress: string; nftId: string }) => {
        try {
          const { roomId, walletAddress, nftId } = data;
          const room = matchmakingService.selectNft(roomId, walletAddress, nftId);
          
          this.emitToRoom(roomId, 'room_state_update', {
            state: room.state,
            playersReady: room.players.size,
          });

          // If Valuating phase, simulate logic to determine winner and settle
          if (room.state === RoomState.VALUATING_PHASE) {
             this.simulateMatchValuation(roomId);
          }

        } catch (error: any) {
          socket.emit('error', { message: error.message });
        }
      });

      socket.on('disconnect', () => {
        matchmakingService.handleDisconnection(socket.id, this.emitToRoom.bind(this));
      });
    });
  }

  private simulateMatchValuation(roomId: string) {
    const room = matchmakingService.getRoom(roomId);
    if (!room || room.state !== RoomState.VALUATING_PHASE) return;

    // Wait a brief moment to simulate evaluating stats
    setTimeout(() => {
        const players = Array.from(room.players.values());
        if (players.length < 2) return;
        
        // Randomly pick a winner for MVP
        const winnerIndex = Math.random() > 0.5 ? 0 : 1;
        const loserIndex = winnerIndex === 0 ? 1 : 0;

        const winner = players[winnerIndex].walletAddress;
        const loser = players[loserIndex].walletAddress;

        matchmakingService.settleMatch(room, winner, loser, this.emitToRoom.bind(this));
    }, 3000);
  }

  private emitToRoom(roomId: string, event: string, data: any) {
    this.io.to(roomId).emit(event, data);
  }
}
