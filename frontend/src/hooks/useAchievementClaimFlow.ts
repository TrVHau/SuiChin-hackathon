import { toast } from "sonner";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildClaimBadgeTx } from "@/lib/sui-client";
import { useGame } from "@/providers/GameContext";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";

export function useAchievementClaimFlow() {
  const { playerData } = useGame();
  const { badges, refetch: refetchBadges } = useOwnedNFTs();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

  const resolvedProfileId = playerData?.objectId ?? "";
  const resolvedMaxStreak = playerData?.streak ?? 0;
  const claimedMilestones = badges.map((b) => b.badge_type);

  const handleClaim = (milestone: number) => {
    if (!resolvedProfileId) {
      toast.error("Khong tim thay profile");
      return;
    }

    toast.loading("Đang claim achievement...", { id: `claim-${milestone}` });
    const tx = buildClaimBadgeTx(resolvedProfileId, milestone);

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          toast.success("Claim thành công! 🏆", { id: `claim-${milestone}` });
          refetchBadges();
        },
        onError: (err) => {
          toast.error(`Claim thất bại: ${err.message}`, {
            id: `claim-${milestone}`,
          });
        },
      },
    );
  };

  return {
    resolvedMaxStreak,
    claimedMilestones,
    handleClaim,
  };
}
