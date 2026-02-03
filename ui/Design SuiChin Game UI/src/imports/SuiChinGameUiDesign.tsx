import svgPaths from "./svg-bw41mkky6u";
import imgImageWithFallback from "@/assets/33fbc04c76627a309d834a8eab1fb7c1a848ec4b.png";

function Icon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 24 24"
      >
        <g id="Icon">
          <path
            d={svgPaths.p1cbf6000}
            id="Vector"
            stroke="var(--stroke-0, white)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
          <path
            d={svgPaths.p10779400}
            id="Vector_2"
            stroke="var(--stroke-0, white)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </g>
      </svg>
    </div>
  );
}

function ConnectWalletScreen1() {
  return (
    <div
      className="h-[28px] relative shrink-0 w-[192.383px]"
      data-name="ConnectWalletScreen"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[96.5px] text-[18px] text-center text-white top-[-2.27px]">
          Đăng nhập với zkLogin
        </p>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div
      className="bg-[#2b7fff] h-[68px] relative rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 w-full"
      data-name="Button"
    >
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[12px] items-center justify-center pr-[0.017px] relative size-full">
          <Icon />
          <ConnectWalletScreen1 />
        </div>
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg
        className="block size-full"
        fill="none"
        preserveAspectRatio="none"
        viewBox="0 0 16 16"
      >
        <g id="Icon">
          <path
            d={svgPaths.p2d0e6200}
            id="Vector"
            stroke="var(--stroke-0, #00A63E)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.33333"
          />
          <path
            d={svgPaths.p17134c00}
            id="Vector_2"
            stroke="var(--stroke-0, #00A63E)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.33333"
          />
        </g>
      </svg>
    </div>
  );
}

function Text() {
  return (
    <div className="h-[20px] relative shrink-0 w-[252.233px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[20px] left-[126px] text-[#00a63e] text-[14px] text-center top-[-2.4px]">
          Sponsored Transactions (Miễn phí gas)
        </p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div
      className="bg-[#f0fdf4] h-[37.433px] relative rounded-[14px] shrink-0 w-full"
      data-name="Container"
    >
      <div
        aria-hidden="true"
        className="absolute border-[#dcfce7] border-[0.717px] border-solid inset-0 pointer-events-none rounded-[14px]"
      />
      <div className="flex flex-row items-center justify-center size-full">
        <div className="content-stretch flex gap-[8px] items-center justify-center p-[0.717px] relative size-full">
          <Icon1 />
          <Text />
        </div>
      </div>
    </div>
  );
}

function Container() {
  return (
    <div
      className="absolute content-stretch flex flex-col gap-[16px] h-[121.433px] items-start left-[311.82px] top-[407.35px] w-[384px]"
      data-name="Container"
    >
      <Button />
      <Container1 />
    </div>
  );
}

function ConnectWalletScreen2() {
  return (
    <div
      className="absolute h-[60px] left-0 top-[184px] w-[237.267px]"
      data-name="ConnectWalletScreen"
    >
      <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[60px] left-[118.65px] text-[#1e2939] text-[60px] text-center top-[-2.18px] tracking-[-1.5px]">
        SuiChin
      </p>
    </div>
  );
}

function ConnectWalletScreen3() {
  return (
    <div
      className="absolute h-[32px] left-0 top-[252px] w-[237.267px]"
      data-name="ConnectWalletScreen"
    >
      <p className="-translate-x-1/2 absolute font-['Arimo:Regular',sans-serif] font-normal leading-[32px] left-[119.5px] text-[#4a5565] text-[24px] text-center top-[-3.92px]">
        Búng chun, kiếm NFT!
      </p>
    </div>
  );
}

function ImageWithFallback() {
  return (
    <div
      className="absolute left-0 opacity-80 size-[152.833px] top-0"
      data-name="ImageWithFallback"
    >
      <img
        alt=""
        className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
        src={imgImageWithFallback}
      />
    </div>
  );
}

function Text1() {
  return (
    <div
      className="absolute h-[48px] left-[46.9px] shadow-[0px_3px_6px_0px_rgba(0,0,0,0.12)] top-[52.42px] w-[59.033px]"
      data-name="Text"
    >
      <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[48px] left-[30.5px] text-[#155dfc] text-[48px] text-center top-[-1.67px]">
        SC
      </p>
    </div>
  );
}

function ConnectWalletScreen4() {
  return (
    <div
      className="absolute bg-white border-[#fdc700] border-[3.583px] border-solid left-[38.63px] overflow-clip rounded-[3.402820018375656e+38px] shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_8px_10px_-6px_rgba(0,0,0,0.1)] size-[160px] top-0"
      data-name="ConnectWalletScreen"
    >
      <ImageWithFallback />
      <Text1 />
    </div>
  );
}

function Container2() {
  return (
    <div
      className="absolute h-[284px] left-[385.18px] top-[75.35px] w-[237.267px]"
      data-name="Container"
    >
      <ConnectWalletScreen2 />
      <ConnectWalletScreen3 />
      <ConnectWalletScreen4 />
    </div>
  );
}

function ConnectWalletScreen() {
  return (
    <div
      className="h-[604.15px] relative shrink-0 w-full"
      data-name="ConnectWalletScreen"
      style={{
        backgroundImage:
          "linear-gradient(149.063deg, rgb(254, 252, 232) 0%, rgb(239, 246, 255) 100%), linear-gradient(90deg, rgb(243, 244, 246) 0%, rgb(243, 244, 246) 100%)",
      }}
    >
      <Container />
      <Container2 />
    </div>
  );
}

export default function SuiChinGameUiDesign() {
  return (
    <div
      className="bg-white content-stretch flex flex-col items-start relative size-full"
      data-name="SuiChin Game UI Design"
    >
      <ConnectWalletScreen />
    </div>
  );
}
