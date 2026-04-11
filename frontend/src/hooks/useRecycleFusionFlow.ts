import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useState } from "react";
import { toast } from "sonner";
import {
  buildBurnNftForChunTx,
  buildFuseScrapsForBronzeTx,
  buildRecycleScrapForChunTx,
} from "@/lib/sui-client";
import type { CuonChunNFT, ScrapItem } from "@/hooks/useOwnedNFTs";

export function useRecycleFusionFlow(
  profileId: string | undefined,
  onCompleted: () => void,
) {
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const [busyNftId, setBusyNftId] = useState<string | null>(null);
  const [busyScrapId, setBusyScrapId] = useState<string | null>(null);
  const [fusing, setFusing] = useState(false);

  const recycleNft = (nft: CuonChunNFT) => {
    if (!profileId) {
      toast.error("Chua co profile de recycle NFT.");
      return;
    }
    if (busyNftId || busyScrapId || fusing) return;

    setBusyNftId(nft.objectId);
    toast.loading("Dang dot NFT de nhan Chun...", { id: "recycle-nft" });

    signAndExecute(
      { transaction: buildBurnNftForChunTx(profileId, nft.objectId) },
      {
        onSuccess: () => {
          toast.success("Recycle NFT thanh cong.", { id: "recycle-nft" });
          setBusyNftId(null);
          onCompleted();
        },
        onError: (error) => {
          toast.error(
            `Recycle NFT that bai: ${String(error?.message ?? error)}`,
            {
              id: "recycle-nft",
            },
          );
          setBusyNftId(null);
        },
      },
    );
  };

  const recycleScrap = (scrap: ScrapItem) => {
    if (!profileId) {
      toast.error("Chua co profile de recycle Scrap.");
      return;
    }
    if (busyNftId || busyScrapId || fusing) return;

    setBusyScrapId(scrap.objectId);
    toast.loading("Dang recycle Scrap...", { id: "recycle-scrap" });

    signAndExecute(
      { transaction: buildRecycleScrapForChunTx(profileId, scrap.objectId) },
      {
        onSuccess: () => {
          toast.success("Recycle Scrap thanh cong.", { id: "recycle-scrap" });
          setBusyScrapId(null);
          onCompleted();
        },
        onError: (error) => {
          toast.error(
            `Recycle Scrap that bai: ${String(error?.message ?? error)}`,
            {
              id: "recycle-scrap",
            },
          );
          setBusyScrapId(null);
        },
      },
    );
  };

  const fuseFirstTwentyScraps = (scraps: ScrapItem[]) => {
    if (fusing || busyNftId || busyScrapId) return;
    if (scraps.length < 20) {
      toast.error("Can it nhat 20 Scrap de fuse Bronze.");
      return;
    }

    const selected = scraps.slice(0, 20).map((item) => item.objectId);
    setFusing(true);
    toast.loading("Dang fuse 20 Scrap thanh Bronze NFT...", {
      id: "fuse-scrap",
    });

    signAndExecute(
      { transaction: buildFuseScrapsForBronzeTx(selected) },
      {
        onSuccess: () => {
          toast.success("Fusion thanh cong: da mint Bronze NFT.", {
            id: "fuse-scrap",
          });
          setFusing(false);
          onCompleted();
        },
        onError: (error) => {
          toast.error(`Fusion that bai: ${String(error?.message ?? error)}`, {
            id: "fuse-scrap",
          });
          setFusing(false);
        },
      },
    );
  };

  return {
    recycleNft,
    recycleScrap,
    fuseFirstTwentyScraps,
    busyNftId,
    busyScrapId,
    fusing,
  };
}
