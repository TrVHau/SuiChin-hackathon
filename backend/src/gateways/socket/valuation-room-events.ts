import { EventEmitter } from "node:events";

export interface ValuationRoomCreatedEvent {
  roomId: string;
  creator: string;
  txDigest?: string;
  eventSeq?: string;
}

export interface ValuationRoomJoinedEvent {
  roomId: string;
  joiner: string;
  txDigest?: string;
  eventSeq?: string;
}

export interface ValuationRoomActivatedEvent {
  roomId: string;
  txDigest?: string;
  eventSeq?: string;
}

type ValuationRoomEventMap = {
  roomCreated: ValuationRoomCreatedEvent;
  roomJoined: ValuationRoomJoinedEvent;
  roomActivated: ValuationRoomActivatedEvent;
};

class ValuationRoomEventBus {
  private readonly emitter = new EventEmitter();

  on<K extends keyof ValuationRoomEventMap>(
    eventName: K,
    handler: (event: ValuationRoomEventMap[K]) => void,
  ): () => void {
    this.emitter.on(eventName, handler);
    return () => this.emitter.off(eventName, handler);
  }

  emit<K extends keyof ValuationRoomEventMap>(
    eventName: K,
    event: ValuationRoomEventMap[K],
  ): void {
    this.emitter.emit(eventName, event);
  }
}

export const valuationRoomEvents = new ValuationRoomEventBus();
