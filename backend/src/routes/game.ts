import express from 'express';
import { suiClient } from '../sui-client';
import * as dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const PACKAGE_ID = process.env.PACKAGE_ID ?? '';

/**
 * GET /api/craft-cost
 * Returns current chun_raw cost to craft based on halving counter.
 * Reads Treasury object from chain.
 */
router.get('/craft-cost', async (req, res) => {
  try {
    const treasuryId = req.query.treasuryId as string;
    if (!treasuryId) {
      return res.status(400).json({ error: 'treasuryId query param required' });
    }

    const obj = await suiClient.getObject({
      id: treasuryId,
      options: { showContent: true },
    });

    const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
    const totalCrafts = Number(fields?.total_crafts ?? 0);

    // Mirror the on-chain formula: cost = 10 * 2^(totalCrafts / 1000), max 640
    const steps = Math.floor(totalCrafts / 1000);
    const cost = steps >= 6 ? 640 : 10 * Math.pow(2, steps);

    return res.json({ cost, totalCrafts });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/faucet-pending?profileId=0x...
 * Returns how many chun a player can claim right now.
 */
router.get('/faucet-pending', async (req, res) => {
  try {
    const profileId = req.query.profileId as string;
    if (!profileId) {
      return res.status(400).json({ error: 'profileId query param required' });
    }

    const obj = await suiClient.getObject({
      id: profileId,
      options: { showContent: true },
    });

    const fields = (obj.data?.content as { fields?: Record<string, unknown> })?.fields;
    const lastFaucetMs = Number(fields?.last_faucet_ms ?? 0);
    const COOLDOWN_MS = 7_200_000;
    const MAX_STACK = 10;
    const elapsed = Date.now() - lastFaucetMs;
    const pending = Math.min(Math.floor(elapsed / COOLDOWN_MS), MAX_STACK);

    return res.json({ pending, lastFaucetMs });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
