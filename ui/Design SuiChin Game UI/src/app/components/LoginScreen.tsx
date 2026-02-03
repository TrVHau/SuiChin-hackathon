import svgPaths from "@/imports/svg-bw41mkky6u";
import imgImageWithFallback from "@/assets/33fbc04c76627a309d834a8eab1fb7c1a848ec4b.png";
import { Wallet } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
}

function WalletIcon() {
  return (
    <div className="relative shrink-0 size-[24px]">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 24 24"
      >
        <g>
          <path
            d={svgPaths.p1cbf6000}
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d={svgPaths.p10779400}
            stroke="white"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
}

function CheckIcon() {
  return (
    <div className="relative shrink-0 size-[16px]">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 16 16"
      >
        <g>
          <path
            d={svgPaths.p2d0e6200}
            stroke="#00A63E"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.33333"
          />
          <path
            d={svgPaths.p17134c00}
            stroke="#00A63E"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.33333"
          />
        </g>
      </svg>
    </div>
  );
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{
        backgroundImage:
          "linear-gradient(149.063deg, rgb(254, 252, 232) 0%, rgb(239, 246, 255) 100%)",
      }}
    >
      <div className="max-w-md w-full flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative">
          <div className="bg-white border-[#fdc700] border-[3.583px] border-solid overflow-clip rounded-full shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] size-[160px] flex items-center justify-center">
            <img
              alt="SuiChin Logo"
              className="absolute inset-0 max-w-none object-cover pointer-events-none size-full opacity-80"
              src={imgImageWithFallback}
            />
            <div className="relative z-10 shadow-[0px_3px_6px_0px_rgba(0,0,0,0.12)]">
              <p className="font-bold text-[48px] text-[#155dfc] leading-[48px]">
                SC
              </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="font-bold text-[60px] text-[#1e2939] leading-[60px] tracking-[-1.5px] mb-2">
            SuiChin
          </h1>
          <p className="font-normal text-[24px] text-[#4a5565] leading-[32px]">
            Búng chun, kiếm NFT!
          </p>
        </div>

        {/* Login Button & Info */}
        <div className="w-full max-w-[384px] flex flex-col gap-4">
          <button
            onClick={onLogin}
            className="bg-[#2b7fff] h-[68px] rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] w-full flex items-center justify-center gap-3 hover:bg-[#1a6eee] transition-colors"
          >
            <WalletIcon />
            <span className="font-bold text-[18px] text-white leading-[28px]">
              Đăng nhập với zkLogin
            </span>
          </button>

          <div className="bg-[#f0fdf4] border-[#dcfce7] border border-solid rounded-[14px] h-[37.433px] flex items-center justify-center gap-2 px-3">
            <CheckIcon />
            <p className="font-bold text-[14px] text-[#00a63e] leading-[20px]">
              Sponsored Transactions (Miễn phí gas)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
