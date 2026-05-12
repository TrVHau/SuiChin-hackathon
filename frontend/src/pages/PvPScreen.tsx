import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Landmark,
  Search,
  ShieldCheck,
  Swords,
  Users,
  Wallet,
} from "lucide-react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import PageHeader from "@/components/common/PageHeader";
import { useGame } from "@/providers/GameContext";
import { usePvP, type BettingTier, type ValuationNft } from "@/hooks/usePvP";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import {
  buildCancelValuationLobbyRoomTx,
  buildCreateValuationLobbyRoomTx,
  buildEmergencyRefundValuationLobbyRoomTx,
  buildJoinValuationLobbyRoomTx,
  buildSettleValuationLobbyRoomTx,
} from "@/lib/sui-client";
import {
  PvpMatchedCard,
  PvpPlayingCard,
  PvpResolvedCard,
  PvpSearchingCard,
} from "@/components/pvp";
import {
  LOBBY_CONFIG_OBJECT_ID,
  LOBBY_DEFAULT_TARGET_POINTS,
  LOBBY_PACKAGE_ID,
} from "@/config/sui.config";

const BETTING_LOBBIES: Array<{
  id: BettingTier;
  name: string;
  targetPoints: number;
  requiredNftTier: 1 | 2 | 3;
  requiredNftLabel: string;
  nftRule: string;
  audience: string;
}> = [
  {
    id: "0_5_SUI",
    name: "Binh dan",
    targetPoints: 100,
    requiredNftTier: 1,
    requiredNftLabel: "Dong",
    nftRule: "01 NFT Dong",
    audience: "Nguoi moi bat dau",
  },
  {
    id: "1_SUI",
    name: "Trung luu",
    targetPoints: 250,
    requiredNftTier: 2,
    requiredNftLabel: "Bac",
    nftRule: "01 NFT Bac",
    audience: "Nguoi choi co kinh nghiem",
  },
  {
    id: "2_SUI",
    name: "Dai gia",
    targetPoints: 1000,
    requiredNftTier: 3,
    requiredNftLabel: "Vang",
    nftRule: "01 NFT Vang",
    audience: "Whale / nha dau tu lon",
  },
];

function resolveNftImage(nft: { image_url?: string; tier: number; variant?: number }) {
  if (nft.image_url) return nft.image_url;
  const tier = Math.min(3, Math.max(1, Number(nft.tier) || 1));
  const variant = Math.min(4, Math.max(1, Number(nft.variant) || 1));
  return `/nft/tier${tier}_v${variant}.png`;
}

