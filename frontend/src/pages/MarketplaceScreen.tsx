import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { isEnokiWallet } from "@mysten/enoki";
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
  const currentWallet = useCurrentWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
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

  const isExpiredZkLoginSignature = (message: string) => {
    const normalized = message.toLowerCase();
    return (
      (normalized.includes("invalid user signature") &&
        (normalized.includes("zklogin") || normalized.includes("epoch"))) ||
      normalized.includes("zklogin expired") ||
      normalized.includes("jwk not found")
    );
  };

  const handleTxAuthExpired = (actionLabel: string, rawMessage: string) => {
    disconnectWallet();
    const isEnoki = currentWallet ? isEnokiWallet(currentWallet) : false;
    toast.error(
      isEnoki
        ? `${actionLabel} thất bại: phiên zkLogin đã hết hạn. Vui lòng đăng nhập social lại để ký giao dịch mới.`
        : `${actionLabel} thất bại: chữ ký ví không hợp lệ. Vui lòng kết nối ví lại.`,
      { duration: 8000 },
    );
    navigate(`/login?next=${encodeURIComponent("/marketplace")}`, {
      replace: true,
      state: { reason: "tx-auth-expired", message: rawMessage },
    });
  };

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
          const message = String(err?.message ?? err);
          if (isExpiredZkLoginSignature(message)) {
            toast.dismiss("buy");
            handleTxAuthExpired("Mua", message);
            return;
          }
          toast.error(`Mua thất bại: ${message}`, { id: "buy" });
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
          const message = String(err?.message ?? err);
          if (isExpiredZkLoginSignature(message)) {
            toast.dismiss("list");
            handleTxAuthExpired("List", message);
            return;
          }
          toast.error(`List thất bại: ${message}`, { id: "list" });
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
          const message = String(err?.message ?? err);
          if (isExpiredZkLoginSignature(message)) {
            toast.dismiss("cancel");
            handleTxAuthExpired("Hủy listing", message);
            return;
          }
          toast.error(`Hủy thất bại: ${message}`, { id: "cancel" });
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
