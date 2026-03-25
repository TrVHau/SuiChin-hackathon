import { ArrowUpCircle } from "lucide-react";

interface TradeInfoCardProps {
  inputEmoji: string;
  outputEmoji: string;
  inputRequired: number;
  successChance: string;
}

export default function TradeInfoCard({
  inputEmoji,
  outputEmoji,
  inputRequired,
  successChance,
}: TradeInfoCardProps) {
  return (
    <div className="bg-white rounded-4xl shadow-2xl p-6 border-8 border-playful-orange mb-6">
      <div className="flex items-center justify-around text-center">
        <div>
          <p className="text-4xl">{inputEmoji}</p>
          <p className="font-black text-2xl text-gray-900">{inputRequired}x</p>
          <p className="text-sm text-gray-500 font-semibold">Input (bị burn)</p>
        </div>
        <ArrowUpCircle className="size-10 text-playful-orange" />
        <div>
          <p className="text-4xl">{outputEmoji}</p>
          <p className="font-black text-2xl text-playful-green">{successChance}</p>
          <p className="text-sm text-gray-500 font-semibold">Thành công</p>
        </div>
      </div>
      <p className="text-center text-gray-500 font-semibold text-sm mt-4">
         Các NFT được chọn sẽ bị burn bất kể kết quả
      </p>
    </div>
  );
}
