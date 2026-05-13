import { useEffect, useMemo, useRef, useState } from "react";
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
import { bcs } from "@mysten/sui/bcs";
import { normalizeSuiAddress, toBase64 } from "@mysten/sui/utils";
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

function resolveNftImage(nft: {
  image_url?: string;
  tier: number;
  variant?: number;
}) {
  if (nft.image_url) return nft.image_url;
  const tier = Math.min(3, Math.max(1, Number(nft.tier) || 1));
  const variant = Math.min(4, Math.max(1, Number(nft.variant) || 1));
  return `/nft/tier${tier}_v${variant}.png`;
}

function resolveValuationNftImage(nft?: ValuationNft | null) {
  if (nft?.imageUrl) return nft.imageUrl;
  const tier = Math.min(3, Math.max(1, Number(nft?.tier) || 1));
  return `/nft/tier${tier}_v1.png`;
}

type LobbyRoomSnapshot = {
  status: number;
  deadlineMs: number;
  creator: string | null;
  nonce: number;
  signerPubkey: number[];
};

const SettlementMessageBcs = bcs.struct("SettlementMessage", {
  intent_scope: bcs.u8(),
  chain_id: bcs.u8(),
  package_id: bcs.Address,
  room_id: bcs.Address,
  winner: bcs.Address,
  loser: bcs.Address,
  match_digest: bcs.vector(bcs.u8()),
  nonce: bcs.u64(),
  deadline_ms: bcs.u64(),
});

function collectByteVectors(value: unknown): number[][] {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item) => typeof item === "number")) {
      return [value as number[]];
    }
    return value.flatMap((item) => collectByteVectors(item));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("fields" in record) return collectByteVectors(record.fields);
    if ("value" in record) return collectByteVectors(record.value);
    if ("vec" in record) return collectByteVectors(record.vec);
    return Object.values(record).flatMap((item) => collectByteVectors(item));
  }

  return [];
}

