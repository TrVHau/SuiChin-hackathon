import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import type { CuonChunNFT } from "@/hooks/useOwnedNFTs";
import type { ListingMeta } from "@/hooks/useMarketplace";
import {
  buildListNFTTx,
  buildBuyNFTTx,
  buildCancelListingTx,
} from "@/lib/sui-client";
import { MARKET_OBJECT_ID } from "@/config/sui.config";
import PageHeader from "@/components/common/PageHeader";
import RefreshButton from "@/components/common/RefreshButton";
import {
  MarketplaceTabSwitcher,
  MarketplaceBrowseTab,
  MarketplaceSellTab,
  type MarketplaceTab,
} from "@/components/marketplace";

export default function MarketplaceScreen() {
  const navigate = useNavigate();
  const handleBack = () => navigate("/dashboard");
  const account = useCurrentAccount();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const {
    listings,
    loading: listLoading,
    refetch: refetchListings,
  } = useMarketplace();
  const {
    cuonChuns,
    loading: nftLoading,
    refetch: refetchNFTs,
  } = useOwnedNFTs();

  const [tab, setTab] = useState<MarketplaceTab>("browse");
  const [listingNFT, setListingNFT] = useState<CuonChunNFT | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myListings = listings.filter((l) => l.seller === account?.address);

  /* ─── Buy NFT ─── */
  const handleBuy = (listing: ListingMeta) => {
    if (!MARKET_OBJECT_ID) {
      toast.error("Market object chưa được cấu hình");
      return;
    }
    setSubmitting(true);
    toast.loading("Đang mua NFT...", { id: "buy" });

    const tx = buildBuyNFTTx(
      MARKET_OBJECT_ID,
      listing.listingId,
      listing.price,
    );
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setSubmitting(false);
          toast.success("Mua thành công! NFT đã về ví 🎉", { id: "buy" });
          refetchListings();
          refetchNFTs();
        },
        onError: (err) => {
          setSubmitting(false);
          toast.error(`Mua thất bại: ${err.message}`, { id: "buy" });
        },
      },
    );
  };

  /* ─── List NFT ─── */
  const handleList = () => {
    if (!listingNFT || !MARKET_OBJECT_ID) return;
    const priceSui = parseFloat(priceInput);
    if (isNaN(priceSui) || priceSui <= 0) {
      toast.error("Nhập giá hợp lệ (SUI)");
      return;
    }
    const priceMist = BigInt(Math.round(priceSui * 1_000_000_000));

    setSubmitting(true);
    toast.loading("Đang list NFT lên Marketplace...", { id: "list" });

    const tx = buildListNFTTx(MARKET_OBJECT_ID, listingNFT.objectId, priceMist);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setSubmitting(false);
          setListingNFT(null);
          setPriceInput("");
          toast.success("List NFT thành công! 🏷️", { id: "list" });
          refetchListings();
          refetchNFTs();
        },
        onError: (err) => {
          setSubmitting(false);
          toast.error(`List thất bại: ${err.message}`, { id: "list" });
        },
      },
    );
  };

  /* ─── Cancel Listing ─── */
  const handleCancel = (listing: ListingMeta) => {
    if (!MARKET_OBJECT_ID) return;
    setSubmitting(true);
    toast.loading("Đang hủy listing...", { id: "cancel" });

    const tx = buildCancelListingTx(MARKET_OBJECT_ID, listing.listingId);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setSubmitting(false);
          toast.success("Đã hủy listing, NFT về ví 👌", { id: "cancel" });
          refetchListings();
          refetchNFTs();
        },
        onError: (err) => {
          setSubmitting(false);
          toast.error(`Hủy thất bại: ${err.message}`, { id: "cancel" });
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-sunny-gradient">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <PageHeader
          onBack={handleBack}
          title="Marketplace"
          emoji="🛒"
          backBorderClass="border-playful-green"
          backIconClass="text-playful-green"
          rightSlot={
            <RefreshButton
              onClick={() => {
                refetchListings();
                refetchNFTs();
              }}
              loading={listLoading || nftLoading}
            />
          }
        />

        <MarketplaceTabSwitcher tab={tab} onChange={setTab} />

        <AnimatePresence mode="wait">
          {tab === "browse" ? (
            <MarketplaceBrowseTab
              listings={listings}
              myListings={myListings}
              listLoading={listLoading}
              submitting={submitting}
              accountAddress={account?.address}
              onCancel={handleCancel}
              onBuy={handleBuy}
            />
          ) : (
            <MarketplaceSellTab
              marketConfigured={Boolean(MARKET_OBJECT_ID)}
              nftLoading={nftLoading}
              cuonChuns={cuonChuns}
              listingNFT={listingNFT}
              setListingNFT={setListingNFT}
              priceInput={priceInput}
              setPriceInput={setPriceInput}
              submitting={submitting}
              onList={handleList}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
