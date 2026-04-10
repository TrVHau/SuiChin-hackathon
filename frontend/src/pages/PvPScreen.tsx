import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit";
import PageHeader from "@/components/common/PageHeader";
import { useGame } from "@/providers/GameContext";
import { usePvPSocket, RoomState } from "@/hooks/usePvPSocket";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";

export default function PvPScreen() {
  const navigate = useNavigate();
  const { account } = useGame();

  // Hardcoded room ID for testing the system. In a real app this would come from a queue matched on the database server.
  const [roomId, setRoomId] = useState("ROOM_TEST_123");

  const {
    roomState,
    playersReady,
    isDisconnected,
    opponentDisconnected,
    matchResult,
    selectNft,
  } = usePvPSocket(roomId);

  const { cuonChuns } = useOwnedNFTs();
  const [selectedNft, setSelectedNft] = useState("");

  const handleBack = () => navigate("/dashboard");

  const handleSelect = (nftId: string) => {
    setSelectedNft(nftId);
    selectNft(nftId);
  };

  const submitSettlement = async () => {
    // In future iteration, we will invoke the Move Settle function here using:
    // const tx = new TransactionBlock();
    // tx.moveCall({ ... });
    // client.signAndExecuteTransactionBlock({ transactionBlock: tx, signature: matchResult.signatureBytes })
    console.log("Settlement Payload from Backend:", matchResult);
    alert("Match has been settled via smart contract! Check console.");
  };

  return (
    <div className="min-h-screen bg-sunny-gradient pb-20 relative">
      <PageHeader title="PvP Lobby (Socket Gateway)" onBack={handleBack} />

      <div className="max-w-2xl mx-auto px-4 mt-6">
        {isDisconnected && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            Mất kết nối với Gateway Server. Đang thử lại...
          </div>
        )}

        {opponentDisconnected && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
            Đối thủ bị mất kết nối. Chờ trong Grace Period (30s) trước khi xử lý
            thắng tự động...
          </div>
        )}

        <div className="bg-white rounded-3xl p-6 shadow-playful mt-4">
          {!roomState ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-playful-blue to-playful-purple mb-4">
                Đang tìm phòng...
              </h2>
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          ) : roomState === RoomState.WAITING_FOR_PLAYERS ? (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold mb-4 text-gray-800">
                Đang chờ đối thủ... ({playersReady}/2)
              </h2>
              <div className="animate-pulse text-4xl mt-2">🔍</div>
            </div>
          ) : roomState === RoomState.CHOOSING_PHASE ? (
            <div>
              <h2 className="text-2xl font-black text-center mb-6 text-gray-800">
                Chọn Cuộn Chun
              </h2>
              {selectedNft ? (
                <div className="text-center py-8">
                  <p className="text-lg font-medium text-playful-green">
                    Đã khóa lựa chọn! Đang chờ đối thủ...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {cuonChuns.map((nft) => (
                    <div
                      key={nft.objectId}
                      onClick={() => handleSelect(nft.objectId)}
                      className="border-4 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-playful-blue transition-colors text-center"
                    >
                      <span className="text-4xl mb-2 block">🐾</span>
                      <p className="font-bold text-sm">Tier: {nft.tier}</p>
                      <p className="text-xs text-gray-500">Pow: {nft.power}</p>
                    </div>
                  ))}
                  {cuonChuns.length === 0 && (
                    <p className="col-span-2 text-center text-gray-500">
                      Bạn không có NFT nào để chọn!
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : roomState === RoomState.VALUATING_PHASE ? (
            <div className="text-center py-10">
              <h2 className="text-2xl font-black text-playful-purple mb-4 animate-bounce">
                Đang quyết đấu!
              </h2>
              <div className="flex justify-center gap-8 text-6xl">
                <span className="animate-pulse">⚔️</span>
              </div>
            </div>
          ) : roomState === RoomState.SETTLED && matchResult ? (
            <div className="text-center py-8">
              <h2
                className={`text-4xl font-black mb-4 uppercase ${matchResult.winner === account?.address ? "text-playful-green" : "text-red-500"}`}
              >
                {matchResult.winner === account?.address
                  ? "Bạn Đã Thắng! 🎉"
                  : "Bạn Đã Thua 🤡"}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Chữ ký phân định từ Cổng Backend đã được tiếp nhận.
              </p>
              <button
                onClick={submitSettlement}
                className="w-full h-16 bg-gradient-to-r from-playful-blue to-playful-purple text-white font-bold text-2xl rounded-full shadow-lg transform transition active:scale-95"
              >
                Xác Nhận (On-chain) 🔒
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
