import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildClaimFaucetTx } from "@/lib/sui-client";
import { FAUCET_COOLDOWN_MS, FAUCET_MAX_STACK } from "@/config/sui.config";

export function useFaucet(profileId: string | undefined) {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [claiming, setClaiming] = useState(false);

  const pendingFaucet = useCallback((lastFaucetMs: number): number => {
    const now = Date.now();
    const elapsed = now - lastFaucetMs;
    return Math.min(Math.floor(elapsed / FAUCET_COOLDOWN_MS), FAUCET_MAX_STACK);
  }, []);

  const claimFaucet = useCallback(
    (lastFaucetMs: number, onSuccess?: () => void) => {
      if (!account?.address || !profileId) {
        toast.error("Vui long ket noi vi va co profile");
        return;
      }

      const pending = pendingFaucet(lastFaucetMs);
      if (pending <= 0) {
        const nextMs = lastFaucetMs + FAUCET_COOLDOWN_MS;
        const remaining = Math.ceil((nextMs - Date.now()) / 60_000);
        toast.info(`Chua du thoi gian, con ${remaining} phut nua`);
        return;
      }

      setClaiming(true);
      toast.loading(`Dang nhan ${pending} Chun tu faucet...`, { id: "faucet" });

      signAndExecute(
        { transaction: buildClaimFaucetTx(profileId) },
        {
          onSuccess: () => {
            setClaiming(false);
            toast.success(`+${pending} Chun Raw!`, { id: "faucet" });
            onSuccess?.();
          },
          onError: (err) => {
            setClaiming(false);
            const message = String(err?.message ?? "");
            if (message.includes("104")) {
              toast.error("Faucet chua du thoi gian de claim", { id: "faucet" });
              return;
            }
            if (message.includes("100")) {
              toast.error("Profile khong thuoc ve vi hien tai", { id: "faucet" });
              return;
            }
            toast.error(`Faucet that bai: ${message}`, { id: "faucet" });
          },
        },
      );
    },
    [account, profileId, pendingFaucet, signAndExecute],
  );

  return { claimFaucet, pendingFaucet, claiming };
}
