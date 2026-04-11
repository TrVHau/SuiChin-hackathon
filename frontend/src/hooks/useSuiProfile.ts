import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  buildClaimBadgeTx,
  buildInitProfileTx,
  buildReportResultTx,
} from "@/lib/sui-client";
import {
  ACHIEVEMENT_MILESTONES,
  MAX_DELTA_CHUN,
  PLAYER_PROFILE_TYPE,
} from "@/config/sui.config";
import { useGameStore } from "@/stores/gameStore";

export interface PlayerProfileData {
  objectId: string;
  owner: string;
  chun_raw: number;
  wins: number;
  losses: number;
  streak: number;
  last_played_ms: number;
  staked_chun: number;
  last_faucet_ms: number;
}

function pickBestProfile(profiles: PlayerProfileData[]): PlayerProfileData {
  const sorted = [...profiles].sort((a, b) => {
    const byLastPlayed = b.last_played_ms - a.last_played_ms;
    if (byLastPlayed !== 0) return byLastPlayed;

    const byGames = b.wins + b.losses - (a.wins + a.losses);
    if (byGames !== 0) return byGames;

    const byChun = b.chun_raw - a.chun_raw;
    if (byChun !== 0) return byChun;

    const byStake = b.staked_chun - a.staked_chun;
    if (byStake !== 0) return byStake;

    return a.objectId.localeCompare(b.objectId);
  });

  return sorted[0];
}

export function useSuiProfile() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const setStoreProfile = useGameStore((s) => s.setProfile);

  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const fetchProfiles = useCallback(
    async (owner: string): Promise<PlayerProfileData[]> => {
      const objects = await suiClient.getOwnedObjects({
        owner,
        filter: { StructType: PLAYER_PROFILE_TYPE },
        options: { showContent: true, showType: true },
      });

      const parsed: PlayerProfileData[] = [];
      for (const item of objects.data) {
        const content = item.data?.content;
        if (!item.data || !content || !("fields" in content)) continue;
        const fields = content.fields as Record<string, unknown>;
        parsed.push({
          objectId: item.data.objectId,
          owner,
          chun_raw: Number(fields.chun_raw ?? 0),
          wins: Number(fields.wins ?? 0),
          losses: Number(fields.losses ?? 0),
          streak: Number(fields.streak ?? 0),
          last_played_ms: Number(fields.last_played_ms ?? 0),
          staked_chun: Number(fields.staked_chun ?? 0),
          last_faucet_ms: Number(fields.last_faucet_ms ?? 0),
        });
      }

      return parsed;
    },
    [suiClient],
  );

  const hasGasCoin = useCallback(
    async (owner: string): Promise<boolean> => {
      const coins = await suiClient.getCoins({ owner, coinType: "0x2::sui::SUI" });
      const totalBalance = coins.data.reduce((sum, coin) => {
        const balance = Number(coin.balance ?? 0);
        return Number.isFinite(balance) ? sum + balance : sum;
      }, 0);
      return totalBalance > 0;
    },
    [suiClient],
  );

  const loadProfile = useCallback(async () => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const profiles = await fetchProfiles(account.address);

      if (profiles.length === 0) {
        setHasProfile(false);
        setProfile(null);
        setStoreProfile(null);
        return;
      }

      const selected = pickBestProfile(profiles);
      setHasProfile(true);
      setProfile(selected);
      setStoreProfile(selected);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Khong the tai profile");
    } finally {
      setLoading(false);
    }
  }, [account?.address, fetchProfiles, setStoreProfile]);

  const createProfile = async (onSuccess?: () => void, onError?: () => void) => {
    if (!account?.address) {
      toast.error("Vui long ket noi vi");
      onError?.();
      return;
    }

    setLoading(true);
    try {
      // Guard against duplicate creation: check on-chain one more time right before init.
      const existing = await fetchProfiles(account.address);
      if (existing.length > 0) {
        const selected = pickBestProfile(existing);
        setHasProfile(true);
        setProfile(selected);
        setStoreProfile(selected);
        toast.info("Da tim thay profile cu, khong tao moi.");
        onSuccess?.();
        return;
      }

      const gasReady = await hasGasCoin(account.address);
      if (!gasReady) {
        toast.error(
          "Tai khoan chua co SUI gas coin. Hay claim faucet hoac nap SUI truoc khi tao profile.",
        );
        onError?.();
        return;
      }
    } catch (error) {
      console.error("Pre-create profile check failed:", error);
      // Continue to create if check fails unexpectedly.
    } finally {
      setLoading(false);
    }

    const tx = buildInitProfileTx();
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setTimeout(async () => {
            await loadProfile();
            onSuccess?.();
          }, 1500);
        },
        onError: (error) => {
          console.error("Create profile error:", error);
          const message = String(error?.message ?? "");
          if (message.includes("No valid gas coins")) {
            toast.error(
              "Khong co gas coin hop le. Hay claim faucet hoac dung vi da nap SUI.",
            );
          } else if (message.includes("JWK not found") || message.includes("Invalid user signature")) {
            toast.error(
              "Chu ky zkLogin khong hop le hoac JWK chua sync. Hay dang nhap lai Google/Twitch/Facebook va thu lai.",
            );
          } else {
            toast.error(`Tao profile that bai: ${message || "unknown error"}`);
          }
          onError?.();
        },
      },
    );
  };

  const reportResult = (
    isWin: boolean,
    onSuccess?: () => void,
    onError?: () => void,
  ) => {
    if (!profile) {
      toast.error("Khong tim thay profile");
      return;
    }

    const delta = isWin ? Math.min(1 + profile.streak, MAX_DELTA_CHUN) : 1;
    const tx = buildReportResultTx(profile.objectId, delta, isWin);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          const msg = isWin
            ? `+${delta} Chun, Streak: ${profile.streak + 1}`
            : "-1 Chun, Streak reset";
          toast.success(msg);
          setTimeout(() => {
            loadProfile();
            onSuccess?.();
          }, 1200);
        },
        onError: (error) => {
          console.error("Report result error:", error);
          const errMsg = String(error?.message ?? "");
          if (errMsg.includes("101")) {
            toast.error("Cooldown chua het, cho them 10 giay");
          } else if (errMsg.includes("102")) {
            toast.error("Delta qua lon (toi da 20)");
          } else {
            toast.error("Luu ket qua that bai");
          }
          onError?.();
        },
      },
    );
  };

  const claimAchievement = (badgeType: number) => {
    if (!profile) {
      toast.error("Khong tim thay profile");
      return;
    }

    const tx = buildClaimBadgeTx(profile.objectId, badgeType);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          const milestoneName = Object.entries(ACHIEVEMENT_MILESTONES).find(
            ([, v]) => v === badgeType,
          )?.[0];
          toast.success(`Claim badge ${milestoneName ?? badgeType} thanh cong`);
          setTimeout(() => loadProfile(), 1200);
        },
        onError: (error) => {
          console.error("Claim badge error:", error);
          toast.error("Claim badge that bai");
        },
      },
    );
  };

  useEffect(() => {
    if (account?.address) {
      loadProfile();
    } else {
      setProfile(null);
      setHasProfile(false);
      setStoreProfile(null);
    }
  }, [account?.address, loadProfile, setStoreProfile]);

  return {
    account,
    profile,
    loading,
    hasProfile,
    createProfile,
    reportResult,
    claimAchievement,
    refreshProfile: loadProfile,
  };
}
