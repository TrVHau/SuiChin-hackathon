import { Search, Swords, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/common/PageHeader";
import {
  PvpMatchedCard,
  PvpPlayingCard,
  PvpResolvedCard,
  PvpSearchingCard,
} from "@/components/pvp";
import { usePvP } from "@/hooks/usePvP";
import { useGame } from "@/providers/GameContext";

export default function PvPScreen() {
  const navigate = useNavigate();
  const { account, profile } = useGame();
  const {
    pvp,
    connectRoomSocket,
    disconnectRoomSocket,
    submitShot,
    reportRound,
  } = usePvP(profile?.objectId);

  const isMe = (address: string) =>
    Boolean(
      account?.address &&
        address &&
        account.address.toLowerCase() === address.toLowerCase(),
    );

  const handleBack = () => {
    disconnectRoomSocket();
    navigate("/dashboard");
  };

  const startMatchmaking = () => {
    connectRoomSocket();
  };

  const renderContent = () => {
    if (pvp.status === "idle" || pvp.status === "error") {
      return (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                  PvP Online
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">
                  Tim doi thu
                </h3>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                  Vao hang cho, ghep tran realtime va thi dau ban chun truc
                  tuyen.
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <Swords className="size-6 text-emerald-600" />
                  <h4 className="text-xl font-black text-slate-950">
                    Dau realtime
                  </h4>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  Moi cu ban duoc dong bo qua socket. He thong quan ly luot va
                  ket qua tren backend.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <Users className="size-6 text-sky-600" />
                  <h4 className="text-xl font-black text-slate-950">
                    Ghep nguoi choi
                  </h4>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                  Chi can ket noi vi va tim doi thu. Khong co cuoc, phat
                  thuong hay khoa tai san.
                </p>
              </div>
            </div>

            <button
              onClick={startMatchmaking}
              data-testid="pvp-join-queue-button"
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-6 py-4 text-lg font-black text-white shadow-xl shadow-emerald-100 transition-colors hover:bg-emerald-700 disabled:opacity-50"
              disabled={!account?.address}
            >
              <Search className="size-5" />
              Tim doi thu
            </button>
          </div>
        </div>
      );
    }

    if (pvp.status === "connecting" || pvp.status === "waiting") {
      return (
        <PvpSearchingCard
          onCancel={disconnectRoomSocket}
          roomId={pvp.roomId ?? undefined}
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
          onSubmitShot={submitShot}
          onReportResult={reportRound}
        />
      );
    }

    if (pvp.status === "resolved") {
      return <PvpResolvedCard pvp={pvp} isMe={isMe} onBack={handleBack} />;
    }

    return null;
  };

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_10%_20%,#fff4d6,transparent_40%),radial-gradient(circle_at_90%_0%,#d7f7f0,transparent_35%),linear-gradient(145deg,#fffdf6_0%,#fff4c9_45%,#ffe3c2_100%)] pb-20">
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <PageHeader
          title="PvP Arena"
          emoji="⚔️"
          subtitle="PvP ban chun realtime"
          onBack={handleBack}
          backBorderClass="border-red-300"
          backIconClass="text-red-500"
          rightSlot={
            <button
              onClick={handleBack}
              className="rounded-full border-4 border-gray-200 bg-white px-5 py-3 font-bold text-gray-700 shadow-lg transition-colors hover:border-red-300 hover:text-red-600"
            >
              Thoat phong
            </button>
          }
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-20">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-red-200 bg-white/90 p-6 shadow-[0_20px_50px_rgba(239,68,68,0.12)] backdrop-blur md:p-8">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
