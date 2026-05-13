import { env } from "../../config/env.js";
import { getPrismaClient } from "../../infra/db/prisma.js";

export type ValuationRoomStatus =
  | "AWAITING_DEPOSIT"
  | "ROOM_CREATED"
  | "JOINED"
  | "PLAYING"
  | "FINALIZED"
  | "CANCELLED";

export interface ValuationRoomNft {
  id: string;
  name: string;
  tier: number;
  imageUrl?: string;
}

export interface ValuationRoomRecord {
  challengeId: string;
  tempRoomId: string;
  suiRoomId: string | null;
  tier: string;
  creatorWallet: string;
  joinerWallet: string;
  creatorNft: ValuationRoomNft;
  joinerNft: ValuationRoomNft;
  status: ValuationRoomStatus;
}

export interface CreateValuationRoomInput {
  challengeId: string;
  tempRoomId: string;
  tier: string;
  creatorWallet: string;
  joinerWallet: string;
  creatorNft: ValuationRoomNft;
  joinerNft: ValuationRoomNft;
}

interface ValuationRoomRepository {
  create(input: CreateValuationRoomInput): Promise<ValuationRoomRecord>;
  findByChallengeId(challengeId: string): Promise<ValuationRoomRecord | null>;
  findBySuiRoomId(suiRoomId: string): Promise<ValuationRoomRecord | null>;
  findPendingByCreator(
    creatorWallet: string,
  ): Promise<ValuationRoomRecord | null>;
  findPendingByJoiner(input: {
    joinerWallet: string;
    suiRoomId?: string;
  }): Promise<ValuationRoomRecord | null>;
  markRoomCreated(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord>;
  markRoomJoined(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord>;
  markPlaying(challengeId: string): Promise<ValuationRoomRecord | null>;
  markFinalized(challengeId: string): Promise<ValuationRoomRecord | null>;
  markCancelled(challengeId: string): Promise<ValuationRoomRecord | null>;
  reset(): Promise<void>;
}

function cloneRecord(record: ValuationRoomRecord): ValuationRoomRecord {
  return {
    ...record,
    creatorNft: { ...record.creatorNft },
    joinerNft: { ...record.joinerNft },
  };
}

function isPrismaUniqueConstraintOn(error: unknown, field: string): boolean {
  const candidate = error as {
    code?: unknown;
    meta?: { target?: unknown };
  };
  if (candidate?.code !== "P2002") return false;

  const target = candidate.meta?.target;
  if (!target) return true;

  const normalizedTargets = Array.isArray(target)
    ? target
        .map((item) => String(item).replaceAll('"', "").toLowerCase())
        .filter(Boolean)
    : [String(target).replaceAll('"', "").toLowerCase()];
  const normalizedField = field.toLowerCase();
  return normalizedTargets.some((item) => item.includes(normalizedField));
}

class InMemoryValuationRoomRepository implements ValuationRoomRepository {
  private readonly roomsByChallenge = new Map<string, ValuationRoomRecord>();

  async create(input: CreateValuationRoomInput): Promise<ValuationRoomRecord> {
    const record: ValuationRoomRecord = {
      ...input,
      suiRoomId: null,
      creatorNft: { ...input.creatorNft },
      joinerNft: { ...input.joinerNft },
      status: "AWAITING_DEPOSIT",
    };
    this.roomsByChallenge.set(record.challengeId, record);
    return cloneRecord(record);
  }

  async findByChallengeId(
    challengeId: string,
  ): Promise<ValuationRoomRecord | null> {
    const record = this.roomsByChallenge.get(challengeId);
    return record ? cloneRecord(record) : null;
  }

  async findBySuiRoomId(
    suiRoomId: string,
  ): Promise<ValuationRoomRecord | null> {
    for (const record of this.roomsByChallenge.values()) {
      if (record.suiRoomId === suiRoomId) {
        return cloneRecord(record);
      }
    }
    return null;
  }

  async findPendingByCreator(
    creatorWallet: string,
  ): Promise<ValuationRoomRecord | null> {
    for (const record of this.roomsByChallenge.values()) {
      if (
        record.creatorWallet === creatorWallet &&
        record.status === "AWAITING_DEPOSIT" &&
        !record.suiRoomId
      ) {
        return cloneRecord(record);
      }
    }
    return null;
  }

  async findPendingByJoiner(input: {
    joinerWallet: string;
    suiRoomId?: string;
  }): Promise<ValuationRoomRecord | null> {
    if (input.suiRoomId) {
      for (const record of this.roomsByChallenge.values()) {
        if (
          record.joinerWallet === input.joinerWallet &&
          record.suiRoomId === input.suiRoomId &&
          record.status !== "FINALIZED"
        ) {
          return cloneRecord(record);
        }
      }
      return null;
    }

    for (const record of this.roomsByChallenge.values()) {
      if (record.joinerWallet !== input.joinerWallet) continue;
      if (record.status === "FINALIZED" || record.status === "PLAYING")
        continue;
      if (
        input.suiRoomId &&
        record.suiRoomId &&
        record.suiRoomId !== input.suiRoomId
      ) {
        continue;
      }
      return cloneRecord(record);
    }
    return null;
  }

  async markRoomCreated(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const current = this.requireRoom(input.challengeId);
    if (
      current.suiRoomId === input.suiRoomId &&
      (current.status === "ROOM_CREATED" ||
        current.status === "JOINED" ||
        current.status === "PLAYING" ||
        current.status === "FINALIZED" ||
        current.status === "CANCELLED")
    ) {
      return cloneRecord(current);
    }
    if (
      current.suiRoomId &&
      current.suiRoomId !== input.suiRoomId &&
      current.status !== "AWAITING_DEPOSIT"
    ) {
      return cloneRecord(current);
    }

    const existing = await this.findBySuiRoomId(input.suiRoomId);
    if (existing && existing.challengeId !== input.challengeId) {
      return existing;
    }
    if (
      existing &&
      (existing.status === "JOINED" ||
        existing.status === "PLAYING" ||
        existing.status === "FINALIZED" ||
        existing.status === "CANCELLED")
    ) {
      return existing;
    }

    current.suiRoomId = input.suiRoomId;
    current.status = "ROOM_CREATED";
    return cloneRecord(current);
  }

  async markRoomJoined(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const current = this.requireRoom(input.challengeId);
    if (
      current.suiRoomId === input.suiRoomId &&
      (current.status === "JOINED" ||
        current.status === "PLAYING" ||
        current.status === "FINALIZED" ||
        current.status === "CANCELLED")
    ) {
      return cloneRecord(current);
    }
    if (
      current.suiRoomId &&
      current.suiRoomId !== input.suiRoomId &&
      current.status !== "AWAITING_DEPOSIT"
    ) {
      return cloneRecord(current);
    }

    const existing = await this.findBySuiRoomId(input.suiRoomId);
    if (existing && existing.challengeId !== input.challengeId) {
      return existing;
    }
    if (
      existing &&
      (existing.status === "PLAYING" ||
        existing.status === "FINALIZED" ||
        existing.status === "CANCELLED")
    ) {
      return existing;
    }

    current.suiRoomId = input.suiRoomId;
    current.status = "JOINED";
    return cloneRecord(current);
  }

  async markPlaying(challengeId: string): Promise<ValuationRoomRecord | null> {
    const record = this.roomsByChallenge.get(challengeId);
    if (!record) return null;
    record.status = "PLAYING";
    return cloneRecord(record);
  }

  async markFinalized(
    challengeId: string,
  ): Promise<ValuationRoomRecord | null> {
    const record = this.roomsByChallenge.get(challengeId);
    if (!record) return null;
    record.status = "FINALIZED";
    return cloneRecord(record);
  }

  async markCancelled(
    challengeId: string,
  ): Promise<ValuationRoomRecord | null> {
    const record = this.roomsByChallenge.get(challengeId);
    if (!record) return null;
    record.status = "CANCELLED";
    return cloneRecord(record);
  }

  async reset(): Promise<void> {
    this.roomsByChallenge.clear();
  }

  private requireRoom(challengeId: string): ValuationRoomRecord {
    const record = this.roomsByChallenge.get(challengeId);
    if (!record) {
      throw new Error("Valuation room not found");
    }
    return record;
  }
}

class PrismaValuationRoomRepository implements ValuationRoomRepository {
  private readonly db = getPrismaClient() as Record<string, any>;

  async create(input: CreateValuationRoomInput): Promise<ValuationRoomRecord> {
    const row = await this.db.valuationRoom.create({
      data: {
        challengeId: input.challengeId,
        tempRoomId: input.tempRoomId,
        tier: input.tier,
        creatorWallet: input.creatorWallet,
        joinerWallet: input.joinerWallet,
        creatorNftJson: input.creatorNft,
        joinerNftJson: input.joinerNft,
        status: "AWAITING_DEPOSIT",
      },
    });
    return this.toRecord(row);
  }

  async findByChallengeId(
    challengeId: string,
  ): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.findUnique({
      where: { challengeId },
    });
    return row ? this.toRecord(row) : null;
  }

  async findBySuiRoomId(
    suiRoomId: string,
  ): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.findUnique({
      where: { suiRoomId },
    });
    return row ? this.toRecord(row) : null;
  }

