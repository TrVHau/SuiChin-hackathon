import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { buildClaimFaucetTx } from '@/lib/sui-client';
import { FAUCET_COOLDOWN_MS, FAUCET_MAX_STACK } from '@/config/sui.config';

/**
 * Hook for claiming the on-chain faucet.
 * `lastFaucetMs` and `chunRaw` should come from the PlayerProfile on-chain data.
 */
export function useFaucet(profileId: string | undefined) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [claiming, setClaiming] = useState(false);

  /** How many chun the player can claim right now (mirrors on-chain formula). */
  const pendingFaucet = useCallback((lastFaucetMs: number): number => {
    const now = Date.now();
    const elapsed = now - lastFaucetMs;
    return Math.min(Math.floor(elapsed / FAUCET_COOLDOWN_MS), FAUCET_MAX_STACK);
  }, []);

  const claimFaucet = useCallback(
    (lastFaucetMs: number, onSuccess?: () => void) => {
      if (!account?.address || !profileId) {
        toast.error('Vui lòng kết nối ví và có Profile');
        return;
      }

      const pending = pendingFaucet(lastFaucetMs);
      if (pending <= 0) {
        const nextMs = lastFaucetMs + FAUCET_COOLDOWN_MS;
        const remaining = Math.ceil((nextMs - Date.now()) / 60_000);
        toast.info(`Chưa đủ thời gian — còn ${remaining} phút nữa`);
        return;
      }

      setClaiming(true);
      toast.loading(`Đang nhận ${pending} Chun từ Faucet...`, { id: 'faucet' });

      signAndExecute(
        { transaction: buildClaimFaucetTx(profileId) },
        {
          onSuccess: () => {
            setClaiming(false);
            toast.success(`+${pending} Chun Raw! 🎉`, { id: 'faucet' });
            onSuccess?.();
          },
          onError: (err) => {
            setClaiming(false);
            toast.error(`Faucet thất bại: ${err.message}`, { id: 'faucet' });
          },
        },
      );
    },
    [account, profileId, pendingFaucet, signAndExecute],
  );

  return { claimFaucet, pendingFaucet, claiming };
}
