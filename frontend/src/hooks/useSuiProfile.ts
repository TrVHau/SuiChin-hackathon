/**
 * Hook tương tác với Sui blockchain
 * Thay thế mock data bằng real blockchain calls
 */

import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    buildCreateProfileTx,
  buildRecordSessionTx,
  buildClaimFaucetTx,
  buildCraftRollTx,
  buildClaimAchievementTx,
} from "@/lib/sui-client";
import { PACKAGE_ID, MODULES } from "@/config/sui.config";

interface PlayerProfileData {
  objectId: string;
  address: string;
  tier1: number;
  tier2: number;
  tier3: number;
  maxStreak: number;
  currentStreak: number;
  faucetLastClaim: number;
  achievements: number[];
}

export function useSuiProfile() {
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  
  const [profile, setProfile] = useState<PlayerProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  console.log('🔍 useSuiProfile hook:', { account: account?.address, profile, hasProfile, loading });

  // Load profile từ blockchain
  const loadProfile = async () => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const objects = await suiClient.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::${MODULES.PLAYER}::PlayerProfile`,
        },
        options: {
          showContent: true,
          showType: true,
        },
      });
      
      if (objects.data.length === 0) {
        setHasProfile(false);
        setProfile(null);
        return;
      }

      const profileObj = objects.data[0];
      setHasProfile(true);

      console.log('📦 Profile object loaded:', {
        objectId: profileObj.data?.objectId,
        version: profileObj.data?.version,
        digest: profileObj.data?.digest,
      });

      // Parse profile data từ blockchain
      const content = profileObj.data?.content;
      if (content && 'fields' in content && profileObj.data) {
        const fields = content.fields as any;
        const profileData = {
          objectId: profileObj.data.objectId,
          address: account.address,
          tier1: Number(fields.tier1 || 0),
          tier2: Number(fields.tier2 || 0),
          tier3: Number(fields.tier3 || 0),
          maxStreak: Number(fields.max_streak || 0),
          currentStreak: Number(fields.current_streak || 0),
          faucetLastClaim: Number(fields.faucet_last_claim || 0),
          achievements: fields.achievements || [],
        };
        console.log('✅ Profile data parsed:', profileData);
        setProfile(profileData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Không thể tải profile");
    } finally {
      setLoading(false);
    }
  };

  // Create profile mới
  const createProfile = () => {
    if (!account?.address) {
      toast.error("Vui lòng kết nối ví");
      return;
    }

    const tx = buildCreateProfileTx();
    
    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: (result) => {
          console.log("Profile created:", result);
          toast.success("Tạo profile thành công!");
          setTimeout(() => loadProfile(), 2000); // Reload sau 2s
        },
        onError: (error) => {
          console.error("Create profile error:", error);
          toast.error("Tạo profile thất bại");
        },
      }
    );
  };

  // Record session
  const recordSession = (
    deltaTier1: number,
    deltaTier2: number,
    deltaTier3: number,
    isTier1Positive: boolean,
    isTier2Positive: boolean,
    isTier3Positive: boolean,
    newMaxStreak: number,
    newCurrentStreak: number
  ) => {
    if (!profile) {
      toast.error("Không tìm thấy profile");
      return;
    }

    const tx = buildRecordSessionTx(
      profile.objectId,
      deltaTier1,
      deltaTier2,
      deltaTier3,
      isTier1Positive,
      isTier2Positive,
      isTier3Positive,
      newMaxStreak,
      newCurrentStreak
    );

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          toast.success("Lưu kết quả thành công!");
          setTimeout(() => loadProfile(), 2000);
        },
        onError: (error) => {
          console.error("Record session error:", error);
          toast.error("Lưu kết quả thất bại");
        },
      }
    );
  };

  // Claim faucet
  const claimFaucet = () => {
    if (!profile) {
      toast.error("Không tìm thấy profile");
      return;
    }

    console.log('🎲 Claiming faucet with profile ID:', profile.objectId);
    const tx = buildClaimFaucetTx(profile.objectId);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          toast.success("Xin chun thành công!");
          setTimeout(() => loadProfile(), 2000);
        },
        onError: (error) => {
          console.error("❌ Claim faucet error:", error);
          console.error("❌ Profile objectId was:", profile.objectId);
          toast.error("Xin chun thất bại - kiểm tra console để debug");
        },
      }
    );
  };

  // Craft roll
  const craftRoll = (useTier1: number, useTier2: number, useTier3: number) => {
    if (!profile) {
      toast.error("Không tìm thấy profile");
      return;
    }

    console.log('🎨 Crafting roll with profile ID:', profile.objectId);
    console.log('🎨 Using chuns:', { useTier1, useTier2, useTier3 });
    console.log('🎨 Current balance:', { tier1: profile.tier1, tier2: profile.tier2, tier3: profile.tier3 });

    const tx = buildCraftRollTx(profile.objectId, useTier1, useTier2, useTier3);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          toast.success("Mint NFT thành công!");
          setTimeout(() => loadProfile(), 2000);
        },
        onError: (error) => {
          console.error("❌ Craft roll error:", error);
          console.error("❌ Profile objectId was:", profile.objectId);
          toast.error("Mint NFT thất bại - kiểm tra console để debug");
        },
      }
    );
  };

  // Claim achievement
  const claimAchievement = (milestone: number) => {
    if (!profile) {
      toast.error("Không tìm thấy profile");
      return;
    }

    const tx = buildClaimAchievementTx(profile.objectId, milestone);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          toast.success("Claim achievement thành công!");
          setTimeout(() => loadProfile(), 2000);
        },
        onError: (error) => {
          console.error("Claim achievement error:", error);
          toast.error("Claim achievement thất bại");
        },
      }
    );
  };

  // Auto-load profile khi account thay đổi
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
    recordSession,
    claimFaucet,
    craftRoll,
    claimAchievement,
    refreshProfile: loadProfile,
  };
}
