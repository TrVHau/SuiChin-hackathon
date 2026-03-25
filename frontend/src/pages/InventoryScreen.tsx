import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
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
  const handleBack = () => navigate("/dashboard");
  const handleOpenMarketplace = () => navigate("/marketplace");
  const handleOpenTradeUp = () => navigate("/trade-up");
  const { cuonChuns, scraps, badges, loading, refetch } = useOwnedNFTs();
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  const filteredNFTs =
    tierFilter === "all"
      ? cuonChuns
      : cuonChuns.filter((n) => n.tier === tierFilter);

  const totalItems = cuonChuns.length + scraps.length + badges.length;

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <PageHeader
          onBack={handleBack}
          title="Kho Đồ"
          emoji="🎒"
          subtitle={`${totalItems} vật phẩm`}
          backBorderClass="border-playful-blue"
          backIconClass="text-playful-blue"
          rightSlot={<RefreshButton onClick={refetch} loading={loading} />}
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
            />

            <InventoryScrapSection scraps={scraps} />

            <InventoryBadgeSection badges={badges} />
          </div>
        )}
      </div>
    </div>
  );
}