export default function PvPScreen() {
  const ESCROW_ROOM_STORAGE_KEY = "pvp:last-escrow-room-id";
  const navigate = useNavigate();
  const { account, playerData, profile } = useGame();
  const {
    pvp,
    connectRoomSocket,
    disconnectRoomSocket,
    notifyRoomCreated,
    notifyRoomJoined,
    notifyRoomClosed,
    refreshSettlementPayload,
    // legacy aliases still available on hook: joinQueue, leaveQueue
    submitShot,
    reportRound,
    forfeitMatch,
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
  const [escrowDeadlineMinutes] = useState(3);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [escrowSubmitting, setEscrowSubmitting] = useState(false);
  const [settleSubmitting, setSettleSubmitting] = useState(false);
  const [roomStatus, setRoomStatus] = useState<number | null>(null);
  const [roomDeadlineMs, setRoomDeadlineMs] = useState<number | null>(null);
  const [roomCreator, setRoomCreator] = useState<string | null>(null);
  const [savedEscrowRoomId, setSavedEscrowRoomId] = useState<string | null>(
    null,
  );
  const [emergencyRefundDelayMs, setEmergencyRefundDelayMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [activeLobbySigner, setActiveLobbySigner] = useState<number[] | null>(
    null,
  );
  const [signerState, setSignerState] = useState<
    "loading" | "ready" | "missing" | "error"
  >("loading");
  const [escrowLocked, setEscrowLocked] = useState(false);
  const lastActiveSyncAtRef = useRef(0);
  const autoCancelRoomRef = useRef<string | null>(null);
  const settlementWarnedDeadlineRef = useRef<number | null>(null);

  const handleBack = () => {
    void handleLeave();
  };
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
  const ownedNftIdSet = useMemo(
    () => new Set(cuonChuns.map((item) => item.objectId)),
    [cuonChuns],
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
    const invalid = selectedLobbyNfts.filter((id) => !ownedNftIdSet.has(id));

    if (invalid.length === 0) {
      return true;
    }

    setSelectedLobbyNfts((prev) => prev.filter((id) => ownedNftIdSet.has(id)));
    toast.error(
      "Một số NFT đã không còn thuộc ví hiện tại (có thể đang bị khóa escrow). Hãy chọn lại NFT.",
    );
    return false;
  };

  const resolveLockedNftIds = (): string[] => {
    const preferredId = pvp.myNft?.id;
    if (preferredId && ownedNftIdSet.has(preferredId)) {
      return [preferredId];
    }
    return selectedLobbyNfts.filter((id) => ownedNftIdSet.has(id));
  };

  const mustCancelOnChainBeforeLeaving =
    pvp.status === "cancelled" &&
    Boolean(pvp.cancelRoomId) &&
    Boolean(pvp.needsCreatorCancel) &&
    sameAddress(pvp.canCancelWallet, account?.address) &&
    roomStatus !== 1 &&
    roomStatus !== 2 &&
    roomStatus !== 3 &&
    roomStatus !== 4;
  const matchAlreadyStarted =
    pvp.status === "matched" ||
    pvp.status === "playing" ||
    pvp.status === "submitting";
  const matchResolved = pvp.status === "resolved";
  const resolvedWinnerCanSettle =
    matchResolved &&
    Boolean(pvp.winner) &&
    sameAddress(pvp.winner, account?.address) &&
    !pvp.settleTx &&
    roomStatus === 1;
  const hideEmergencyRefundForStartedMatch =
    matchAlreadyStarted || matchResolved;

  const shouldWarnUnsafeLeave = useMemo(() => {
    if (matchResolved) return false;
    if (matchAlreadyStarted) return true;
    if (mustCancelOnChainBeforeLeaving) return true;
    if (!createdRoomId) return false;
    if (roomStatus === 0 || roomStatus === 1) return true;
    return (
      pvp.status === "awaiting_deposit" ||
      pvp.status === "matched" ||
      pvp.status === "playing" ||
      pvp.status === "submitting"
    );
  }, [
    createdRoomId,
    matchAlreadyStarted,
    matchResolved,
    mustCancelOnChainBeforeLeaving,
    pvp.status,
    roomStatus,
  ]);

  const readLobbyRoomSnapshot = async (
    roomId: string,
  ): Promise<LobbyRoomSnapshot | null> => {
    const roomObject = await suiClient.getObject({
      id: roomId,
      options: { showContent: true },
    });
    const fields = (
      roomObject.data?.content as
        | { fields?: Record<string, unknown> }
        | undefined
    )?.fields;
    if (!fields) return null;
    return {
      status: Number(fields.status ?? 0),
      deadlineMs: Number(fields.deadline_ms ?? 0),
      creator: typeof fields.creator === "string" ? fields.creator : null,
      nonce: Number(fields.nonce ?? 0),
      signerPubkey: collectByteVectors(fields.signer_pubkey)[0] ?? [],
    };
  };

  const applyLobbyRoomSnapshot = (snapshot: LobbyRoomSnapshot | null) => {
    if (!snapshot) {
      setRoomStatus(null);
      setRoomDeadlineMs(null);
      setRoomCreator(null);
      return;
    }
    setRoomStatus(snapshot.status);
    setRoomDeadlineMs(snapshot.deadlineMs);
    setRoomCreator(snapshot.creator);
  };

  const recoverCancelMismatch = async (roomId: string) => {
    const snapshot = await readLobbyRoomSnapshot(roomId).catch(() => null);
    applyLobbyRoomSnapshot(snapshot);

    if (snapshot?.status === 1) {
      setCreatedRoomId(roomId);
      setJoinRoomId(roomId);
      setEscrowLocked(true);
      notifyRoomJoined(roomId);
      toast.info(
        "Room da ACTIVE. Khong the huy WAITING, dang dong bo vao tran.",
        {
          id: "lobby-cancel",
        },
      );
      return;
    }

    if (
      snapshot?.status === 2 ||
      snapshot?.status === 3 ||
      snapshot?.status === 4
    ) {
      notifyRoomClosed(roomId);
      window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
      setCreatedRoomId(null);
      setJoinRoomId("");
      toast.info("Room da dong on-chain, da cap nhat lai trang thai.", {
        id: "lobby-cancel",
      });
      return;
    }

    toast.error(
      "Room khong con o trang thai WAITING nen khong the huy. Dang cap nhat lai trang thai room.",
      {
        id: "lobby-cancel",
      },
    );
  };

  const cancelLobbyRoomTx = async (roomId: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const tx = buildCancelValuationLobbyRoomTx(roomId);
      signAndExecute(
        { transaction: tx },
        {
          onSuccess: () => {
            notifyRoomClosed(roomId);
            window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
            setCreatedRoomId(null);
            setJoinRoomId("");
            setSelectedLobbyNfts([]);
            setEscrowLocked(false);
            toast.success("Đã hủy phòng escrow on-chain và hoàn tài sản.", {
              id: "lobby-cancel",
            });
            resolve(true);
          },
          onError: async (error) => {
            const message = String(error?.message ?? error);
            if (message.includes("702")) {
              await recoverCancelMismatch(roomId);
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

  useEffect(() => {
    if (pvp.status !== "cancelled") return;
    if (!pvp.needsCreatorCancel || !pvp.cancelRoomId) return;
    if (!sameAddress(pvp.canCancelWallet, account?.address)) return;
    if (createdRoomId !== pvp.cancelRoomId) {
      setCreatedRoomId(pvp.cancelRoomId);
      setJoinRoomId(pvp.cancelRoomId);
      return;
    }
    if (roomStatus == null) return;
    if (roomStatus === 1) {
      notifyRoomJoined(pvp.cancelRoomId);
      toast.info("Room da ACTIVE. Dang dong bo de vao tran.", {
        id: "lobby-cancel",
      });
      return;
    }
    if (roomStatus !== 0) {
      notifyRoomClosed(pvp.cancelRoomId);
      return;
    }
    if (autoCancelRoomRef.current === pvp.cancelRoomId) return;

    autoCancelRoomRef.current = pvp.cancelRoomId;
    setEscrowSubmitting(true);
    toast.loading("Doi thu da chay tron. Dang huy room de tra NFT...", {
      id: "lobby-cancel",
    });

    void cancelLobbyRoomTx(pvp.cancelRoomId).finally(() => {
      setEscrowSubmitting(false);
    });
  }, [
    account?.address,
    pvp.canCancelWallet,
    pvp.cancelRoomId,
    pvp.needsCreatorCancel,
    pvp.status,
    createdRoomId,
    notifyRoomClosed,
    notifyRoomJoined,
    roomStatus,
  ]);

  const handleLeave = async () => {
    if (matchResolved) {
      if (resolvedWinnerCanSettle) {
        const leaveConfirmed = window.confirm(
          "Ban da thang nhung chua settle on-chain. Neu thoat, NFT van con trong escrow cho den khi ban quay lai settle. Ban van muon thoat?",
        );
        if (!leaveConfirmed) {
          return;
        }

        const unresolvedRoomId =
          pvp.settlementPayload?.roomId ||
          pvp.roomId ||
          createdRoomId ||
          joinRoomId.trim();
        if (unresolvedRoomId) {
          window.sessionStorage.setItem(
            ESCROW_ROOM_STORAGE_KEY,
            unresolvedRoomId,
          );
          setSavedEscrowRoomId(unresolvedRoomId);
        }
        disconnectRoomSocket();
        navigate("/dashboard");
        return;
      }

      window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
      setSavedEscrowRoomId(null);
      disconnectRoomSocket();
      navigate("/dashboard");
      return;
    }

    if (matchAlreadyStarted) {
      const leaveConfirmed = window.confirm(
        "Tran da bat dau va NFT dang la tien cuoc. Neu thoat luc nay, ban se bi xu thua va doi thu co quyen settle NFT. Ban van muon thoat?",
      );
      if (!leaveConfirmed) {
        return;
      }

      await forfeitMatch();
      window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
      disconnectRoomSocket();
      navigate("/dashboard");
      return;
    }

    if (mustCancelOnChainBeforeLeaving && pvp.cancelRoomId) {
      const leaveConfirmed = window.confirm(
        "NFT dang nam trong room WAITING. Ban can huy room on-chain de lay lai NFT truoc khi thoat. Tiep tuc huy room?",
      );
      if (!leaveConfirmed) {
        return;
      }

      setCreatedRoomId(pvp.cancelRoomId);
      setJoinRoomId(pvp.cancelRoomId);
      setEscrowSubmitting(true);
      toast.loading("Dang huy room escrow de tra NFT...", {
        id: "lobby-cancel",
      });
      const cancelled = await cancelLobbyRoomTx(pvp.cancelRoomId);
      setEscrowSubmitting(false);
      if (!cancelled) {
        return;
      }
      disconnectRoomSocket();
      navigate("/dashboard");
      return;
    }

    if (shouldWarnUnsafeLeave) {
      const leaveConfirmed = window.confirm(
        roomStatus === 0
          ? "Ban dang co room escrow WAITING. Neu thoat, he thong se thu huy room de tra NFT ve vi. Ban chac chan muon thoat?"
          : 'Room dang ACTIVE, NFT dang khoa trong escrow. Neu thoat/reload luc nay, ban can quay lai room hoac doi "Reclaim NFT". Ban van muon thoat?',
      );
      if (!leaveConfirmed) {
        return;
      }
    }

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
        window.sessionStorage.setItem(ESCROW_ROOM_STORAGE_KEY, createdRoomId);
        setSavedEscrowRoomId(createdRoomId);
        toast.info("📌 Phòng đã lưu. Quay lại sau để kiểm tra kết quả.", {
          duration: 8000,
        });
      }
    }

    disconnectRoomSocket();
    navigate("/dashboard");
  };

  const resolveNftPoints = (nftId: string): number => {
    const ownedNft = cuonChuns.find((item) => item.objectId === nftId);
    const tier =
      ownedNft?.tier ?? (pvp.myNft?.id === nftId ? pvp.myNft.tier : 0);
    if (tier === 3) return 1000;
    if (tier === 2) return 250;
    if (tier === 1) return 100;
    return 0;
  };

  useEffect(() => {
    setSelectedLobbyNfts((prev) => prev.filter((id) => ownedNftIdSet.has(id)));
  }, [ownedNftIdSet]);

  useEffect(() => {
    if (createdRoomId) {
      window.sessionStorage.setItem(ESCROW_ROOM_STORAGE_KEY, createdRoomId);
      if (roomStatus === 1) {
        setSavedEscrowRoomId(createdRoomId);
      }
      return;
    }

    const savedRoomId = window.sessionStorage.getItem(ESCROW_ROOM_STORAGE_KEY);
    setSavedEscrowRoomId(savedRoomId || null);
  }, [ESCROW_ROOM_STORAGE_KEY, createdRoomId, roomStatus]);

  useEffect(() => {
    setSelectedLobbyNfts([]);
  }, [account?.address]);

  useEffect(() => {
    if (!shouldWarnUnsafeLeave) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        "NFT dang bi khoa trong escrow. Ban se can quay lai room hoac emergency refund.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarnUnsafeLeave]);

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
        const snapshot = await readLobbyRoomSnapshot(createdRoomId);

        if (!disposed && snapshot) {
          applyLobbyRoomSnapshot(snapshot);

          // If backend/indexer missed RoomActivated, resync ACTIVE rooms through
          // the join path because that path calls startValuationMatchFromRoom.
          if (
            (pvp.status === "awaiting_deposit" ||
              pvp.status === "matched" ||
              pvp.status === "cancelled") &&
            snapshot.status === 1 &&
            createdRoomId
          ) {
            const now = Date.now();
            if (now - lastActiveSyncAtRef.current > 8_000) {
              lastActiveSyncAtRef.current = now;
              notifyRoomJoined(createdRoomId);
            }
          }
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
  }, [
    createdRoomId,
    notifyRoomCreated,
    notifyRoomJoined,
    pvp.role,
    pvp.status,
    suiClient,
  ]);

  const joinBettingQueue = () => {
    if (!account?.address) {
      toast.error("Vui long ket noi vi truoc.");
      return;
    }

    const nft = toValuationNft(selectedLobbyNft);
    if (!nft) {
      toast.error(
        `Chon 01 NFT ${selectedBettingLobby.requiredNftLabel} de vao sanh nay.`,
      );
      return;
    }
    if (nft.tier !== selectedBettingLobby.requiredNftTier) {
      toast.error(
        `Sanh ${selectedBettingLobby.name} chi chap nhan NFT ${selectedBettingLobby.requiredNftLabel}.`,
      );
      return;
    }

    connectRoomSocket(undefined, {
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
    setSelectedLobbyNfts((prev) => (prev.includes(nftId) ? [] : [nftId]));
  };

  const parseRoomEvent = async (digest: string, eventType: string) => {
    const txBlock = await suiClient.getTransactionBlock({
      digest,
      options: { showEvents: true, showEffects: true, showObjectChanges: true },
    });

    const event = txBlock.events?.find((item) => item.type === eventType);
    const roomCreated = (txBlock.objectChanges ?? []).find(
      (change) =>
        change.type === "created" &&
        String(
          ("objectType" in change ? change.objectType : "") ?? "",
        ).includes("::nft_valuation_lobby::Room"),
    );

    const fallbackRoomId =
      roomCreated && "objectId" in roomCreated
        ? String(roomCreated.objectId ?? "")
        : "";

    return {
      parsed: event?.parsedJson as Record<string, unknown> | undefined,
      fallbackRoomId,
    };
  };

  const extractOwnedByRoomId = (message: string): string | null => {
    const match = message.match(/owned by object\s+(0x[a-fA-F0-9]+)/i);
    return match?.[1] ?? null;
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
      toast.error("Ban khong phai nguoi tao phong truoc trong cap dau nay.");
      return;
    }

    const lockedNftIds = resolveLockedNftIds();
    if (lockedNftIds.length === 0) {
      toast.error("Chọn ít nhất một NFT để khóa vào phòng.");
      return;
    }
    if (!validateSelectedLobbyNfts()) {
      return;
    }
    const lockedNftPoints = lockedNftIds.reduce(
      (total, nftId) => total + resolveNftPoints(nftId),
      0,
    );
    if (lockedNftPoints < escrowTargetPoints) {
      toast.error(
        `Tổng điểm hiện tại ${lockedNftPoints} chưa đủ target ${escrowTargetPoints}.`,
      );
      return;
    }

    setEscrowSubmitting(true);
    toast.loading("Đang tạo phòng escrow on-chain...", { id: "lobby-escrow" });

    const deadlineMs = BigInt(Date.now() + escrowDeadlineMinutes * 60_000);
    const tx = buildCreateValuationLobbyRoomTx({
      nftIds: lockedNftIds,
      targetPoints: pvp.betTier
        ? selectedBettingLobby.targetPoints
        : escrowTargetPoints,
      deadlineMs,
      signerPubkey: activeLobbySigner ?? undefined,
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async (result) => {
          try {
            const { parsed, fallbackRoomId } = await parseRoomEvent(
              result.digest,
              `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::RoomCreated`,
            );
            const roomId = String(parsed?.room_id ?? fallbackRoomId ?? "");
            setCreatedRoomId(roomId || null);
            if (roomId) {
              setJoinRoomId(roomId);
              setSelectedLobbyNfts([]);
              setEscrowLocked(true);
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
          const message = String(error?.message ?? error);
          if (message.includes("owned by object")) {
            const existingRoomId =
              extractOwnedByRoomId(message) ?? pvp.roomId ?? joinRoomId.trim();
            if (existingRoomId) {
              setCreatedRoomId(existingRoomId);
              setJoinRoomId(existingRoomId);
              setEscrowLocked(true);
              notifyRoomCreated(existingRoomId);
              toast.info(
                "NFT đã được khóa từ trước. Đang đồng bộ lại room escrow hiện có.",
                { id: "lobby-escrow" },
              );
            } else {
              toast.error(
                "NFT đã bị khóa trong escrow nhưng không đọc được room ID để đồng bộ.",
                { id: "lobby-escrow" },
              );
            }
            setEscrowSubmitting(false);
            return;
          }
          toast.error(`Tạo phòng escrow thất bại: ${message}`, {
            id: "lobby-escrow",
          });
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
      toast.error("Ban khong phai nguoi join phong trong cap dau nay.");
      return;
    }

    if (
      roomStatus === 1 &&
      (createdRoomId === targetRoomId || joinRoomId.trim() === targetRoomId)
    ) {
      notifyRoomJoined(targetRoomId);
      toast.info("Room da ACTIVE. Dang dong bo de vao tran.");
      return;
    }

    if (pvp.myNft?.id && !ownedNftIdSet.has(pvp.myNft.id)) {
      notifyRoomJoined(targetRoomId);
      toast.info("NFT cua ban da duoc khoa vao room. Dang dong bo tran dau...");
      return;
    }

    const lockedNftIds = resolveLockedNftIds();
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
          let joinedRoomId = targetRoomId;
          try {
            const { parsed, fallbackRoomId } = await parseRoomEvent(
              result.digest,
              `${LOBBY_PACKAGE_ID}::nft_valuation_lobby::RoomJoined`,
            );
            joinedRoomId = String(
              parsed?.room_id ?? fallbackRoomId ?? targetRoomId,
            );
          } catch (error) {
            console.error(error);
          }
          if (joinedRoomId) {
            setCreatedRoomId(joinedRoomId);
            setJoinRoomId(joinedRoomId);
            setSelectedLobbyNfts([]);
            setEscrowLocked(true);
            notifyRoomJoined(joinedRoomId);
          }
          toast.success(
            joinedRoomId
              ? `Đã join phòng escrow: ${joinedRoomId.slice(0, 16)}...`
              : "Đã join phòng escrow on-chain.",
            { id: "lobby-join" },
          );
          setEscrowSubmitting(false);
        },
        onError: (error) => {
          const message = String(error?.message ?? error);
          if (message.includes("owned by object")) {
            const existingRoomId =
              extractOwnedByRoomId(message) ?? targetRoomId;
            setCreatedRoomId(existingRoomId);
            setJoinRoomId(existingRoomId);
            setEscrowLocked(true);
            notifyRoomJoined(existingRoomId);
            toast.info(
              "NFT nay da duoc khoa vao room. Dang dong bo de vao tran.",
              {
                id: "lobby-join",
              },
            );
            setEscrowSubmitting(false);
            return;
          }
          toast.error(`Join phòng escrow thất bại: ${message}`, {
            id: "lobby-join",
          });
          setEscrowSubmitting(false);
        },
      },
    );
  };

  const cancelLobbyRoom = async () => {
    if (createdRoomId && roomStatus === 1) {
      notifyRoomJoined(createdRoomId);
      toast.info("Room da ACTIVE nen khong the huy. Dang dong bo de vao tran.");
      return;
    }
    if (
      createdRoomId &&
      (roomStatus === 2 || roomStatus === 3 || roomStatus === 4)
    ) {
      notifyRoomClosed(createdRoomId);
      window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
      setCreatedRoomId(null);
      setJoinRoomId("");
      toast.info("Room da dong on-chain, da cap nhat lai trang thai.");
      return;
    }

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

  const isMe = (address: string) => sameAddress(address, account?.address);

  const settleOnChain = async () => {
    if (!pvp.winner || !isMe(pvp.winner)) {
      toast.error("Chỉ winner mới được settle on-chain.");
      return;
    }

    const requestedRoomId =
      pvp.settlementPayload?.roomId ||
      pvp.roomId ||
      createdRoomId ||
      joinRoomId.trim();
    if (!requestedRoomId) {
      toast.error("Không xác định được room để settle.");
      return;
    }

    let payload = await refreshSettlementPayload(requestedRoomId);
    if (!payload) {
      payload = pvp.settlementPayload;
    }
    if (!payload) {
      toast.error("Backend chưa cung cấp settlement payload.");
      return;
    }
    if (!sameAddress(payload.winner, account?.address)) {
      toast.error("Settlement payload hiện tại không dành cho ví của bạn.");
      return;
    }

    const settleRoomId = payload.roomId || requestedRoomId;
    if (!settleRoomId) {
      toast.error("Không xác định được room để settle.");
      return;
    }

    const roomSnapshot = await readLobbyRoomSnapshot(settleRoomId).catch(
      () => null,
    );
    applyLobbyRoomSnapshot(roomSnapshot);
    if (!roomSnapshot) {
      toast.error("Không đọc được trạng thái room on-chain để settle.");
      return;
    }
    if (roomSnapshot.status !== 1) {
      toast.error(
        "Room không còn ở trạng thái ACTIVE. Hãy đồng bộ lại phòng trước khi settle.",
      );
      return;
    }

    if (roomSnapshot.signerPubkey.length > 0) {
      const roomSignerB64 = toBase64(new Uint8Array(roomSnapshot.signerPubkey));
      const payloadSignerB64 = toBase64(new Uint8Array(payload.signerPubkey));
      if (roomSignerB64 !== payloadSignerB64) {
        toast.error(
          "Signer pubkey trong payload không khớp signer đang gắn với room on-chain.",
        );
        return;
      }
    }

    if (payload.debugMessageB64 && payload.packageId && payload.chainId !== undefined) {
      const localMessageBytes = SettlementMessageBcs.serialize({
        intent_scope: 1,
        chain_id: payload.chainId,
        package_id: normalizeSuiAddress(payload.packageId),
        room_id: normalizeSuiAddress(settleRoomId),
        winner: normalizeSuiAddress(payload.winner),
        loser: normalizeSuiAddress(payload.loser),
        match_digest: payload.matchDigest,
        nonce: String(payload.nonce),
        deadline_ms: String(payload.deadlineMs),
      }).toBytes();

      const localMessageB64 = toBase64(localMessageBytes);
      if (localMessageB64 !== payload.debugMessageB64) {
        toast.error(
          "Settlement payload mismatch trước khi submit (message bytes không trùng backend).",
        );
        console.error("Settlement preflight mismatch", {
          roomId: settleRoomId,
          backendMessageB64: payload.debugMessageB64,
          localMessageB64,
          chainId: payload.chainId,
          packageId: payload.packageId,
          nonce: payload.nonce,
          deadlineMs: payload.deadlineMs,
        });
        return;
      }
    }

    if (roomSnapshot.nonce !== payload.nonce) {
      toast.error("Nonce payload không khớp nonce room on-chain. Hãy refresh payload rồi thử lại.");
      return;
    }

    if (payload.deadlineMs <= Date.now() + 15_000) {
      const refreshed = await refreshSettlementPayload(settleRoomId);
      if (!refreshed) {
        toast.error(
          "Settlement payload đã hết hạn, chưa thể làm mới. Hãy thử lại sau vài giây.",
        );
        return;
      }
      payload = refreshed;
    }
    if (payload.signature.length === 0 || payload.signerPubkey.length === 0) {
      toast.error("Settlement payload không hợp lệ (thiếu signature/signer).");
      return;
    }

    setSettleSubmitting(true);
    toast.loading("Đang submit settle on-chain...", { id: "lobby-settle" });

    const handleSettleSuccess = (digest: string) => {
      setSettleTx(digest);
      window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
      setSavedEscrowRoomId(null);
      setCreatedRoomId(null);
      setJoinRoomId("");
      setEscrowLocked(false);
      setRoomStatus(2);
      setRoomDeadlineMs(null);
      toast.success("Settle on-chain thành công.", { id: "lobby-settle" });
      setSettleSubmitting(false);
    };

    const executeSettle = (currentPayload: typeof payload, retried = false) => {
      const tx = buildSettleValuationLobbyRoomTx({
        roomId: settleRoomId,
        winner: currentPayload.winner,
        loser: currentPayload.loser,
        matchDigest: currentPayload.matchDigest,
        nonce: currentPayload.nonce,
        deadlineMs: currentPayload.deadlineMs,
        signature: currentPayload.signature,
        signerPubkey: currentPayload.signerPubkey,
      });

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: (result) => {
            handleSettleSuccess(result.digest);
          },
          onError: async (error) => {
            const message = String(error?.message ?? error);
            if (message.includes("711") && !retried) {
              const refreshed = await refreshSettlementPayload(settleRoomId);
              if (refreshed) {
                toast.loading("Payload settle đã làm mới, đang thử lại...", {
                  id: "lobby-settle",
                });
                executeSettle(refreshed, true);
                return;
              }
            }
            if (message.includes("711")) {
              toast.error(
                "Settle bị từ chối (711): chữ ký không khớp on-chain. Room vẫn ACTIVE thì cần kiểm tra signer/package env backend.",
                { id: "lobby-settle" },
              );
              setSettleSubmitting(false);
              return;
            }
            toast.error(`Settle on-chain thất bại: ${message}`, {
              id: "lobby-settle",
            });
            setSettleSubmitting(false);
          },
        },
      );
    };

    executeSettle(payload);
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
          notifyRoomClosed(createdRoomId);
          window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
          toast.success("Emergency refund thành công. Tài sản đã hoàn về ví.", {
            id: "lobby-emergency-refund",
          });
          setEscrowSubmitting(false);
          setCreatedRoomId(null);
          setJoinRoomId("");
          setSelectedLobbyNfts([]);
          setEscrowLocked(false);
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

  useEffect(() => {
    if (roomStatus === 2 || roomStatus === 3 || roomStatus === 4) {
      window.sessionStorage.removeItem(ESCROW_ROOM_STORAGE_KEY);
      setSavedEscrowRoomId(null);
      setEscrowLocked(false);
    }
  }, [ESCROW_ROOM_STORAGE_KEY, roomStatus]);

  useEffect(() => {
    if (pvp.status !== "resolved") return;
    const deadlineMs = pvp.settlementPayload?.deadlineMs;
    if (!deadlineMs) return;
    if (settlementWarnedDeadlineRef.current === deadlineMs) return;

    const remainingMs = deadlineMs - Date.now();
    if (remainingMs > 0 && remainingMs <= 5 * 60_000) {
      settlementWarnedDeadlineRef.current = deadlineMs;
      toast.info(
        `Settlement payload sẽ hết hạn sau ${Math.ceil(remainingMs / 60_000)} phút.`,
      );
    }
  }, [pvp.settlementPayload?.deadlineMs, pvp.status]);

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
  const reconnectEscrowRoomId = createdRoomId ?? savedEscrowRoomId;

  const reconnectSavedRoom = () => {
    if (!reconnectEscrowRoomId) return;
    setCreatedRoomId(reconnectEscrowRoomId);
    setJoinRoomId(reconnectEscrowRoomId);
    setEscrowLocked(true);
    notifyRoomJoined(reconnectEscrowRoomId);
    toast.info("Đang quay lại phòng escrow đã lưu.");
  };

  const renderContent = () => {
    if (pvp.status === "cancelled") {
      const canCancelOnChain =
        Boolean(pvp.cancelRoomId) &&
        Boolean(pvp.needsCreatorCancel) &&
        sameAddress(pvp.canCancelWallet, account?.address) &&
        roomStatus === 0;
      const lockedRoomIsActive =
        Boolean(pvp.cancelRoomId) &&
        Boolean(pvp.needsCreatorCancel) &&
        roomStatus === 1;

      return (
        <div className="overflow-hidden rounded-[28px] border border-red-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
          <div className="border-b border-red-100 bg-red-950 px-6 py-5 text-white md:px-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-200">
              CANCELLED
            </p>
            <h3 className="mt-2 text-2xl font-black md:text-3xl">
              Doi thu da roi phong
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-red-100/80">
              {pvp.cancelReason ??
                "Tran chua vao In-Game nen phong da bi huy truoc tran."}
            </p>
          </div>

          <div className="space-y-4 p-6 md:p-8">
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
              {pvp.needsCreatorCancel
                ? "NFT da nam trong room WAITING. Creator can ky giao dich huy room de tra NFT ve vi."
                : "Chua co NFT nao bi khoa on-chain. Ban co the quay lai sanh va tim tran moi."}
            </div>

            <div className="flex flex-wrap gap-3">
              {canCancelOnChain && (
                <button
                  onClick={() => {
                    const roomId = pvp.cancelRoomId;
                    if (!roomId) return;
                    setCreatedRoomId(roomId);
                    setJoinRoomId(roomId);
                    toast.loading("Dang huy room escrow...", {
                      id: "lobby-cancel",
                    });
                    setEscrowSubmitting(true);
                    void cancelLobbyRoomTx(roomId).finally(() => {
                      setEscrowSubmitting(false);
                    });
                  }}
                  disabled={escrowSubmitting}
                  className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  Huy room va lay lai NFT
                </button>
              )}
              {lockedRoomIsActive && pvp.cancelRoomId && (
                <button
                  onClick={() => {
                    if (!pvp.cancelRoomId) return;
                    setCreatedRoomId(pvp.cancelRoomId);
                    setJoinRoomId(pvp.cancelRoomId);
                    notifyRoomJoined(pvp.cancelRoomId);
                    toast.info("Room da ACTIVE. Dang dong bo de vao tran.");
                  }}
                  className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white"
                >
                  Dong bo vao tran
                </button>
              )}
              <button
                onClick={() => {
                  if (mustCancelOnChainBeforeLeaving) {
                    toast.error("Hay huy room on-chain de lay lai NFT truoc.");
                    return;
                  }
                  disconnectRoomSocket();
                  setCreatedRoomId(null);
                  setJoinRoomId("");
                }}
                disabled={mustCancelOnChainBeforeLeaving || escrowSubmitting}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700"
              >
                {mustCancelOnChainBeforeLeaving
                  ? "Can huy room truoc"
                  : "Tim tran moi"}
              </button>
            </div>
          </div>
        </div>
      );
    }

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
                  Ban chi can chon sanh va 1 NFT. He thong tu ghep 2 nguoi cung
                  tier, sau do moi yeu cau khoa NFT on-chain.
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
            {savedEscrowRoomId && !createdRoomId && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-amber-700">
                      Phòng escrow đang chờ
                    </p>
                    <p className="mt-1 text-sm font-bold text-amber-900">
                      {savedEscrowRoomId.slice(0, 16)}...
                    </p>
                  </div>
                  <button
                    onClick={reconnectSavedRoom}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}
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
                    Chon 1 NFT {selectedBettingLobby.requiredNftLabel} de vao
                    tran
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
                    Ban chua co NFT {selectedBettingLobby.requiredNftLabel} phu
                    hop voi sanh nay.
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
              Bay gio moi nguoi khoa 1 NFT cung tier. Phan escrow on-chain duoc
              xu ly tu dong theo vai tro cua ban.
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
                  Doi thu
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={resolveValuationNftImage(pvp.opponentNft)}
                    alt={pvp.opponentNft?.name ?? "NFT doi thu"}
                    onError={(event) => {
                      event.currentTarget.src = "/nft/tier1_v1.png";
                    }}
                    className="size-14 rounded-xl bg-white object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-slate-950">
                      {pvp.opponentNft?.name ?? "Dang tai NFT..."}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {pvp.role === "CREATOR" ? "Joiner" : "Creator"}
                    </p>
                  </div>
                </div>
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
                <div className="mt-3 flex items-center gap-4">
                  <img
                    src={resolveValuationNftImage(pvp.myNft)}
                    alt={pvp.myNft?.name ?? "NFT cua ban"}
                    onError={(event) => {
                      event.currentTarget.src = "/nft/tier1_v1.png";
                    }}
                    className="size-20 rounded-2xl bg-slate-100 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-950">
                      {pvp.myNft?.name ?? "-"}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase text-slate-400">
                      Tier {pvp.myNft?.tier ?? "-"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase text-slate-400">
                  NFT doi thu
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <img
                    src={resolveValuationNftImage(pvp.opponentNft)}
                    alt={pvp.opponentNft?.name ?? "NFT doi thu"}
                    onError={(event) => {
                      event.currentTarget.src = "/nft/tier1_v1.png";
                    }}
                    className="size-20 rounded-2xl bg-slate-100 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-950">
                      {pvp.opponentNft?.name ?? "-"}
                    </p>
                    <p className="mt-1 text-xs font-black uppercase text-slate-400">
                      Tier {pvp.opponentNft?.tier ?? "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={isCreator ? createLobbyRoom : joinLobbyRoom}
              disabled={
                escrowSubmitting ||
                roomStatus === 1 ||
                (!isCreator && !roomReadyForJoiner) ||
                escrowLocked
              }
              data-testid="pvp-lock-assets-button"
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-black text-white shadow-xl shadow-emerald-100 transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <Wallet className="size-5" />
              {roomStatus === 1
                ? "Room da ACTIVE. Dang vao tran..."
                : escrowLocked
                  ? "Da khoa NFT. Dang cho doi thu..."
                  : isCreator
                    ? "Khoa NFT vao escrow"
                    : roomReadyForJoiner
                      ? "Khoa NFT vao escrow"
                      : "Dang chuan bi escrow cho ban..."}
            </button>

            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-900">
              Sau khi ca hai ben khoa tai san thanh cong, indexer se bat event
              on-chain va tran tu dong chuyen sang man hinh ban chun.
            </div>
            {pvp.paused && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
                {pvp.pausedReason ??
                  "Dang mat ket noi trong luc chot tai san. He thong se huy phong neu khong ket noi lai kip."}
              </div>
            )}
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
                          Huy phong
                        </button>
                      )}
                    {roomStatus === 1 &&
                      !hideEmergencyRefundForStartedMatch && (
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
                            ? `Reclaim NFT sau ${emergencyRefundRemainingMin} phut`
                            : "Reclaim NFT"}
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
                <h3 className="font-black text-2xl text-gray-900">Cach choi</h3>
              </div>
              <div className="space-y-3">
                {[
                  [
                    "1",
                    "Chon sanh",
                    "Moi sanh yeu cau NFT cung tier: Dong, Bac hoac Vang.",
                  ],
                  ["2", "Chon NFT", "NFT nay se duoc khoa vao escrow."],
                  [
                    "3",
                    "Tim tran",
                    "Backend chi ghep nguoi choi trong cung sanh NFT.",
                  ],
                  [
                    "4",
                    "Khoa NFT",
                    "Sau khi match, moi ben bam 1 nut de khoa NFT on-chain.",
                  ],
                  [
                    "5",
                    "Ban chun",
                    "Hai ben thi dau ban chun realtime va bao ket qua tran.",
                  ],
                  [
                    "6",
                    "Nhan thuong",
                    "Backend ky winner tu ket qua tran de claim escrow on-chain.",
                  ],
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
                      Huy phong
                    </button>
                  )}
                {createdRoomId &&
                  roomStatus === 1 &&
                  !hideEmergencyRefundForStartedMatch && (
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
                        ? `Reclaim NFT sau ${emergencyRefundRemainingMin} phut`
                        : "Reclaim NFT"}
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