  async findPendingByCreator(
    creatorWallet: string,
  ): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.findFirst({
      where: {
        creatorWallet,
        suiRoomId: null,
        status: "AWAITING_DEPOSIT",
      },
      orderBy: { createdAt: "asc" },
    });
    return row ? this.toRecord(row) : null;
  }

  async findPendingByJoiner(input: {
    joinerWallet: string;
    suiRoomId?: string;
  }): Promise<ValuationRoomRecord | null> {
    if (input.suiRoomId) {
      const exact = await this.db.valuationRoom.findUnique({
        where: { suiRoomId: input.suiRoomId },
      });
      if (
        exact &&
        exact.joinerWallet === input.joinerWallet &&
        exact.status !== "FINALIZED"
      ) {
        return this.toRecord(exact);
      }
      return null;
    }

    const row = await this.db.valuationRoom.findFirst({
      where: {
        joinerWallet: input.joinerWallet,
        status: { in: ["AWAITING_DEPOSIT", "ROOM_CREATED", "JOINED"] },
        ...(input.suiRoomId
          ? { OR: [{ suiRoomId: input.suiRoomId }, { suiRoomId: null }] }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    return row ? this.toRecord(row) : null;
  }

  async markRoomCreated(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const current = await this.db.valuationRoom.findUnique({
      where: { challengeId: input.challengeId },
    });
    if (!current) {
      throw new Error("Valuation room not found");
    }
    if (
      current.suiRoomId === input.suiRoomId &&
      (current.status === "ROOM_CREATED" ||
        current.status === "JOINED" ||
        current.status === "PLAYING" ||
        current.status === "FINALIZED" ||
        current.status === "CANCELLED")
    ) {
      return this.toRecord(current);
    }
    if (
      current.suiRoomId &&
      current.suiRoomId !== input.suiRoomId &&
      current.status !== "AWAITING_DEPOSIT"
    ) {
      return this.toRecord(current);
    }

    const existing = await this.db.valuationRoom.findUnique({
      where: { suiRoomId: input.suiRoomId },
    });
    if (existing && existing.challengeId !== input.challengeId) {
      return this.toRecord(existing);
    }
    if (
      existing &&
      (existing.status === "JOINED" ||
        existing.status === "PLAYING" ||
        existing.status === "FINALIZED" ||
        existing.status === "CANCELLED")
    ) {
      return this.toRecord(existing);
    }

    try {
      const row = await this.db.valuationRoom.update({
        where: { challengeId: input.challengeId },
        data: {
          suiRoomId: input.suiRoomId,
          status: "ROOM_CREATED",
        },
      });
      return this.toRecord(row);
    } catch (error) {
      if (isPrismaUniqueConstraintOn(error, "suiRoomId")) {
        const conflicting = await this.db.valuationRoom.findUnique({
          where: { suiRoomId: input.suiRoomId },
        });
        if (conflicting) {
          return this.toRecord(conflicting);
        }
      }
      throw error;
    }
  }

  async markRoomJoined(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const current = await this.db.valuationRoom.findUnique({
      where: { challengeId: input.challengeId },
    });
    if (!current) {
      throw new Error("Valuation room not found");
    }
    if (
      current.suiRoomId === input.suiRoomId &&
      (current.status === "JOINED" ||
        current.status === "PLAYING" ||
        current.status === "FINALIZED" ||
        current.status === "CANCELLED")
    ) {
      return this.toRecord(current);
    }
    if (
      current.suiRoomId &&
      current.suiRoomId !== input.suiRoomId &&
      current.status !== "AWAITING_DEPOSIT"
    ) {
      return this.toRecord(current);
    }

    const existing = await this.db.valuationRoom.findUnique({
      where: { suiRoomId: input.suiRoomId },
    });
    if (existing && existing.challengeId !== input.challengeId) {
      return this.toRecord(existing);
    }
    if (
      existing &&
      (existing.status === "PLAYING" ||
        existing.status === "FINALIZED" ||
        existing.status === "CANCELLED")
    ) {
      return this.toRecord(existing);
    }

    try {
      const row = await this.db.valuationRoom.update({
        where: { challengeId: input.challengeId },
        data: {
          suiRoomId: input.suiRoomId,
          status: "JOINED",
        },
      });
      return this.toRecord(row);
    } catch (error) {
      if (isPrismaUniqueConstraintOn(error, "suiRoomId")) {
        const conflicting = await this.db.valuationRoom.findUnique({
          where: { suiRoomId: input.suiRoomId },
        });
        if (conflicting) {
          return this.toRecord(conflicting);
        }
      }
      throw error;
    }
  }

  async markPlaying(challengeId: string): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.update({
      where: { challengeId },
      data: { status: "PLAYING" },
    });
    return row ? this.toRecord(row) : null;
  }

  async markFinalized(
    challengeId: string,
  ): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.update({
      where: { challengeId },
      data: { status: "FINALIZED" },
    });
    return row ? this.toRecord(row) : null;
  }

  async markCancelled(
    challengeId: string,
  ): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.update({
      where: { challengeId },
      data: { status: "CANCELLED" },
    });
    return row ? this.toRecord(row) : null;
  }

  async reset(): Promise<void> {
    await this.db.valuationRoom.deleteMany({});
  }

  private toRecord(row: any): ValuationRoomRecord {
    return {
      challengeId: row.challengeId,
      tempRoomId: row.tempRoomId,
      suiRoomId: row.suiRoomId ?? null,
      tier: row.tier,
      creatorWallet: row.creatorWallet,
      joinerWallet: row.joinerWallet,
      creatorNft: row.creatorNftJson,
      joinerNft: row.joinerNftJson,
      status: row.status,
    };
  }
}

function buildRepository(): ValuationRoomRepository {
  if (env.BACKEND_STORAGE === "prisma") {
    return new PrismaValuationRoomRepository();
  }
  return new InMemoryValuationRoomRepository();
}

export const valuationRoomRepository = buildRepository();
