import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnedNFTs, type CuonChunNFT } from "@/hooks/useOwnedNFTs";
import { useRedeemChunFlow } from "@/hooks/useRedeemChunFlow";
import { useRecycleFusionFlow } from "@/hooks/useRecycleFusionFlow";
import { useGame } from "@/providers/GameContext";
import PageHeader from "@/components/common/PageHeader";
import RefreshButton from "@/components/common/RefreshButton";
import {
  InventoryNftSection,
  InventoryScrapSection,
  InventoryBadgeSection,
  InventoryEmptyState,
  InventoryLoadingSkeleton,
  type TierFilter,
} from "@/components/inventory";

export default function InventoryScreen() {
  const navigate = useNavigate();
  const { playerData } = useGame();
  const handleBack = () => navigate("/dashboard");
  const handleOpenMarketplace = () => navigate("/marketplace");
  const handleOpenTradeUp = () => navigate("/trade-up");

  const { cuonChuns, scraps, badges, loading, refetch } = useOwnedNFTs();
  const {
    treasuryConfigured,
    treasurySyncing,
    handleRedeem,
    getRedeemLabel,
    getRedeemPreview,
    isRedeeming,
    refreshTreasury,
  } = useRedeemChunFlow(() => {
    refetch();
  });

  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const {
    recycleNft,
    recycleScrap,
    fuseFirstTwentyScraps,
    busyNftId,
    busyScrapId,
    fusing,
  } = useRecycleFusionFlow(playerData?.objectId, () => {
    refetch();
  });

  const filteredNFTs =
    tierFilter === "all"
      ? cuonChuns
      : cuonChuns.filter((n) => n.tier === tierFilter);
  const totalItems = cuonChuns.length + scraps.length + badges.length;

  const handleRefresh = () => {
    refetch();
    void refreshTreasury();
  };

  const handleRedeemNFT = (nft: CuonChunNFT) => {
    void handleRedeem(nft);
  };

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <PageHeader
          onBack={handleBack}
          title="Kho Do"
          emoji="🎒"
          subtitle={`${totalItems} vat pham`}
          backBorderClass="border-playful-blue"
          backIconClass="text-playful-blue"
          rightSlot={
            <RefreshButton
              onClick={handleRefresh}
              loading={loading || treasurySyncing}
            />
          }
        />

        {loading && totalItems === 0 ? (
          <InventoryLoadingSkeleton />
        ) : totalItems === 0 ? (
          <InventoryEmptyState />
        ) : (
          <div className="space-y-10">
            <InventoryNftSection
              cuonChuns={cuonChuns}
              filteredNFTs={filteredNFTs}
              tierFilter={tierFilter}
              setTierFilter={setTierFilter}
              onOpenMarketplace={handleOpenMarketplace}
              onOpenTradeUp={handleOpenTradeUp}
              onRedeem={handleRedeemNFT}
              onRecycleNft={recycleNft}
              isRecyclingNft={(objectId) => busyNftId === objectId}
              isRedeeming={isRedeeming}
              getRedeemLabel={getRedeemLabel}
              isRedeemDisabled={(tier) =>
                !treasuryConfigured || !getRedeemPreview(tier).canRedeem
              }
              getRedeemDisabledReason={(tier) => getRedeemPreview(tier).reason}
            />

            <InventoryScrapSection
              scraps={scraps}
              onRecycleScrap={recycleScrap}
              onFuseScraps={fuseFirstTwentyScraps}
              fusing={fusing}
              recyclingScrapId={busyScrapId}
            />

            <InventoryBadgeSection badges={badges} />
          </div>
        )}
      </div>
    </div>
  );
}
