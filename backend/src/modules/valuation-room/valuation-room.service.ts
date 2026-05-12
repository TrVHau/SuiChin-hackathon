import {
  type CreateValuationRoomInput,
  type ValuationRoomRecord,
  valuationRoomRepository,
} from "./valuation-room.repository.js";

export class ValuationRoomService {
  create(input: CreateValuationRoomInput): Promise<ValuationRoomRecord> {
    return valuationRoomRepository.create(input);
  }

  findByChallengeId(challengeId: string): Promise<ValuationRoomRecord | null> {
    return valuationRoomRepository.findByChallengeId(challengeId);
  }

  findBySuiRoomId(suiRoomId: string): Promise<ValuationRoomRecord | null> {
    return valuationRoomRepository.findBySuiRoomId(suiRoomId);
  }

  findPendingByCreator(creatorWallet: string): Promise<ValuationRoomRecord | null> {
    return valuationRoomRepository.findPendingByCreator(creatorWallet);
  }

  findPendingByJoiner(input: {
    joinerWallet: string;
    suiRoomId?: string;
  }): Promise<ValuationRoomRecord | null> {
    return valuationRoomRepository.findPendingByJoiner(input);
  }

  markRoomCreated(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    return valuationRoomRepository.markRoomCreated(input);
  }

  markRoomJoined(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    return valuationRoomRepository.markRoomJoined(input);
  }

  markPlaying(challengeId: string): Promise<ValuationRoomRecord | null> {
    return valuationRoomRepository.markPlaying(challengeId);
  }

  markFinalized(challengeId: string): Promise<ValuationRoomRecord | null> {
    return valuationRoomRepository.markFinalized(challengeId);
  }

  resetForTests(): Promise<void> {
    return valuationRoomRepository.reset();
  }
}

export const valuationRoomService = new ValuationRoomService();
