import svgPaths from "./svg-dawdv5j9x6";

function Heading() {
  return (
    <div className="h-[36px] relative shrink-0 w-[196.867px]" data-name="Heading 2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[36px] left-0 text-[#1e2939] text-[30px] top-[-0.92px]">Game Session</p>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p2cf60600} id="Vector" stroke="var(--stroke-0, #FF6900)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Text() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#364153] text-[16px] top-[-0.68px] w-[67px] whitespace-pre-wrap">Streak: 0</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="bg-white h-[40px] relative rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-[126.217px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center px-[16px] relative size-full">
        <Icon />
        <Text />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="absolute left-[24px] size-[20px] top-[14px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p14ca9100} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d="M17.5 10H7.5" id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
          <path d={svgPaths.p38966ca0} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-[#fb2c36] flex-[1_0_0] h-[48px] min-h-px min-w-px relative rounded-[14px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon1 />
        <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-[114px] text-[16px] text-center text-white top-[9.17px]">Kết thúc Session</p>
      </div>
    </div>
  );
}

function Container2() {
  return (
    <div className="h-[48px] relative shrink-0 w-[343.133px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[16px] items-center relative size-full">
        <Container3 />
        <Button />
      </div>
    </div>
  );
}

function Container1() {
  return (
    <div className="absolute content-stretch flex h-[48px] items-center justify-between left-[24px] top-0 w-[904.45px]" data-name="Container">
      <Heading />
      <Container2 />
    </div>
  );
}

function Paragraph() {
  return (
    <div className="absolute h-[28px] left-[24px] top-[80px] w-[904.45px]" data-name="Paragraph">
      <p className="-translate-x-1/2 absolute font-['Arimo:Regular',sans-serif] font-normal leading-[28px] left-[452.83px] text-[#4a5565] text-[18px] text-center top-[-2.27px]">Chọn chun để thi đấu. Thắng +1, Thua -1.</p>
    </div>
  );
}

function Heading1() {
  return (
    <div className="h-[32px] relative shrink-0 w-[149.683px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[32px] left-0 text-[#1e2939] text-[24px] top-[-3.92px]">Tier 1 (Đồng)</p>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="bg-white h-[44px] relative rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-[51.9px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[16px] text-[#1e2939] text-[18px] top-[7.88px] w-[20px] whitespace-pre-wrap">x5</p>
      </div>
    </div>
  );
}

