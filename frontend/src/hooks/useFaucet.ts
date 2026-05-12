import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useCallback, useEffect, useState } from "react";
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

interface FaucetCallTarget {
  moduleName: string;
  functionName: string;
}

type NormalizedModuleLike = {
  exposedFunctions?: Record<string, unknown>;
  exposed_functions?: Record<string, unknown>;
};

export function useFaucet(profileId: string | undefined) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [claiming, setClaiming] = useState(false);
  const [resolvedTarget, setResolvedTarget] = useState<FaucetCallTarget | null>(null);
  const [faucetSupport, setFaucetSupport] = useState<"unknown" | "supported" | "unsupported">(
    "unknown",
  );

  const pendingFaucet = useCallback((lastFaucetMs: number): number => {
    const now = Date.now();
    // Normalize: some on-chain values may be in seconds instead of ms.
    const normalizedLast =
      lastFaucetMs > 1e12 ? lastFaucetMs : Math.floor(lastFaucetMs * 1000);
    const elapsed = now - normalizedLast;
    return Math.min(Math.floor(elapsed / FAUCET_COOLDOWN_MS), FAUCET_MAX_STACK);
  }, []);

  const extractFunctionNames = (normalized: NormalizedModuleLike): string[] => {
    const exposedMap =
      (normalized.exposedFunctions as Record<string, unknown> | undefined) ??
      (normalized.exposed_functions as Record<string, unknown> | undefined) ??
      {};
    return Object.keys(exposedMap);
  };

  const resolveFaucetTarget = useCallback(async (): Promise<FaucetCallTarget | null> => {
    if (resolvedTarget) return resolvedTarget;

    try {
      const normalized = await suiClient.getNormalizedMoveModule({
        package: PACKAGE_ID,
        module: MODULES.PLAYER_PROFILE,
      });

      const functionNames = extractFunctionNames(normalized);
      const found = FAUCET_FN_CANDIDATES.find((fn) => functionNames.includes(fn));
      if (found) {
        const target = {
          moduleName: MODULES.PLAYER_PROFILE,
          functionName: found,
        };
        setResolvedTarget(target);
        setFaucetSupport("supported");
        return target;
      }
    } catch {
      // Ignore and fallback to package-wide scan.
    }

    try {
      const modules = (await suiClient.getNormalizedMoveModulesByPackage({
        package: PACKAGE_ID,
      })) as Record<string, NormalizedModuleLike>;

      for (const [moduleName, moduleDef] of Object.entries(modules)) {
        const functionNames = extractFunctionNames(moduleDef);
        const found = FAUCET_FN_CANDIDATES.find((fn) => functionNames.includes(fn));
        if (found) {
          const target = { moduleName, functionName: found };
          setResolvedTarget(target);
          setFaucetSupport("supported");
          return target;
        }
      }
    } catch {
      // Keep null; handled by caller with clear toast.
    }

    setFaucetSupport("unsupported");
    return null;
  }, [resolvedTarget, suiClient]);

  useEffect(() => {
    if (!account?.address || !profileId || resolvedTarget) return;

    resolveFaucetTarget().catch(() => {
      // Keep unknown state on transient RPC errors.
    });
  }, [account?.address, profileId, resolveFaucetTarget, resolvedTarget]);

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

      const faucetTarget = await resolveFaucetTarget();
      if (!faucetTarget) {
        toast.error(
          `Package hien tai khong co ham faucet tuong thich. Package: ${PACKAGE_ID}`,
          { id: "faucet" },
        );
        return;
      }

      setClaiming(true);
      toast.loading(`Dang nhan ${pending} Chun tu faucet...`, { id: "faucet" });

      signAndExecute(
        {
          transaction: buildClaimFaucetTx(
            profileId,
            faucetTarget.functionName,
            faucetTarget.moduleName,
          ),
        },
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
      resolveFaucetTarget,
      signAndExecute,
    ],
  );

  return { claimFaucet, pendingFaucet, claiming, faucetSupport };
}
