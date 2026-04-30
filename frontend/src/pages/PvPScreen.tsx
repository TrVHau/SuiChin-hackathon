import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, Landmark, Swords, Users } from "lucide-react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import PageHeader from "@/components/common/PageHeader";
import { useGame } from "@/providers/GameContext";
import { usePvP } from "@/hooks/usePvP";
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
  LOBBY_DEFAULT_COIN_MIST,
  LOBBY_DEFAULT_TARGET_POINTS,
  LOBBY_PACKAGE_ID,
} from "@/config/sui.config";

export default function PvPScreen() {
  const navigate = useNavigate();
  const { account, playerData, profile } = useGame();
  const { pvp, joinQueue, leaveQueue, reportRound, submitShot, setSettleTx } =
    usePvP(profile?.objectId);

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { cuonChuns } = useOwnedNFTs();
  const [selectedLobbyNfts, setSelectedLobbyNfts] = useState<string[]>([]);
  const [escrowTargetPoints, setEscrowTargetPoints] = useState(
    LOBBY_DEFAULT_TARGET_POINTS,
  );  const [escrowCoinMist, setEscrowCoinMist] = useState(LOBBY_DEFAULT_COIN_MIST);
  const [escrowDeadlineMinutes, setEscrowDeadlineMinutes] = useState(30);
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
              toast.error("Room không còn ở trạng thái WAITING nên không thể hủy.", {
                id: "lobby-cancel",
              });
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
            toast.error(
              `Hủy phòng thất bại: ${message}`,
              {
                id: "lobby-cancel",
              },
            );
            resolve(false);
          },
        },
      );
    });
  };

  const handleLeave = async () => {
    if (createdRoomId) {
      if (roomStatus == null) {
        toast.error("Đang đọc trạng thái room on-chain, vui lòng thử lại sau 2-3 giây.");
        return;
      }

      if (roomStatus === 0) {
        if (!sameAddress(roomCreator, account?.address)) {
          toast.error("Chỉ creator mới có thể hủy room WAITING để hoàn tài sản.");
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

    leaveQueue();
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
  const estimatedLobbyTotalPoints = useMemo(() => {
    const coinPoints = Number(escrowCoinMist / 100_000_000n);
    return selectedLobbyNFTPoints + coinPoints;
  }, [escrowCoinMist, selectedLobbyNFTPoints]);

  useEffect(() => {
    const ownedIds = new Set(cuonChuns.map((item) => item.objectId));
    setSelectedLobbyNfts((prev) => prev.filter((id) => ownedIds.has(id)));
  }, [cuonChuns]);

  useEffect(() => {
    setSelectedLobbyNfts([]);
  }, [account?.address]);

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
          setEmergencyRefundDelayMs(Number(fields?.emergency_refund_delay_ms ?? 0));
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
          setRoomCreator(typeof fields.creator === "string" ? fields.creator : null);
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

  const handleLocalFinish = (winnerWallet: string | null) => {
    if (!winnerWallet) {
      toast.error("Không xác định được kết quả trận.");
      return;
    }

    reportRound(winnerWallet);
  };

  const toggleLobbyNft = (nftId: string) => {
    setSelectedLobbyNfts((prev) =>
      prev.includes(nftId)
        ? prev.filter((item) => item !== nftId)
        : [...prev, nftId],
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
    if (selectedLobbyNfts.length === 0) {
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
      nftIds: selectedLobbyNfts,
      targetPoints: escrowTargetPoints,
      coinMist: escrowCoinMist,
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
              if (pvp.status === "idle" || pvp.status === "error") {
                joinQueue(0, roomId);
              }
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
    if (!joinRoomId.trim()) {
      toast.error("Nhập Room ID để join.");
      return;
    }
    if (selectedLobbyNfts.length === 0) {
      toast.error("Chọn NFT để join phòng.");
      return;
    }
    if (!validateSelectedLobbyNfts()) {
      return;
    }

    setEscrowSubmitting(true);
    toast.loading("Đang join phòng escrow on-chain...", { id: "lobby-join" });

    const tx = buildJoinValuationLobbyRoomTx({
      roomId: joinRoomId.trim(),
      nftIds: selectedLobbyNfts,
      coinMist: escrowCoinMist,
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
            const joinedRoomId = String(parsed?.room_id ?? joinRoomId.trim());
            if (joinedRoomId) {
              setCreatedRoomId(joinedRoomId);
              setJoinRoomId(joinedRoomId);
              setSelectedLobbyNfts([]);
              if (pvp.status === "idle" || pvp.status === "error") {
                joinQueue(0, joinedRoomId);
              }
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
        <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-[linear-gradient(160deg,rgba(2,6,23,0.98),rgba(30,41,59,0.96)_45%,rgba(15,118,110,0.92))] p-8 text-white shadow-[0_26px_70px_rgba(15,23,42,0.32)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.16),transparent_28%)]" />
          <div className="relative">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-white/60">
              Private room only
            </p>
            <h3 className="mt-3 text-3xl font-black tracking-tight text-white">
              Sảnh vào phòng đấu riêng
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Luồng PvP mới chỉ còn room on-chain. Giá trị phòng được tính từ NFT + SUI, sau đó hệ thống mới mở trận realtime bên trong phòng đó.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">
                  NFT đã chọn
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {selectedLobbyNfts.length}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">
                  Tổng điểm
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {estimatedLobbyTotalPoints}
                </p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/55">
                  Trạng thái
                </p>
                <p className="mt-2 text-2xl font-black text-white">Chờ mở phòng</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-white/80">
              <span className="rounded-full border border-white/12 bg-black/20 px-4 py-2">
                NFT + SUI = giá trị phòng
              </span>
              <span className="rounded-full border border-white/12 bg-black/20 px-4 py-2">
                Không còn cược Chun ở màn này
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (pvp.status === "connecting" || pvp.status === "waiting") {
      return (
        <PvpSearchingCard
          roomValue={pvp.wager}
          onCancel={handleLeave}
          roomId={createdRoomId ?? (joinRoomId.trim() || undefined)}
        />
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
          onShoot={submitShot}
          onLocalFinish={handleLocalFinish}
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
          subtitle="Queue realtime + escrow on-chain theo tổng giá trị NFT + SUI"
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

      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="mb-6 rounded-[28px] border border-amber-200 bg-white/75 backdrop-blur p-5 shadow-[0_20px_50px_rgba(238,174,77,0.16)]">
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

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur rounded-[32px] border border-red-200 shadow-[0_20px_50px_rgba(239,68,68,0.12)] p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
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
            </div>

            {(pvp.status === "playing" || pvp.status === "submitting") && (
              <div className="bg-white/85 backdrop-blur rounded-[28px] border border-cyan-200 shadow-[0_12px_30px_rgba(34,211,238,0.15)] p-5">
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

          <aside className="space-y-6">
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
                  PvP hiện dùng queue socket realtime cho phần ghép trận. Cơ chế
                  valuation lobby là lớp escrow/settlement theo tổng giá trị NFT
                  + SUI. Active signer được đọc từ LobbyConfig on-chain, không
                  cần thao tác admin trên UI nữa.
                </p>
                <p className="mt-2 text-xs font-black text-sky-700 break-all">
                  Active signer state: {signerState}
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur rounded-[28px] border border-emerald-200 shadow-[0_18px_40px_rgba(16,185,129,0.16)] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">⛓️</span>
                <div>
                  <h3 className="font-black text-2xl text-gray-900">
                    On-chain valuation lobby
                  </h3>
                  <p className="text-sm text-gray-600 font-semibold">
                    Khóa NFT + SUI vào BetRoom trước khi vào trận.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <label className="space-y-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase">
                    Target points
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={escrowTargetPoints}
                    onChange={(event) =>
                      setEscrowTargetPoints(Number(event.target.value || 0))
                    }
                    className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 font-bold text-gray-900"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase">
                    SUI top-up (mist)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1000000}
                    value={escrowCoinMist.toString()}
                    onChange={(event) =>
                      setEscrowCoinMist(BigInt(event.target.value || "0"))
                    }
                    className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 font-bold text-gray-900"
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase">
                    Deadline (minutes)
                  </span>
                  <input
                    type="number"
                    min={5}
                    value={escrowDeadlineMinutes}
                    onChange={(event) =>
                      setEscrowDeadlineMinutes(Number(event.target.value || 30))
                    }
                    className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 font-bold text-gray-900"
                  />
                </label>
              </div>

              <div className="mb-5 rounded-3xl border border-amber-200 bg-amber-50/70 p-4 text-sm font-semibold text-amber-900">
                Tổng điểm NFT hiện chọn:{" "}
                <span className="font-black text-gray-900">
                  {selectedLobbyNFTPoints}
                </span>
                <br />
                Điểm ước tính từ SUI top-up:{" "}
                <span className="font-black text-gray-900">
                  {Number(escrowCoinMist / 100_000_000n)}
                </span>
                <br />
                Tổng điểm ước tính:{" "}
                <span className="font-black text-gray-900">
                  {estimatedLobbyTotalPoints}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 max-h-72 overflow-auto pr-1">
                {cuonChuns.map((nft) => {
                  const selected = selectedLobbyNfts.includes(nft.objectId);
                  return (
                    <button
                      key={nft.objectId}
                      onClick={() => toggleLobbyNft(nft.objectId)}
                      className={`text-left rounded-2xl border-2 p-4 transition-all ${
                        selected
                          ? "border-playful-green bg-green-50 shadow-lg"
                          : "border-gray-200 bg-white hover:border-playful-green"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-black text-gray-900">
                            {nft.name || "Cuộn Chun"}
                          </p>
                          <p className="text-xs text-gray-500 break-all">
                            {nft.objectId}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-gray-900">
                            Tier {nft.tier}
                          </p>
                          <p className="text-xs text-gray-500">
                            {nft.tier === 3 ? 1000 : nft.tier === 2 ? 250 : 100}{" "}
                            điểm
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={createLobbyRoom}
                  disabled={escrowSubmitting}
                  className="flex-1 rounded-2xl bg-emerald-500 hover:bg-emerald-600 px-5 py-4 font-black text-white shadow-lg transition-colors disabled:opacity-50"
                >
                  Tạo phòng escrow
                </button>
                <input
                  value={joinRoomId}
                  onChange={(event) => setJoinRoomId(event.target.value)}
                  placeholder="Room ID để join"
                  className="flex-1 rounded-2xl border-2 border-gray-200 px-4 py-4 font-bold text-gray-900"
                />
                <button
                  onClick={joinLobbyRoom}
                  disabled={escrowSubmitting}
                  className="flex-1 rounded-2xl bg-cyan-600 hover:bg-cyan-700 px-5 py-4 font-black text-white shadow-lg transition-colors disabled:opacity-50"
                >
                  Join phòng escrow
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-700">
                <span>
                  Room tạo gần nhất:{" "}
                  <span className="font-black text-gray-900 break-all">
                    {createdRoomId ?? "Chưa có"}
                  </span>
                </span>
                {createdRoomId && (
                  <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-black text-gray-700">
                    Status: {roomStatusLabel}
                  </span>
                )}
                {createdRoomId && (
                  <button
                    onClick={cancelLobbyRoom}
                    disabled={roomStatus !== 0 || !sameAddress(roomCreator, account?.address)}
                    className="rounded-full border-2 border-red-200 bg-red-50 px-4 py-2 font-black text-red-700"
                  >
                    Hủy phòng
                  </button>
                )}
                {createdRoomId && roomStatus === 1 && (
                  <button
                    onClick={emergencyRefundOnChain}
                    disabled={
                      escrowSubmitting ||
                      Boolean(emergencyRefundReadyAt && emergencyRefundRemainingMs > 0)
                    }
                    className="rounded-full border-2 border-amber-300 bg-amber-50 px-4 py-2 font-black text-amber-800 disabled:opacity-60"
                  >
                    {emergencyRefundReadyAt && emergencyRefundRemainingMs > 0
                      ? `Emergency refund sau ${emergencyRefundRemainingMin} phút`
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
