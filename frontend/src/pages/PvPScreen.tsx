import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AlertCircle, ShieldCheck, Swords, Users } from "lucide-react";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import PageHeader from "@/components/common/PageHeader";
import { useGame } from "@/providers/GameContext";
import { usePvP } from "@/hooks/usePvP";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import {
  buildAddValuationLobbySignerTx,
  buildCancelValuationLobbyRoomTx,
  buildCreateValuationLobbyRoomTx,
  buildJoinValuationLobbyRoomTx,
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
  const { pvp, joinQueue, leaveQueue, reportRound, submitShot } = usePvP(
    profile?.objectId,
  );

  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { cuonChuns } = useOwnedNFTs();
  const [selectedLobbyNfts, setSelectedLobbyNfts] = useState<string[]>([]);
  const [escrowTargetPoints, setEscrowTargetPoints] = useState(
    LOBBY_DEFAULT_TARGET_POINTS,
  );
  const [escrowCoinMist, setEscrowCoinMist] = useState(LOBBY_DEFAULT_COIN_MIST);
  const [escrowDeadlineMinutes, setEscrowDeadlineMinutes] = useState(30);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [escrowSubmitting, setEscrowSubmitting] = useState(false);
  const [adminCapId, setAdminCapId] = useState<string | null>(null);
  const [signerInput, setSignerInput] = useState("signer_1");
  const [activeLobbySigner, setActiveLobbySigner] = useState<number[] | null>(
    null,
  );

  const handleBack = () => navigate("/dashboard");
  const handleLeave = () => {
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
    let cancelled = false;

    const loadSignerAndAdminCap = async () => {
      try {
        const [obj, ownedCaps] = await Promise.all([
          suiClient.getObject({
            id: LOBBY_CONFIG_OBJECT_ID,
            options: { showContent: true },
          }),
          account?.address
            ? suiClient.getOwnedObjects({
                owner: account.address,
                filter: {
                  StructType: `${LOBBY_PACKAGE_ID}::nft_valuation_lobby_config::LobbyAdminCap`,
                },
              })
            : Promise.resolve({ data: [] }),
        ]);

        const fields = (
          obj.data?.content as { fields?: Record<string, unknown> } | undefined
        )?.fields;
        const rawSigners = fields?.active_signer_pubkeys;

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
            return Object.values(record).flatMap((item) =>
              collectByteVectors(item),
            );
          }

          return [];
        };

        const signers = collectByteVectors(rawSigners);
        if (!cancelled) {
          setActiveLobbySigner(signers[0] ?? null);
          setAdminCapId(ownedCaps.data?.[0]?.data?.objectId ?? null);
        }
      } catch (error) {
        console.warn("Unable to load active signer from LobbyConfig", error);
        if (!cancelled) {
          setActiveLobbySigner(null);
          setAdminCapId(null);
        }
      }
    };

    void loadSignerAndAdminCap();

    return () => {
      cancelled = true;
    };
  }, [account?.address, suiClient]);

  const handleJoin = () => {
    if (!createdRoomId && !joinRoomId.trim()) {
      toast.error("Tạo room hoặc nhập Room ID trước khi vào queue realtime.");
      return;
    }

    joinQueue(0);
  };

  const addActiveSigner = async () => {
    if (escrowSubmitting) return;
    if (!adminCapId) {
      toast.error("Ví hiện tại không có LobbyAdminCap để add signer.");
      return;
    }
    if (!signerInput.trim()) {
      toast.error("Nhập signer pubkey trước khi add.");
      return;
    }

    setEscrowSubmitting(true);
    toast.loading("Đang add active signer pubkey...", {
      id: "lobby-add-signer",
    });

    const tx = buildAddValuationLobbySignerTx({
      adminCapId,
      signerPubkey: signerInput.trim(),
    });

    signAndExecute(
      { transaction: tx },
      {
        onSuccess: async () => {
          setActiveLobbySigner(
            Array.from(new TextEncoder().encode(signerInput.trim())),
          );
          toast.success("Đã add active signer pubkey thành công.", {
            id: "lobby-add-signer",
          });
          setEscrowSubmitting(false);
        },
        onError: (error) => {
          toast.error(
            `Add signer thất bại: ${String(error?.message ?? error)}`,
            {
              id: "lobby-add-signer",
            },
          );
          setEscrowSubmitting(false);
        },
      },
    );
  };

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
    if (!activeLobbySigner) {
      toast.error(
        "LobbyConfig chưa có active signer pubkey. Cần admin add signer trước.",
      );
      return;
    }
    if (selectedLobbyNfts.length === 0) {
      toast.error("Chọn ít nhất một NFT để khóa vào phòng.");
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
      signerPubkey: activeLobbySigner,
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

    setEscrowSubmitting(true);
    toast.loading("Đang hủy phòng escrow...", { id: "lobby-cancel" });

    const tx = buildCancelValuationLobbyRoomTx(createdRoomId);
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          setCreatedRoomId(null);
          toast.success("Đã hủy phòng escrow on-chain.", {
            id: "lobby-cancel",
          });
          setEscrowSubmitting(false);
        },
        onError: (error) => {
          toast.error(
            `Hủy phòng thất bại: ${String(error?.message ?? error)}`,
            {
              id: "lobby-cancel",
            },
          );
          setEscrowSubmitting(false);
        },
      },
    );
  };

  const isMe = (address: string) =>
    Boolean(account?.address && address === account.address);

  const renderContent = () => {
    if (pvp.status === "idle" || pvp.status === "error") {
      return (
        <div className="rounded-3xl border-4 border-violet-300 bg-violet-50 p-5">
          <h3 className="font-black text-xl text-gray-900 mb-2">
            Bắt đầu PvP realtime
          </h3>
          <p className="text-sm text-gray-700 font-semibold leading-6 mb-4">
            PvP hiện không còn cược Chun theo queue. Giá trị cược lấy từ room
            escrow on-chain (NFT + SUI) ở panel bên phải.
          </p>
          <button
            onClick={handleJoin}
            className="w-full rounded-2xl bg-red-300 px-5 py-4 font-black text-white shadow-lg"
          >
            Tìm trận realtime
          </button>
        </div>
      );
    }

    if (pvp.status === "connecting" || pvp.status === "waiting") {
      return <PvpSearchingCard wager={pvp.wager} onCancel={handleLeave} />;
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
      return <PvpResolvedCard pvp={pvp} isMe={isMe} onBack={handleLeave} />;
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-sunny-gradient pb-20 relative">
      <div className="max-w-6xl mx-auto px-4 pt-6">
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

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-4xl border-8 border-red-300 shadow-2xl p-6 md:p-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-4 py-2 text-sm font-bold text-red-700">
                  <Swords className="size-4" />
                  Realtime PvP
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-200 px-4 py-2 text-sm font-bold text-sky-700">
                  <ShieldCheck className="size-4" />
                  Backend finalize
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="rounded-3xl border-4 border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Trạng thái
                  </p>
                  <p className="font-black text-xl text-gray-900 capitalize">
                    {pvp.status}
                  </p>
                </div>
                <div className="rounded-3xl border-4 border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Mô hình cược
                  </p>
                  <p className="font-black text-sm text-gray-900">
                    Escrow tổng giá trị NFT + SUI
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Queue realtime không dùng mức cược Chun cố định nữa.
                  </p>
                </div>
                <div className="rounded-3xl border-4 border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                    Đối thủ
                  </p>
                  <p className="font-black text-sm text-gray-900 break-all">
                    {pvp.opponent ?? "Chưa có"}
                  </p>
                </div>
              </div>

              {renderContent()}
            </div>

            {(pvp.status === "playing" || pvp.status === "submitting") && (
              <div className="bg-white rounded-4xl border-4 border-sky-200 shadow-xl p-5">
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
            <div className="bg-white rounded-4xl border-8 border-playful-blue shadow-2xl p-6">
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

              <div className="mt-5 rounded-3xl bg-sky-50 border-2 border-sky-200 p-4">
                <p className="text-xs font-bold text-sky-700 uppercase mb-1">
                  Ghi chú
                </p>
                <p className="text-sm text-sky-900 font-semibold leading-6">
                  PvP hiện dùng queue socket realtime cho phần ghép trận. Cơ chế
                  contract valuation lobby mới là lớp escrow/settlement theo
                  tổng giá trị NFT + Chun/SUI, đã được đồng bộ trong spec.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-4xl border-8 border-playful-green shadow-2xl p-6 md:p-8">
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

              <div className="mb-5 rounded-3xl border-2 border-sky-200 bg-sky-50 p-4">
                <p className="text-xs font-bold text-sky-700 uppercase mb-1">
                  Trạng thái signer
                </p>
                <p className="text-sm text-sky-900 font-semibold leading-6">
                  {activeLobbySigner
                    ? "LobbyConfig đã có active signer. Có thể tạo room escrow."
                    : "LobbyConfig chưa có active signer pubkey. Cần admin add signer trước."}
                </p>
                {!activeLobbySigner && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <input
                      value={signerInput}
                      onChange={(event) => setSignerInput(event.target.value)}
                      placeholder="Signer pubkey dạng text"
                      className="rounded-2xl border-2 border-sky-200 bg-white px-4 py-3 font-semibold text-gray-900"
                    />
                    <button
                      onClick={addActiveSigner}
                      disabled={!adminCapId || escrowSubmitting}
                      className="rounded-2xl bg-sky-500 px-4 py-3 font-black text-white disabled:opacity-50"
                    >
                      Add signer (admin)
                    </button>
                  </div>
                )}
                <p className="mt-2 text-xs text-sky-700 font-semibold break-all">
                  Admin cap hiện tại: {adminCapId ?? "Không có trong ví này"}
                </p>
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

              <div className="mb-5 rounded-3xl border-2 border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-700">
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
                  className="flex-1 rounded-2xl bg-playful-green px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
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
                  className="flex-1 rounded-2xl bg-playful-purple px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
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
                  <button
                    onClick={cancelLobbyRoom}
                    className="rounded-full border-2 border-red-200 bg-red-50 px-4 py-2 font-black text-red-700"
                  >
                    Hủy phòng
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-4xl border-4 border-gray-200 shadow-xl p-6">
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
