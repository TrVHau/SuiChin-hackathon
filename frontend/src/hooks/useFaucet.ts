import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { buildClaimFaucetTx } from "@/lib/sui-client";
import {
  FAUCET_COOLDOWN_MS,
  FAUCET_MAX_STACK,
  MODULES,
  PACKAGE_ID,
} from "@/config/sui.config";

const FAUCET_FN_CANDIDATES = [
  "claim_faucet",
  "claim_faucet_chun",
  "claim_faucet_chun_raw",
];

export function useFaucet(profileId: string | undefined) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [claiming, setClaiming] = useState(false);
  const [resolvedFn, setResolvedFn] = useState<string | null>(null);

  const pendingFaucet = useCallback((lastFaucetMs: number): number => {
    const now = Date.now();
    const elapsed = now - lastFaucetMs;
    return Math.min(Math.floor(elapsed / FAUCET_COOLDOWN_MS), FAUCET_MAX_STACK);
  }, []);

  const resolveFaucetFunctionName = useCallback(async (): Promise<string | null> => {
    if (resolvedFn) return resolvedFn;

    try {
      const normalized = (await suiClient.getNormalizedMoveModule({
        package: PACKAGE_ID,
        module: MODULES.PLAYER_PROFILE,
      })) as Record<string, unknown>;

      const exposedMap =
        (normalized.exposedFunctions as Record<string, unknown> | undefined) ??
        (normalized.exposed_functions as Record<string, unknown> | undefined) ??
        {};

      const functionNames = Object.keys(exposedMap);
      const found = FAUCET_FN_CANDIDATES.find((fn) => functionNames.includes(fn)) ?? null;
      if (found) {
        setResolvedFn(found);
      }
      return found;
    } catch {
      return null;
    }
  }, [resolvedFn, suiClient]);

  const claimFaucet = useCallback(
    async (lastFaucetMs: number, onSuccess?: () => void) => {
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

      const faucetFn = await resolveFaucetFunctionName();
      if (!faucetFn) {
        toast.error(
          `Package hien tai khong co ham faucet (player_profile::claim_faucet). Package: ${PACKAGE_ID}`,
          { id: "faucet" },
        );
        return;
      }

      setClaiming(true);
      toast.loading(`Dang nhan ${pending} Chun tu faucet...`, { id: "faucet" });

      signAndExecute(
        { transaction: buildClaimFaucetTx(profileId, faucetFn) },
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
    [
      account,
      pendingFaucet,
      profileId,
      resolveFaucetFunctionName,
      signAndExecute,
    ],
  );

  return { claimFaucet, pendingFaucet, claiming };
}
