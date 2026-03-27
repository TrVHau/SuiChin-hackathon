import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { usePvP } from "@/hooks/usePvP";
import PageHeader from "@/components/common/PageHeader";
import { useGame } from "@/providers/GameContext";
import {
  PvpWagerCard,
  PvpSearchingCard,
  PvpMatchedCard,
  PvpPlayingCard,
  PvpResolvedCard,
} from "@/components/pvp";

export default function PvPScreen() {
  const navigate = useNavigate();
  const { playerData, refreshProfile } = useGame();
  const resolvedProfileId = playerData?.objectId ?? "";
  const resolvedChunRaw = playerData?.chun_raw ?? 0;
  const handleBack = () => navigate("/dashboard");
  const handleSuccess = () => void refreshProfile();
  const account = useCurrentAccount();
  const { pvp, joinQueue, leaveQueue, submitShot, resolveLocalMatch } = usePvP(resolvedProfileId);
  const [selectedWager, setSelectedWager] = useState(5);

  const handleJoin = () => {
    if (resolvedChunRaw < selectedWager) return;
    joinQueue(selectedWager);
  };

  const isMe = (addr: string) => addr === account?.address;

  return (
    <div className="min-h-screen bg-gradient-to-br from-playful-purple/20 via-white to-playful-blue/20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <PageHeader
          onBack={handleBack}
          title="PvP Online"
          emoji="⚔️"
          backBorderClass="border-playful-purple"
          backIconClass="text-playful-purple"
        />

        {(pvp.status === "idle" || pvp.status === "error") && (
          <PvpWagerCard
            selectedWager={selectedWager}
            chunRaw={resolvedChunRaw}
            onSelect={setSelectedWager}
            onJoin={handleJoin}
          />
        )}

        {(pvp.status === "connecting" || pvp.status === "waiting") && (
          <PvpSearchingCard wager={pvp.wager} onCancel={leaveQueue} />
        )}

        {(pvp.status === "matched" || pvp.status === "submitting") && (
          <PvpMatchedCard
            opponent={pvp.opponent}
            submitting={pvp.status === "submitting"}
          />
        )}

        {pvp.status === "playing" && (
          <PvpPlayingCard
            pvp={pvp}
            myAddress={account?.address}
            onShoot={submitShot}
            onLocalFinish={resolveLocalMatch}
          />
        )}

        {pvp.status === "resolved" && (
          <PvpResolvedCard
            pvp={pvp}
            isMe={isMe}
            onBack={() => {
              handleSuccess();
              handleBack();
            }}
          />
        )}
      </div>
    </div>
  );
}
