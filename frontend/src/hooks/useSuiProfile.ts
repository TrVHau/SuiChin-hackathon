import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  buildInitProfileTx,
  buildReportResultTx,
  buildClaimBadgeTx,
} from "@/lib/sui-client";
import {
  PLAYER_PROFILE_TYPE,
  MAX_DELTA_CHUN,
  ACHIEVEMENT_MILESTONES,
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

export function useSuiProfile() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const setStoreProfile = useGameStore((s) => s.setProfile);

  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const objects = await suiClient.getOwnedObjects({
        owner: account.address,
        filter: { StructType: PLAYER_PROFILE_TYPE },
        options: { showContent: true, showType: true },
      });

      if (objects.data.length === 0) {
        setHasProfile(false);
        setProfile(null);
        setStoreProfile(null);
        return;
      }

      const profileObj = objects.data[0];
      setHasProfile(true);

      const content = profileObj.data?.content;
      if (content && "fields" in content && profileObj.data) {
        const fields = content.fields as Record<string, unknown>;
        const data: PlayerProfileData = {
          objectId: profileObj.data.objectId,
          owner: account.address,
          chun_raw: Number(fields.chun_raw ?? 0),
          wins: Number(fields.wins ?? 0),
          losses: Number(fields.losses ?? 0),
          streak: Number(fields.streak ?? 0),
          last_played_ms: Number(fields.last_played_ms ?? 0),
          staked_chun: Number(fields.staked_chun ?? 0),
          last_faucet_ms: Number(fields.last_faucet_ms ?? 0),
        };
        setProfile(data);
        setStoreProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Không thể tải profile");
    } finally {
      setLoading(false);
    }
  }, [account?.address, suiClient, setStoreProfile]);

  const createProfile = (onSuccess?: () => void, onError?: () => void) => {
    if (!account?.address) {
      toast.error("Vui lòng kết nối ví");
      onError?.();
      return;
    }

    const tx = buildInitProfileTx();
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setTimeout(async () => {
            await loadProfile();
            onSuccess?.();
          }, 2000);
        },
        onError: (error) => {
          console.error("Create profile error:", error);
          toast.error("Tạo profile thất bại");
          onError?.();
        },
      },
    );
  };

  /**
   * Gọi sau mỗi ván kết thúc.
   * - Thắng: delta = min(1 + streak, MAX_DELTA_CHUN), isWin = true
   * - Thua:  delta = 1, isWin = false
   */
  const reportResult = (
    isWin: boolean,
    onSuccess?: () => void,
    onError?: () => void,
  ) => {
    if (!profile) {
      toast.error("Không tìm thấy profile");
      return;
    }

    const delta = isWin ? Math.min(1 + profile.streak, MAX_DELTA_CHUN) : 1;

    const tx = buildReportResultTx(profile.objectId, delta, isWin);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (_result) => {
          const msg = isWin
            ? `+${delta} chun 🔥 Streak: ${profile.streak + 1}`
            : `-1 chun 😢 Streak reset`;
          toast.success(msg);
          setTimeout(() => {
            loadProfile();
            onSuccess?.();
          }, 1500);
        },
        onError: (error) => {
          console.error("Report result error:", error);
          const errMsg = error.message || "";
          if (errMsg.includes("101")) {
            toast.error("Cooldown chưa hết! Chờ 10 giây giữa các ván.");
          } else if (errMsg.includes("102")) {
            toast.error("Delta quá lớn (tối đa 20).");
          } else {
            toast.error("Lưu kết quả thất bại");
          }
          onError?.();
        },
      },
    );
  };

  const claimAchievement = (badgeType: number) => {
    if (!profile) {
      toast.error("Không tìm thấy profile");
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
          toast.success(
            `Claim badge ${milestoneName ?? badgeType} thành công! 🏆`,
          );
          setTimeout(() => loadProfile(), 2000);
        },
        onError: (error) => {
          console.error("Claim badge error:", error);
          toast.error("Claim badge thất bại");
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
    }
  }, [account?.address]);

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