function TierCard() {
  return (
    <div className="absolute content-stretch flex h-[44px] items-start justify-between left-[32px] top-[32px] w-[218.617px]" data-name="TierCard">
      <Heading1 />
      <Container5 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-0 size-[20px] top-[4px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p1775ffc0} id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[28px] relative shrink-0 w-[107.7px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon2 />
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[28px] text-[#00a63e] text-[18px] top-[-2.27px]">Đặt Cược</p>
      </div>
    </div>
  );
}

function Icon3() {
  return (
    <div className="relative size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function TierCard1() {
  return (
    <div className="absolute content-stretch flex h-[28px] items-center justify-between left-[32px] top-[100px] w-[218.617px]" data-name="TierCard">
      <Text1 />
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none rotate-180">
          <Icon3 />
        </div>
      </div>
    </div>
  );
}

function TierCard2() {
  return <div className="absolute h-[160px] left-0 opacity-20 rounded-[24px] top-0 w-[282.617px]" data-name="TierCard" style={{ backgroundImage: "linear-gradient(150.484deg, rgb(255, 137, 4) 0%, rgb(255, 214, 167) 100%)" }} />;
}

function Button1() {
  return (
    <div className="absolute bg-white border-[1.433px] border-[rgba(0,0,0,0)] border-solid h-[162.867px] left-0 rounded-[24px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1),0px_8px_10px_0px_rgba(0,0,0,0.1)] top-0 w-[285.483px]" data-name="Button">
      <TierCard />
      <TierCard1 />
      <TierCard2 />
    </div>
  );
}

function Heading2() {
  return (
    <div className="h-[32px] relative shrink-0 w-[131.15px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[32px] left-0 text-[#1e2939] text-[24px] top-[-3.92px]">Tier 2 (Bạc)</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="bg-white h-[44px] relative rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-[51.9px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[16px] text-[#1e2939] text-[18px] top-[7.88px] w-[20px] whitespace-pre-wrap">x3</p>
      </div>
    </div>
  );
}

function TierCard3() {
  return (
    <div className="absolute content-stretch flex h-[44px] items-start justify-between left-[32px] top-[32px] w-[218.617px]" data-name="TierCard">
      <Heading2 />
      <Container6 />
    </div>
  );
}

function Icon4() {
  return (
    <div className="absolute left-0 size-[20px] top-[4px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p231a5100} id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Text2() {
  return (
    <div className="h-[28px] relative shrink-0 w-[107.7px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon4 />
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[28px] text-[#00a63e] text-[18px] top-[-2.27px]">Đặt Cược</p>
      </div>
    </div>
  );
}

function Icon5() {
  return (
    <div className="relative size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function TierCard4() {
  return (
    <div className="absolute content-stretch flex h-[28px] items-center justify-between left-[32px] top-[100px] w-[218.617px]" data-name="TierCard">
      <Text2 />
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none rotate-180">
          <Icon5 />
        </div>
      </div>
    </div>
  );
}

function TierCard5() {
  return <div className="absolute h-[160px] left-0 opacity-20 rounded-[24px] top-0 w-[282.617px]" data-name="TierCard" style={{ backgroundImage: "linear-gradient(150.484deg, rgb(153, 161, 175) 0%, rgb(229, 231, 235) 100%)" }} />;
}

function Button2() {
  return (
    <div className="absolute bg-white border-[1.433px] border-[rgba(0,0,0,0)] border-solid h-[162.867px] left-[309.48px] rounded-[24px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1),0px_8px_10px_0px_rgba(0,0,0,0.1)] top-0 w-[285.483px]" data-name="Button">
      <TierCard3 />
      <TierCard4 />
      <TierCard5 />
    </div>
  );
}

function Heading3() {
  return (
    <div className="h-[32px] relative shrink-0 w-[147.467px]" data-name="Heading 3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[32px] left-0 text-[#1e2939] text-[24px] top-[-0.33px]">Tier 3 (Vàng)</p>
      </div>
    </div>
  );
}

function Container7() {
  return (
    <div className="bg-white h-[44px] relative rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 w-[51.9px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[16px] text-[#1e2939] text-[18px] top-[7.88px] w-[20px] whitespace-pre-wrap">x2</p>
      </div>
    </div>
  );
}

function TierCard6() {
  return (
    <div className="absolute content-stretch flex h-[44px] items-start justify-between left-[32px] top-[32px] w-[218.617px]" data-name="TierCard">
      <Heading3 />
      <Container7 />
    </div>
  );
}

function Icon6() {
  return (
    <div className="absolute left-0 size-[20px] top-[4px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d={svgPaths.p231a5100} id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function Text3() {
  return (
    <div className="h-[28px] relative shrink-0 w-[107.7px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Icon6 />
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[28px] text-[#00a63e] text-[18px] top-[-2.27px]">Đặt Cược</p>
      </div>
    </div>
  );
}

function Icon7() {
  return (
    <div className="relative size-[20px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="Icon">
          <path d="M12.5 15L7.5 10L12.5 5" id="Vector" stroke="var(--stroke-0, #00A63E)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
        </g>
      </svg>
    </div>
  );
}

function TierCard7() {
  return (
    <div className="absolute content-stretch flex h-[28px] items-center justify-between left-[32px] top-[100px] w-[218.617px]" data-name="TierCard">
      <Text3 />
      <div className="flex items-center justify-center relative shrink-0">
        <div className="flex-none rotate-180">
          <Icon7 />
        </div>
      </div>
    </div>
  );
}

function TierCard8() {
  return <div className="absolute h-[160px] left-0 opacity-20 rounded-[24px] top-0 w-[282.617px]" data-name="TierCard" style={{ backgroundImage: "linear-gradient(150.484deg, rgb(253, 199, 0) 0%, rgb(254, 249, 194) 100%)" }} />;
}

function Button3() {
  return (
    <div className="absolute bg-white border-[1.433px] border-[rgba(0,0,0,0)] border-solid h-[162.867px] left-[618.97px] rounded-[24px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1),0px_8px_10px_0px_rgba(0,0,0,0.1)] top-0 w-[285.483px]" data-name="Button">
      <TierCard6 />
      <TierCard7 />
      <TierCard8 />
    </div>
  );
}

function Container4() {
  return (
    <div className="absolute h-[162.867px] left-[24px] top-[148px] w-[904.45px]" data-name="Container">
      <Button1 />
      <Button2 />
      <Button3 />
    </div>
  );
}

function Heading4() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 3">
      <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#364153] text-[16px] top-[-0.68px]">Session Log (Unsaved):</p>
    </div>
  );
}

function Text4() {
  return (
    <div className="h-[20px] relative shrink-0 w-[58.8px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Cousine:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#4a5565] text-[14px] top-[-0.25px] w-[59px] whitespace-pre-wrap">Δ T1: 0</p>
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[20px] relative shrink-0 w-[58.8px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Cousine:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#4a5565] text-[14px] top-[-0.25px] w-[59px] whitespace-pre-wrap">Δ T2: 0</p>
      </div>
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[20px] relative shrink-0 w-[58.8px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Cousine:Regular',sans-serif] leading-[20px] left-0 not-italic text-[#4a5565] text-[14px] top-[-0.25px] w-[59px] whitespace-pre-wrap">Δ T3: 0</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="content-stretch flex gap-[16px] h-[20px] items-start relative shrink-0 w-full" data-name="Container">
      <Text4 />
      <Text5 />
      <Text6 />
    </div>
  );
}

function Container8() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] h-[101.433px] items-start left-[24px] pb-[0.717px] pt-[24.717px] px-[24.717px] rounded-[16px] top-[358.87px] w-[904.45px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[0.717px] border-solid border-white inset-0 pointer-events-none rounded-[16px]" />
      <Heading4 />
      <Container9 />
    </div>
  );
}

function Container() {
  return (
    <div className="h-[460.3px] relative shrink-0 w-[952.45px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Container1 />
        <Paragraph />
        <Container4 />
        <Container8 />
      </div>
    </div>
  );
}

function GameSessionManager() {
  return (
    <div className="bg-[#eef2ff] content-stretch flex flex-col h-[604.15px] items-center pb-[103.85px] pt-[40px] relative shrink-0 w-full" data-name="GameSessionManager">
      <Container />
    </div>
  );
}

function App() {
  return (
    <div className="bg-[#f3f4f6] content-stretch flex flex-col h-[604.15px] items-start relative shrink-0 w-full" data-name="App">
      <GameSessionManager />
    </div>
  );
}

export default function SuiChinGameUiDesign() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start relative size-full" data-name="SuiChin Game UI Design">
      <App />
    </div>
  );
}