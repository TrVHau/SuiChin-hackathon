import imgCanvas from "@/assets/1614d03f2c0a87e4a7d439824a8df00f623e3205.png";

function Container2() {
  return (
    <div
      className="h-[28px] relative shrink-0 w-[117.25px]"
      data-name="Container"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-0 text-[20px] text-white top-[-0.83px] w-[118px] whitespace-pre-wrap">
          Tier 1 Match
        </p>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div
      className="bg-[rgba(130,24,26,0.5)] h-[41.433px] relative rounded-[10px] shrink-0 w-[159.567px]"
      data-name="Button"
    >
      <div
        aria-hidden="true"
        className="absolute border-[#9f0712] border-[0.717px] border-solid inset-0 pointer-events-none rounded-[10px]"
      />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Arimo:Regular',sans-serif] font-normal leading-[24px] left-[79.72px] text-[#ff6467] text-[16px] text-center top-[8.03px]">
          Thoát (Chịu Thua)
        </p>
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div
      className="h-[74.15px] relative shrink-0 w-[919.017px]"
      data-name="Container"
    >
      <div
        aria-hidden="true"
        className="absolute border-[#364153] border-b-[0.717px] border-solid inset-0 pointer-events-none"
      />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between pb-[0.717px] px-[16px] relative size-full">
        <Container2 />
        <Button />
      </div>
    </div>
  );
}

function Canvas() {
  return (
    <div
      className="flex-[1_0_0] min-h-px min-w-px relative w-[919.017px]"
      data-name="Canvas"
    >
      <img
        alt=""
        className="absolute bg-clip-padding border-0 border-[transparent] border-solid inset-0 max-w-none object-contain pointer-events-none size-full"
        src={imgCanvas}
      />
    </div>
  );
}

function Container() {
  return (
    <div
      className="bg-[#1e2939] h-[543.733px] relative rounded-[24px] shrink-0 w-[920.45px]"
      data-name="Container"
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start overflow-clip p-[0.717px] relative rounded-[inherit] size-full">
        <Container1 />
        <Canvas />
      </div>
      <div
        aria-hidden="true"
        className="absolute border-[#364153] border-[0.717px] border-solid inset-0 pointer-events-none rounded-[24px]"
      />
    </div>
  );
}

function MatchScreen() {
  return (
    <div
      className="bg-[#101828] content-stretch flex flex-col h-[604.15px] items-center justify-center pb-[0.017px] relative shrink-0 w-full"
      data-name="MatchScreen"
    >
      <Container />
    </div>
  );
}

function App() {
  return (
    <div
      className="bg-[#f3f4f6] content-stretch flex flex-col h-[604.15px] items-start relative shrink-0 w-full"
      data-name="App"
    >
      <MatchScreen />
    </div>
  );
}

export default function SuiChinGameUiDesign() {
  return (
    <div
      className="bg-white content-stretch flex flex-col items-start relative size-full"
      data-name="SuiChin Game UI Design"
    >
      <App />
    </div>
  );
}
