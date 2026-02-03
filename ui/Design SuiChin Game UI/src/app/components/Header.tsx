import { User } from "lucide-react";

interface HeaderProps {
  tier1: number;
  tier2: number;
  tier3: number;
  totalPoints: number;
  address: string;
  onUserClick?: () => void;
}

export default function Header({ tier1, tier2, tier3, totalPoints, address, onUserClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-[#fdc700] size-[56px] rounded-lg flex items-center justify-center">
            <span className="font-bold text-[24px] text-[#155dfc]">SC</span>
          </div>
          <h1 className="font-bold text-[24px] text-[#1e2939]">SuiChin</h1>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Chun Counters */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-[#fff7ed] border-2 border-[#ff8904] rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-[20px]">🥉</span>
              <span className="font-bold text-[18px] text-[#1e2939]">{tier1}</span>
            </div>
            <div className="bg-[#f9fafb] border-2 border-[#99a1af] rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-[20px]">🥈</span>
              <span className="font-bold text-[18px] text-[#1e2939]">{tier2}</span>
            </div>
            <div className="bg-[#fefce8] border-2 border-[#fdc700] rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-[20px]">🥇</span>
              <span className="font-bold text-[18px] text-[#1e2939]">{tier3}</span>
            </div>
          </div>

          {/* Total Points */}
          <div className="hidden sm:flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl border-2 border-yellow-200">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="font-bold text-[16px] text-gray-900">{totalPoints}</span>
            <span className="text-[14px] text-gray-600">pts</span>
          </div>

          {/* User Info */}
          <button
            onClick={onUserClick}
            className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 transition-colors px-4 py-2 rounded-xl border border-blue-200"
          >
            <div className="hidden sm:block text-right">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">zkLogin</div>
              <div className="text-[12px] font-mono text-gray-900">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
            </div>
            <div className="bg-blue-500 p-2 rounded-full">
              <User className="size-5 text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
