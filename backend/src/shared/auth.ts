import type { Request } from "express";
import { AppError } from "./errors";

export function getWalletAddress(req: Request): string {
  const wallet = req.header("x-wallet-address")?.trim();
  if (!wallet) {
    throw new AppError("UNAUTHORIZED", "Missing x-wallet-address header", 401);
  }
  return wallet;
}

export function getOracleApiKey(req: Request): string {
  return req.header("x-oracle-key")?.trim() ?? "";
}