export default function PvPScreen() {
  const navigate = useNavigate();
  const { account, playerData, profile } = useGame();
  const {
    pvp,
    connectRoomSocket,
    disconnectRoomSocket,
    notifyRoomCreated,
    notifyRoomJoined,
    // legacy aliases still available on hook: joinQueue, leaveQueue
    submitShot,
    reportRound,
    setSettleTx,
  } = usePvP(profile?.objectId);

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { cuonChuns } = useOwnedNFTs();
  const [selectedBetTier, setSelectedBetTier] =
    useState<BettingTier>("0_5_SUI");
  const [selectedLobbyNfts, setSelectedLobbyNfts] = useState<string[]>([]);
  const [escrowTargetPoints, setEscrowTargetPoints] = useState(
    LOBBY_DEFAULT_TARGET_POINTS,
  );
  const [escrowDeadlineMinutes] = useState(30);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [escrowSubmitting, setEscrowSubmitting] = useState(false);
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [roomStatus, setRoomStatus] = useState<number | null>(null);
  const [roomDeadlineMs, setRoomDeadlineMs] = useState<number | null>(null);
  const [roomCreator, setRoomCreator] = useState<string | null>(null);
  const [emergencyRefundDelayMs, setEmergencyRefundDelayMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeLobbySigner, setActiveLobbySigner] = useState<number[] | null>(
    null,
  );
  const [signerState, setSignerState] = useState<
    "loading" | "ready" | "missing" | "error"
  >("loading");

  const handleBack = () => navigate("/dashboard");
  const sameAddress = (a?: string | null, b?: string | null) =>
    Boolean(a && b && a.toLowerCase() === b.toLowerCase());
  const selectedBettingLobby =
    BETTING_LOBBIES.find((lobby) => lobby.id === selectedBetTier) ??
    BETTING_LOBBIES[0];
  const eligibleLobbyNfts = cuonChuns.filter(
    (item) => item.tier === selectedBettingLobby.requiredNftTier,
  );
  const selectedLobbyNft = cuonChuns.find(
    (item) => item.objectId === selectedLobbyNfts[0],
  );

  const toValuationNft = (nft: typeof selectedLobbyNft): ValuationNft | null =>
    nft
      ? {
          id: nft.objectId,
          name: nft.name || "Cuon Chun",
          tier: nft.tier,
          imageUrl: nft.image_url,
        }
      : null;

  const validateSelectedLobbyNfts = (): boolean => {
    const ownedIds = new Set(cuonChuns.map((item) => item.objectId));
    const invalid = selectedLobbyNfts.filter((id) => !ownedIds.has(id));

    if (invalid.length === 0) {
      return true;
    }

    setSelectedLobbyNfts((prev) => prev.filter((id) => ownedIds.has(id)));
    toast.error(
      "Một số NFT đã không còn thuộc ví hiện tại (có thể đang bị khóa escrow). Hãy chọn lại NFT.",
    );
    return false;
  };

  const cancelLobbyRoomTx = async (roomId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const tx = buildCancelValuationLobbyRoomTx(roomId);
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            setCreatedRoomId(null);
            setJoinRoomId("");
            toast.success("Đã hủy phòng escrow on-chain và hoàn tài sản.", {
              id: "lobby-cancel",
            });
            resolve(true);
          },
          onError: (error) => {
            const message = String(error?.message ?? error);
            if (message.includes("702")) {
              toast.error(
                "Room không còn ở trạng thái WAITING nên không thể hủy.",
                {
                  id: "lobby-cancel",
                },
              );
              resolve(false);
              return;
            }
            if (message.includes("704")) {
              toast.error("Chỉ creator của room mới có quyền hủy.", {
                id: "lobby-cancel",
              });
              resolve(false);
              return;
            }
            toast.error(`Hủy phòng thất bại: ${message}`, {
              id: "lobby-cancel",
            });
            resolve(false);
          },
        },
      );
    });
  };

  const handleLeave = async () => {
    if (createdRoomId) {
      if (roomStatus == null) {
        toast.error(
          "Đang đọc trạng thái room on-chain, vui lòng thử lại sau 2-3 giây.",
        );
        return;
      }

      if (roomStatus === 0) {
        if (!sameAddress(roomCreator, account?.address)) {
          toast.error(
            "Chỉ creator mới có thể hủy room WAITING để hoàn tài sản.",
          );
          return;
        }

        setEscrowSubmitting(true);
        toast.loading("Đang hủy room escrow trước khi thoát...", {
          id: "lobby-cancel",
        });
        const cancelled = await cancelLobbyRoomTx(createdRoomId);
        setEscrowSubmitting(false);
        if (!cancelled) {
          return;
        }
      } else if (roomStatus === 1) {
        toast.error(
          "Room đang ACTIVE. Không thể thoát an toàn lúc này. Hãy settle hoặc đợi emergency refund để tránh kẹt tài sản.",
        );
        return;
      }
    }

    disconnectRoomSocket();
    navigate("/dashboard");
  };

  const selectedLobbyNFTPoints = useMemo(
    () =>
      selectedLobbyNfts.reduce((total, nftId) => {
        const nft = cuonChuns.find((item) => item.objectId === nftId);
        if (!nft) return total;
        if (nft.tier === 3) return total + 1000;
        if (nft.tier === 2) return total + 250;
        return total + 100;
      }, 0),
    [cuonChuns, selectedLobbyNfts],
  );
  const estimatedLobbyTotalPoints = selectedLobbyNFTPoints;

  useEffect(() => {
    const ownedIds = new Set(cuonChuns.map((item) => item.objectId));
    setSelectedLobbyNfts((prev) => prev.filter((id) => ownedIds.has(id)));
  }, [cuonChuns]);

  useEffect(() => {
    setSelectedLobbyNfts([]);
  }, [account?.address]);

  useEffect(() => {
    setEscrowTargetPoints(selectedBettingLobby.targetPoints);
    setSelectedLobbyNfts((prev) => {
      const selectedId = prev[0];
      if (!selectedId) return [];
      const stillEligible = cuonChuns.some(
        (item) =>
          item.objectId === selectedId &&
          item.tier === selectedBettingLobby.requiredNftTier,
      );
      return stillEligible ? prev : [];
    });
  }, [
    cuonChuns,
    selectedBettingLobby.requiredNftTier,
    selectedBettingLobby.targetPoints,
  ]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSigner = async () => {
      try {
        const obj = await suiClient.getObject({
          id: LOBBY_CONFIG_OBJECT_ID,
          options: { showContent: true },
        });

        const fields = (
          obj.data?.content as { fields?: Record<string, unknown> } | undefined
        )?.fields;

        const collectByteVectors = (value: unknown): number[][] => {
          if (Array.isArray(value)) {
            if (
              value.length > 0 &&
              value.every((item) => typeof item === "number")
            ) {
              return [value as number[]];
            }
            return value.flatMap((item) => collectByteVectors(item));
          }

          if (value && typeof value === "object") {
            const record = value as Record<string, unknown>;
            if ("fields" in record) return collectByteVectors(record.fields);
            if ("value" in record) return collectByteVectors(record.value);
            if ("vec" in record) return collectByteVectors(record.vec);
            return Object.values(record).flatMap((item) =>
              collectByteVectors(item),
            );
          }

          return [];
        };

        const signers = collectByteVectors(fields?.active_signer_pubkeys);
        if (!cancelled) {
          setActiveLobbySigner(signers[0] ?? null);
          setEmergencyRefundDelayMs(
            Number(fields?.emergency_refund_delay_ms ?? 0),
          );
          setSignerState(signers.length > 0 ? "ready" : "missing");
        }
      } catch (error) {
        console.warn("Unable to load active signer from LobbyConfig", error);
        if (!cancelled) {
          setActiveLobbySigner(null);
          setSignerState("error");
        }
      }
    };

    void loadSigner();

    return () => {
      cancelled = true;
    };
  }, [suiClient]);

  useEffect(() => {
    if (!createdRoomId) {
      setRoomStatus(null);
      setRoomDeadlineMs(null);
      setRoomCreator(null);
      return;
    }

    let disposed = false;

    const loadRoom = async () => {
      try {
        const roomObject = await suiClient.getObject({
          id: createdRoomId,
          options: { showContent: true },
        });

        const fields = (
          roomObject.data?.content as
            | { fields?: Record<string, unknown> }
            | undefined
        )?.fields;

        if (!disposed && fields) {
          setRoomStatus(Number(fields.status ?? 0));
          setRoomDeadlineMs(Number(fields.deadline_ms ?? 0));
          setRoomCreator(
            typeof fields.creator === "string" ? fields.creator : null,
          );
        }
      } catch {
        if (!disposed) {
          setRoomStatus(null);
          setRoomDeadlineMs(null);
          setRoomCreator(null);
        }
      }
    };

    void loadRoom();
    const intervalId = window.setInterval(() => {
      void loadRoom();
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [createdRoomId, suiClient]);

  const joinBettingQueue = () => {
    if (!account?.address) {
      toast.error("Vui long ket noi vi truoc.");
      return;
    }

    const nft = toValuationNft(selectedLobbyNft);
    if (!nft) {
      toast.error(`Chon 01 NFT ${selectedBettingLobby.requiredNftLabel} de vao sanh nay.`);
      return;
    }
    if (nft.tier !== selectedBettingLobby.requiredNftTier) {
      toast.error(
        `Sanh ${selectedBettingLobby.name} chi chap nhan NFT ${selectedBettingLobby.requiredNftLabel}.`,
      );
      return;
    }

    connectRoomSocket(0, undefined, {
      tier: selectedBettingLobby.id,
      nft,
    });
  };
  const toggleLobbyNft = (nftId: string) => {
    const nft = cuonChuns.find((item) => item.objectId === nftId);
    if (!nft || nft.tier !== selectedBettingLobby.requiredNftTier) {
      toast.error(
        `Sanh ${selectedBettingLobby.name} chi chap nhan NFT ${selectedBettingLobby.requiredNftLabel}.`,
      );
      return;
    }
    setSelectedLobbyNfts((prev) =>
      prev.includes(nftId) ? [] : [nftId],
    );
  };

  const parseRoomEvent = async (digest: string, eventType: string) => {
    const txBlock = await suiClient.getTransactionBlock({
      digest,
      options: { showEvents: true, showEffects: true, showObjectChanges: true },
    });

    const event = txBlock.events?.find((item) => item.type === eventType);
    return event?.parsedJson as Record<string, unknown> | undefined;
  };

  const createLobbyRoom = async () => {
    if (escrowSubmitting) return;
    if (!account?.address) {
      toast.error("Vui lòng kết nối ví trước.");
      return;
    }
    if (!LOBBY_CONFIG_OBJECT_ID) {
      toast.error("Chưa cấu hình LOBBY_CONFIG_OBJECT_ID.");
      return;
    }
    if (signerState === "loading") {
      toast.error(
        "Đang tải dữ liệu signer từ LobbyConfig. Vui lòng thử lại sau.",
      );
      return;
    }
    if (signerState === "missing") {
      toast.error(
        "LobbyConfig chưa có active signer on-chain. Cần add signer một lần bằng admin cap trước khi tạo room.",
      );
      return;
    }
    if (signerState === "error" || !activeLobbySigner) {
      toast.error("Không đọc được active signer từ LobbyConfig.");
      return;
    }
    if (pvp.role && pvp.role !== "CREATOR") {
      toast.error("Ban khong phai nguoi duoc dat cuoc truoc trong cap dau nay.");
      return;
    }

    const lockedNftIds = pvp.myNft?.id ? [pvp.myNft.id] : selectedLobbyNfts;
    if (lockedNftIds.length === 0) {
      toast.error("Chọn ít nhất một NFT để khóa vào phòng.");
      return;
    }
    if (!validateSelectedLobbyNfts()) {
      return;
    }
    if (estimatedLobbyTotalPoints < escrowTargetPoints) {
      toast.error(
        `Tổng điểm hiện tại ${estimatedLobbyTotalPoints} chưa đủ target ${escrowTargetPoints}.`,
      );
      return;
    }

    setEscrowSubmitting(true);
    toast.loading("Đang tạo phòng escrow on-chain...", { id: "lobby-escrow" });

    const deadlineMs = BigInt(Date.now() + escrowDeadlineMinutes * 60_000);
    const tx = buildCreateValuationLobbyRoomTx({
      nftIds: lockedNftIds,
      targetPoints: pvp.betTier ? selectedBettingLobby.targetPoints : escrowTargetPoints,
      deadlineMs,
      signerPubkey: activeLobbySigner ?? undefined,
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          try {
            const parsed = await parseRoomEvent(
              result.digest,
              `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::RoomCreated`,
            );
            const roomId = String(parsed?.room_id ?? "");
            setCreatedRoomId(roomId || null);
            if (roomId) {
              setJoinRoomId(roomId);
              setSelectedLobbyNfts([]);
              notifyRoomCreated(roomId);
            }
            toast.success(
              roomId
                ? `Đã tạo phòng escrow on-chain: ${roomId.slice(0, 16)}...`
                : "Đã tạo phòng escrow on-chain.",
              { id: "lobby-escrow" },
            );
          } catch (error) {
            console.error(error);
            toast.success("Đã gửi tx tạo phòng escrow on-chain.", {
              id: "lobby-escrow",
            });
          }
          setEscrowSubmitting(false);
        },
        onError: (error) => {
          toast.error(
            `Tạo phòng escrow thất bại: ${String(error?.message ?? error)}`,
            {
              id: "lobby-escrow",
            },
          );
          setEscrowSubmitting(false);
        },
      },
    );
  };

  const joinLobbyRoom = async () => {
    if (escrowSubmitting) return;
    const targetRoomId = pvp.roomId ?? joinRoomId.trim();
    if (!targetRoomId) {
      toast.error("Nhập Room ID để join.");
      return;
    }
    if (pvp.role && pvp.role !== "JOINER") {
      toast.error("Ban khong phai nguoi duoc dat cuoc sau trong cap dau nay.");
      return;
    }

    const lockedNftIds = pvp.myNft?.id ? [pvp.myNft.id] : selectedLobbyNfts;
    if (lockedNftIds.length === 0) {
      toast.error("Chọn NFT để join phòng.");
      return;
    }
    if (!validateSelectedLobbyNfts()) {
      return;
    }

    setEscrowSubmitting(true);
    toast.loading("Đang join phòng escrow on-chain...", { id: "lobby-join" });

    const tx = buildJoinValuationLobbyRoomTx({
      roomId: targetRoomId,
      nftIds: lockedNftIds,
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          try {
            const parsed = await parseRoomEvent(
              result.digest,
              `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::RoomJoined`,
            );
            const joinedRoomId = String(parsed?.room_id ?? targetRoomId);
            if (joinedRoomId) {
              setCreatedRoomId(joinedRoomId);
              setJoinRoomId(joinedRoomId);
              setSelectedLobbyNfts([]);
              notifyRoomJoined(joinedRoomId);
            }
            toast.success(
              parsed?.room_id
                ? `Đã join phòng escrow: ${String(parsed.room_id).slice(0, 16)}...`
                : "Đã join phòng escrow on-chain.",
              { id: "lobby-join" },
            );
          } catch (error) {
            console.error(error);
            toast.success("Đã gửi tx join phòng escrow on-chain.", {
              id: "lobby-join",
            });
          }
          setEscrowSubmitting(false);
        },
        onError: (error) => {
          toast.error(
            `Join phòng escrow thất bại: ${String(error?.message ?? error)}`,
            {
              id: "lobby-join",
            },
          );
          setEscrowSubmitting(false);
        },
      },
    );
  };

  const cancelLobbyRoom = async () => {
    if (!createdRoomId) {
      toast.error("Không có room on-chain để hủy.");
      return;
    }

    if (roomStatus !== 0) {
      toast.error("Chỉ hủy được room ở trạng thái WAITING.");
      return;
    }
    if (!sameAddress(roomCreator, account?.address)) {
      toast.error("Chỉ creator mới được hủy room WAITING.");
      return;
    }

    setEscrowSubmitting(true);
    toast.loading("Đang hủy phòng escrow...", { id: "lobby-cancel" });
    await cancelLobbyRoomTx(createdRoomId);
    setEscrowSubmitting(false);
  };

  const isMe = (address: string) =>
    Boolean(account?.address && address === account.address);

  const settleOnChain = async () => {
    const payload = pvp.settlementPayload;
    if (!payload) {
      toast.error("Backend chưa cung cấp settlement payload.");
      return;
    }
    if (!pvp.winner || !isMe(pvp.winner)) {
      toast.error("Chỉ winner mới được settle on-chain.");
      return;
    }

    setSettleSubmitting(true);
    toast.loading("Đang submit settle on-chain...", { id: "lobby-settle" });

    const tx = buildSettleValuationLobbyRoomTx({
      roomId: payload.roomId,
      winner: payload.winner,
      loser: payload.loser,
      matchDigest: payload.matchDigest,
      nonce: payload.nonce,
      deadlineMs: payload.deadlineMs,
      signature: payload.signature,
      signerPubkey: payload.signerPubkey,
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: (result) => {
          setSettleTx(result.digest);
          toast.success("Settle on-chain thành công.", { id: "lobby-settle" });
          setSettleSubmitting(false);
        },
        onError: (error) => {
          toast.error(
            `Settle on-chain thất bại: ${String(error?.message ?? error)}`,
            { id: "lobby-settle" },
          );
          setSettleSubmitting(false);
        },
      },
    );
  };

  const emergencyRefundOnChain = async () => {
    if (!createdRoomId) {
      toast.error("Không có room on-chain để emergency refund.");
      return;
    }

    setEscrowSubmitting(true);
    toast.loading("Đang gọi emergency refund on-chain...", {
      id: "lobby-emergency-refund",
    });

    const tx = buildEmergencyRefundValuationLobbyRoomTx(createdRoomId);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          toast.success("Emergency refund thành công. Tài sản đã hoàn về ví.", {
            id: "lobby-emergency-refund",
          });
          setEscrowSubmitting(false);
          setCreatedRoomId(null);
          setJoinRoomId("");
          setRoomStatus(null);
          setRoomDeadlineMs(null);
        },
        onError: (error) => {
          const message = String(error?.message ?? error);
          if (message.includes("714")) {
            toast.error(
              "Chưa đến thời điểm emergency refund theo config on-chain.",
              { id: "lobby-emergency-refund" },
            );
          } else if (message.includes("702")) {
            toast.error(
              "Room không ở trạng thái ACTIVE nên không thể emergency refund.",
              { id: "lobby-emergency-refund" },
            );
          } else {
            toast.error(`Emergency refund thất bại: ${message}`, {
              id: "lobby-emergency-refund",
            });
          }
          setEscrowSubmitting(false);
        },
      },
    );
  };

  const roomStatusLabel =
    roomStatus === 0
      ? "WAITING"
      : roomStatus === 1
        ? "ACTIVE"
        : roomStatus === 2
          ? "SETTLED"
          : roomStatus === 3
            ? "CANCELLED"
            : roomStatus === 4
              ? "EMERGENCY_REFUNDED"
              : "UNKNOWN";

  const emergencyRefundReadyAt =
    roomDeadlineMs && emergencyRefundDelayMs
      ? roomDeadlineMs + emergencyRefundDelayMs
      : null;
  const emergencyRefundRemainingMs = emergencyRefundReadyAt
    ? Math.max(0, emergencyRefundReadyAt - nowMs)
    : 0;
  const emergencyRefundRemainingMin = Math.ceil(
    emergencyRefundRemainingMs / 60_000,
  );

  const renderContent = () => {
    if (pvp.status === "idle" || pvp.status === "error") {
      return (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                  Step 1
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                  Chon sanh NFT de tim doi thu
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                  Ban chi can chon sanh va 1 NFT. He thong tu ghep 2 nguoi
                  cung tier, sau do moi yeu cau khoa NFT on-chain.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right">
                <p className="text-xs font-bold uppercase text-slate-300">
                  Vi cua ban
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {account?.address ? "Da ket noi" : "Chua ket noi"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid gap-3 md:grid-cols-3">
              {BETTING_LOBBIES.map((lobby) => {
                const active = selectedBetTier === lobby.id;
                return (
                  <button
                    key={lobby.id}
                    onClick={() => setSelectedBetTier(lobby.id)}
                    data-testid={`pvp-tier-${lobby.id}-button`}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      active
                        ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                        : "border-slate-200 bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-black text-slate-950">
                        {lobby.name}
                      </p>
                      {active && (
                        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                      )}
                    </div>
                    <p className="mt-2 text-3xl font-black text-emerald-700">
                      {lobby.requiredNftLabel}
                    </p>
                    <p className="mt-3 text-xs font-bold uppercase text-slate-500">
                      {lobby.nftRule}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {lobby.audience}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Step 2
                  </p>
                  <h4 className="text-xl font-black text-slate-950">
                    Chon 1 NFT {selectedBettingLobby.requiredNftLabel} de vao tran
                  </h4>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                  {eligibleLobbyNfts.length} NFT hop le
                </span>
              </div>

              <div className="grid max-h-[440px] gap-3 overflow-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {eligibleLobbyNfts.map((nft) => {
                  const selected = selectedLobbyNfts.includes(nft.objectId);
                  return (
                    <button
                      key={nft.objectId}
                      onClick={() => toggleLobbyNft(nft.objectId)}
                      className={`relative overflow-hidden rounded-2xl border-2 bg-white p-3 text-left transition-all ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                          : "border-slate-200 bg-white hover:border-emerald-300"
                      }`}
                    >
                      {selected && (
                        <CheckCircle2 className="absolute right-4 top-4 z-10 size-6 rounded-full bg-white text-emerald-600" />
                      )}
                      <img
                        src={resolveNftImage(nft)}
                        alt={nft.name || "Cuon Chun"}
                        onError={(event) => {
                          event.currentTarget.src = "/nft/tier1_v1.png";
                        }}
                        className="mb-3 aspect-square w-full rounded-xl bg-slate-100 object-cover"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate font-black text-slate-950">
                          {nft.name || "Cuon Chun"}
                        </p>
                        <span className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-600">
                          Tier {nft.tier}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {eligibleLobbyNfts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                    Ban chua co NFT {selectedBettingLobby.requiredNftLabel} phu hop voi sanh nay.
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={joinBettingQueue}
              data-testid="pvp-join-tier-queue-button"
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-black text-white shadow-xl shadow-emerald-100 transition-colors hover:bg-emerald-700 disabled:opacity-50"
              disabled={!selectedLobbyNft || !account?.address}
            >
              <Search className="size-5" />
              Tim tran sanh {selectedBettingLobby.requiredNftLabel}
            </button>
          </div>
        </div>
      );
    }
    if (pvp.status === "connecting" || pvp.status === "waiting") {
      return (
        <PvpSearchingCard
          roomValue={selectedBettingLobby.requiredNftLabel}
          onCancel={handleLeave}
          roomId={createdRoomId ?? (joinRoomId.trim() || undefined)}
        />
      );
    }

    if (pvp.status === "awaiting_deposit") {
      const isCreator = pvp.role === "CREATOR";
      const roomReadyForJoiner = Boolean(pvp.roomId);
      return (
        <div className="overflow-hidden rounded-[28px] border border-emerald-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
          <div className="border-b border-emerald-200 bg-emerald-950 px-6 py-5 text-white md:px-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
              Step 3 - AWAITING_DEPOSIT
            </p>
            <h3 className="mt-2 text-2xl font-black md:text-3xl">
              Da tim thay doi thu
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-emerald-100/80">
              Bay gio moi nguoi khoa 1 NFT cung tier. Phan
              escrow on-chain duoc xu ly tu dong theo vai tro cua ban.
            </p>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Tai san khoa
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  NFT {selectedBettingLobby.requiredNftLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Vai tro
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {pvp.role === "CREATOR" ? "Nguoi 1" : "Nguoi 2"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  Trang thai
                </p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  Cho khoa tai san
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  NFT cua ban
                </p>
                <p className="mt-2 font-black text-slate-950">
                  {pvp.myNft?.name ?? "-"}
                </p>
                <p className="mt-1 break-all text-xs font-semibold text-slate-400">
                  {pvp.myNft?.id}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  NFT doi thu
                </p>
                <p className="mt-2 font-black text-slate-950">
                  {pvp.opponentNft?.name ?? "-"}
                </p>
                <p className="mt-1 break-all text-xs font-semibold text-slate-400">
                  {pvp.opponentNft?.id}
                </p>
              </div>
            </div>

            <button
              onClick={isCreator ? createLobbyRoom : joinLobbyRoom}
              disabled={escrowSubmitting || (!isCreator && !roomReadyForJoiner)}
              data-testid="pvp-lock-assets-button"
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-black text-white shadow-xl shadow-emerald-100 transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <Wallet className="size-5" />
              {isCreator
                ? "Khoa NFT vao escrow"
                : roomReadyForJoiner
                  ? "Khoa NFT vao escrow"
                  : "Dang chuan bi escrow cho ban..."}
            </button>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">
              Sau khi ca hai ben khoa tai san thanh cong, indexer se bat event
              on-chain va tran tu dong chuyen sang man hinh ban chun.
            </div>
          </div>
        </div>
      );
    }

    if (pvp.status === "matched") {
      return <PvpMatchedCard opponent={pvp.opponent} submitting={false} />;
    }

    if (pvp.status === "submitting") {
      return <PvpMatchedCard opponent={pvp.opponent} submitting />;
    }

    if (pvp.status === "playing") {
      return (
        <PvpPlayingCard
          pvp={pvp}
          myAddress={account?.address}
          onSubmitShot={submitShot}
          onReportResult={reportRound}
        />
      );
    }

    if (pvp.status === "resolved") {
      return (
        <PvpResolvedCard
          pvp={pvp}
          isMe={isMe}
          onBack={handleLeave}
          onSettle={settleOnChain}
          settling={settleSubmitting}
          settleDisabled={settleSubmitting || Boolean(pvp.settleTx)}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen pb-20 relative bg-[radial-gradient(circle_at_10%_20%,#fff4d6,transparent_40%),radial-gradient(circle_at_90%_0%,#d7f7f0,transparent_35%),linear-gradient(145deg,#fffdf6_0%,#fff4c9_45%,#ffe3c2_100%)]">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <PageHeader
          title="PvP Arena"
          emoji="⚔️"
          subtitle="PvP ban chun realtime + escrow on-chain cho NFT cung tier"
          onBack={handleBack}
          backBorderClass="border-red-300"
          backIconClass="text-red-500"
          rightSlot={
            <button
              onClick={handleLeave}
              className="bg-white border-4 border-gray-200 rounded-full px-5 py-3 font-bold text-gray-700 shadow-lg hover:border-red-300 hover:text-red-600 transition-colors"
            >
              Thoát phòng
            </button>
          }
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-20">
        <div className="hidden">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 px-4 py-3">
              <p className="text-xs font-bold tracking-wider uppercase text-amber-700">
                Trạng thái
              </p>
              <p className="text-lg font-black text-amber-950 capitalize">
                {pvp.status}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 border border-teal-200 px-4 py-3">
              <p className="text-xs font-bold tracking-wider uppercase text-teal-800">
                Room escrow
              </p>
              <p className="text-xs font-black text-teal-950 break-all">
                {createdRoomId ?? (joinRoomId.trim() || "Chưa chọn")}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 border border-sky-200 px-4 py-3">
              <p className="text-xs font-bold tracking-wider uppercase text-sky-800">
                Đối thủ
              </p>
              <p className="text-xs font-black text-sky-950 break-all">
                {pvp.opponent ?? "Đang chờ"}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 border border-rose-200 px-4 py-3">
              <p className="text-xs font-bold tracking-wider uppercase text-rose-800">
                Settlement
              </p>
              <p className="text-xs font-black text-rose-950 break-all">
                {pvp.settleTx ? "On-chain done" : "Chưa settle"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur rounded-[32px] border border-red-200 shadow-[0_20px_50px_rgba(239,68,68,0.12)] p-6 md:p-8">
              <div className="hidden">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-100 border border-red-200 px-4 py-2 text-sm font-bold text-red-700">
                  <Swords className="size-4" />
                  Realtime PvP
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 border border-emerald-200 px-4 py-2 text-sm font-bold text-emerald-700">
                  <Landmark className="size-4" />
                  Escrow + settle on-chain
                </span>
              </div>

              {renderContent()}

              {createdRoomId && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-emerald-700">
                        Escrow
                      </p>
                      <p className="mt-1 text-sm font-bold text-emerald-950">
                        {roomStatusLabel}
                      </p>
                    </div>
                    {roomStatus === 0 &&
                      sameAddress(roomCreator, account?.address) && (
                        <button
                          onClick={cancelLobbyRoom}
                          className="rounded-full border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700"
                        >
                          Huy dat cuoc
                        </button>
                      )}
                    {roomStatus === 1 && (
                      <button
                        onClick={emergencyRefundOnChain}
                        disabled={
                          escrowSubmitting ||
                          Boolean(
                            emergencyRefundReadyAt &&
                              emergencyRefundRemainingMs > 0,
                          )
                        }
                        className="rounded-full border-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 disabled:opacity-60"
                      >
                        {emergencyRefundReadyAt &&
                        emergencyRefundRemainingMs > 0
                          ? `Emergency refund sau ${emergencyRefundRemainingMin} phut`
                          : "Emergency refund"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(pvp.status === "playing" || pvp.status === "submitting") && (
              <div className="hidden">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="size-5 text-sky-600" />
                  <h3 className="font-black text-lg text-gray-900">
                    Luồng realtime hiện tại
                  </h3>
                </div>
                <p className="text-sm text-gray-700 font-medium leading-6">
                  Kéo và thả trên bàn chơi để gửi cú búng. Khi kết thúc round,
                  client gửi kết quả lên backend qua socket, backend finalize và
                  trả về tx digest nếu settle thành công.
                </p>
              </div>
            )}
          </div>

          <aside className="hidden">
            <div className="bg-white/90 backdrop-blur rounded-[28px] border border-sky-200 shadow-[0_18px_40px_rgba(14,116,144,0.14)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <Users className="size-6 text-playful-blue" />
                <h3 className="font-black text-2xl text-gray-900">
                  Hồ sơ đấu PvP
                </h3>
              </div>

              <div className="space-y-3 text-sm font-semibold text-gray-700">
                <p>
                  Chun Raw:{" "}
                  <span className="font-black text-gray-900">
                    {playerData?.chun_raw ?? 0}
                  </span>
                </p>
                <p>
                  NFT Cuộn Chun:{" "}
                  <span className="font-black text-gray-900">
                    {cuonChuns.length}
                  </span>
                </p>
                <p>
                  Profile:{" "}
                  <span className="font-black text-gray-900 break-all">
                    {profile?.objectId ?? "Chưa có"}
                  </span>
                </p>
                <p>
                  Wallet:{" "}
                  <span className="font-black text-gray-900 break-all">
                    {account?.address ?? "Chưa kết nối"}
                  </span>
                </p>
              </div>

              <div className="mt-5 rounded-3xl bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-200 p-4">
                <p className="text-xs font-bold text-sky-700 uppercase mb-1">
                  Ghi chú
                </p>
                <p className="text-sm text-sky-900 font-semibold leading-6">
                  PvP hien dung realtime socket cho ghep tran va gui cu ban.
                  Escrow lobby chi khoa NFT cung tier, con thang thua lay tu ket
                  qua ban chun. Active signer duoc doc tu LobbyConfig on-chain,
                  khong can thao tac admin tren UI nua.
                </p>
                <p className="mt-2 text-xs font-black text-sky-700 break-all">
                  Active signer state: {signerState}
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-[28px] border border-emerald-200 shadow-[0_18px_40px_rgba(16,185,129,0.16)] p-6">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="size-6 text-emerald-600" />
                <h3 className="font-black text-2xl text-gray-900">
                  Cach choi
                </h3>
              </div>
              <div className="space-y-3">
                {[
                  ["1", "Chon sanh", "Moi sanh yeu cau NFT cung tier: Dong, Bac hoac Vang."],
                  ["2", "Chon NFT", "NFT nay se duoc khoa vao escrow."],
                  ["3", "Tim tran", "Backend chi ghep nguoi choi trong cung sanh NFT."],
                  ["4", "Khoa NFT", "Sau khi match, moi ben bam 1 nut de khoa NFT on-chain."],
                  ["5", "Ban chun", "Hai ben thi dau ban chun realtime va bao ket qua tran."],
                  ["6", "Nhan thuong", "Backend ky winner tu ket qua tran de claim escrow on-chain."],
                ].map(([step, title, copy]) => (
                  <div
                    key={step}
                    className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-black text-white">
                      {step}
                    </span>
                    <div>
                      <p className="font-black text-gray-950">{title}</p>
                      <p className="text-sm font-semibold leading-5 text-gray-600">
                        {copy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-black uppercase text-emerald-700">
                  On-chain status
                </p>
                <p className="mt-1 text-sm font-bold text-emerald-950">
                  {createdRoomId
                    ? `Escrow ${roomStatusLabel}`
                    : signerState === "ready"
                      ? "San sang khoa tai san"
                      : "Dang tai cau hinh escrow"}
                </p>
                {createdRoomId &&
                  roomStatus === 0 &&
                  sameAddress(roomCreator, account?.address) && (
                    <button
                      onClick={cancelLobbyRoom}
                      className="mt-3 rounded-full border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700"
                    >
                      Huy dat cuoc
                    </button>
                  )}
                {createdRoomId && roomStatus === 1 && (
                  <button
                    onClick={emergencyRefundOnChain}
                    disabled={
                      escrowSubmitting ||
                      Boolean(
                        emergencyRefundReadyAt &&
                          emergencyRefundRemainingMs > 0,
                      )
                    }
                    className="mt-3 rounded-full border-2 border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800 disabled:opacity-60"
                  >
                    {emergencyRefundReadyAt && emergencyRefundRemainingMs > 0
                      ? `Emergency refund sau ${emergencyRefundRemainingMin} phut`
                      : "Emergency refund"}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-[28px] border border-gray-200 shadow-xl p-6">
              <h3 className="font-black text-xl text-gray-900 mb-3">
                Danh sách Chun của bạn
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Dùng để kiểm tra inventory trước khi vào trận.
              </p>
              <div className="space-y-3 max-h-72 overflow-auto pr-1">
                {cuonChuns.slice(0, 6).map((nft) => (
                  <div
                    key={nft.objectId}
                    className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-bold text-gray-900">
                        {nft.name || "Cuộn Chun"}
                      </p>
                      <p className="text-xs text-gray-500 break-all">
                        {nft.objectId}
                      </p>
                    </div>
                    <span className="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-black text-gray-700">
                      Tier {nft.tier}
                    </span>
                  </div>
                ))}
                {cuonChuns.length === 0 && (
                  <p className="text-sm text-gray-500">
                    Bạn chưa có NFT nào trong inventory.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
