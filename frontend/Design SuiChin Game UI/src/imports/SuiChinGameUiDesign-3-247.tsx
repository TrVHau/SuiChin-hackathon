function Icon() {
  return (
    <div className="h-[24px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/4 left-[37.5%] right-[37.5%] top-1/4" data-name="Vector">
        <div className="absolute inset-[-8.33%_-16.67%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 8 14">
            <path d="M7 13L1 7L7 1" id="Vector" stroke="var(--stroke-0, #4A5565)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="bg-white relative rounded-[16px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] shrink-0 size-[56px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[16px] px-[16px] relative size-full">
        <Icon />
      </div>
    </div>
  );
}

function Heading() {
  return (
    <div className="h-[36px] relative shrink-0 w-[226.467px]" data-name="Heading 1">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[36px] left-0 text-[#1e2939] text-[30px] top-[-5.22px]">Mint Cuộn Chun</p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex gap-[24px] h-[88px] items-center relative shrink-0 w-full" data-name="Header">
      <Button />
      <Heading />
    </div>
  );
}

function Heading1() {
  return (
    <div className="h-[24px] relative shrink-0 w-full" data-name="Heading 3">
      <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#364153] text-[16px] top-[-2.83px]">Chọn Chun để đổi điểm</p>
    </div>
  );
}

function Container4() {
  return <div className="bg-[#ff8904] rounded-[3.402820018375656e+38px] shrink-0 size-[16px]" data-name="Container" />;
}

function Text() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#364153] text-[16px] top-[-2.83px]">Tier 1 (1 điểm)</p>
      </div>
    </div>
  );
}

function Container3() {
  return (
    <div className="h-[24px] relative shrink-0 w-[131.85px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Container4 />
        <Text />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="h-[16px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.67px_-7.14%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 1.33333">
            <path d="M0.666667 0.666667H10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="bg-[#f3f4f6] relative rounded-[10px] shrink-0 size-[32px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon1 />
      </div>
    </div>
  );
}

function Text1() {
  return (
    <div className="h-[24px] relative shrink-0 w-[32px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Cousine:Bold',sans-serif] leading-[24px] left-[16.2px] not-italic text-[#101828] text-[16px] text-center top-[-0.32px]">0</p>
      </div>
    </div>
  );
}

function Icon2() {
  return (
    <div className="h-[16px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.67px_-7.14%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 1.33333">
            <path d="M0.666667 0.666667H10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-[20.83%] left-1/2 right-1/2 top-[20.83%]" data-name="Vector">
        <div className="absolute inset-[-7.14%_-0.67px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.33333 10.6667">
            <path d="M0.666667 0.666667V10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="bg-[#f3f4f6] flex-[1_0_0] h-[32px] min-h-px min-w-px relative rounded-[10px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon2 />
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="h-[32px] relative shrink-0 w-[120px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Button1 />
        <Text1 />
        <Button2 />
      </div>
    </div>
  );
}

function MintInput() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-between relative shrink-0 w-full" data-name="MintInput">
      <Container3 />
      <Container5 />
    </div>
  );
}

function Container7() {
  return <div className="bg-[#99a1af] rounded-[3.402820018375656e+38px] shrink-0 size-[16px]" data-name="Container" />;
}

function Text2() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#364153] text-[16px] top-[-2.83px]">Tier 2 (2 điểm)</p>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="h-[24px] relative shrink-0 w-[131.85px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Container7 />
        <Text2 />
      </div>
    </div>
  );
}

function Icon3() {
  return (
    <div className="h-[16px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.67px_-7.14%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 1.33333">
            <path d="M0.666667 0.666667H10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button3() {
  return (
    <div className="bg-[#f3f4f6] relative rounded-[10px] shrink-0 size-[32px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon3 />
      </div>
    </div>
  );
}

function Text3() {
  return (
    <div className="h-[24px] relative shrink-0 w-[32px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Cousine:Bold',sans-serif] leading-[24px] left-[16.2px] not-italic text-[#101828] text-[16px] text-center top-[-0.32px]">0</p>
      </div>
    </div>
  );
}

function Icon4() {
  return (
    <div className="h-[16px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.67px_-7.14%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 1.33333">
            <path d="M0.666667 0.666667H10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-[20.83%] left-1/2 right-1/2 top-[20.83%]" data-name="Vector">
        <div className="absolute inset-[-7.14%_-0.67px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.33333 10.6667">
            <path d="M0.666667 0.666667V10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[#f3f4f6] flex-[1_0_0] h-[32px] min-h-px min-w-px relative rounded-[10px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon4 />
      </div>
    </div>
  );
}

function Container8() {
  return (
    <div className="h-[32px] relative shrink-0 w-[120px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Button3 />
        <Text3 />
        <Button4 />
      </div>
    </div>
  );
}

function MintInput1() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-between relative shrink-0 w-full" data-name="MintInput">
      <Container6 />
      <Container8 />
    </div>
  );
}

function Container10() {
  return <div className="bg-[#fdc700] rounded-[3.402820018375656e+38px] shrink-0 size-[16px]" data-name="Container" />;
}

function Text4() {
  return (
    <div className="flex-[1_0_0] h-[24px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#364153] text-[16px] top-[-2.83px]">Tier 3 (3 điểm)</p>
      </div>
    </div>
  );
}

function Container9() {
  return (
    <div className="h-[24px] relative shrink-0 w-[131.85px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <Container10 />
        <Text4 />
      </div>
    </div>
  );
}

function Icon5() {
  return (
    <div className="h-[16px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.67px_-7.14%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 1.33333">
            <path d="M0.666667 0.666667H10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button5() {
  return (
    <div className="bg-[#f3f4f6] relative rounded-[10px] shrink-0 size-[32px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon5 />
      </div>
    </div>
  );
}

function Text5() {
  return (
    <div className="h-[24px] relative shrink-0 w-[32px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Cousine:Bold',sans-serif] leading-[24px] left-[16.2px] not-italic text-[#101828] text-[16px] text-center top-[-0.32px]">0</p>
      </div>
    </div>
  );
}

function Icon6() {
  return (
    <div className="h-[16px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <div className="absolute bottom-1/2 left-[20.83%] right-[20.83%] top-1/2" data-name="Vector">
        <div className="absolute inset-[-0.67px_-7.14%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6667 1.33333">
            <path d="M0.666667 0.666667H10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-[20.83%] left-1/2 right-1/2 top-[20.83%]" data-name="Vector">
        <div className="absolute inset-[-7.14%_-0.67px]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.33333 10.6667">
            <path d="M0.666667 0.666667V10" id="Vector" stroke="var(--stroke-0, #101828)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Button6() {
  return (
    <div className="bg-[#f3f4f6] flex-[1_0_0] h-[32px] min-h-px min-w-px relative rounded-[10px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col items-start pt-[8px] px-[8px] relative size-full">
        <Icon6 />
      </div>
    </div>
  );
}

function Container11() {
  return (
    <div className="h-[32px] relative shrink-0 w-[120px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[12px] items-center relative size-full">
        <Button5 />
        <Text5 />
        <Button6 />
      </div>
    </div>
  );
}

function MintInput2() {
  return (
    <div className="content-stretch flex h-[32px] items-center justify-between relative shrink-0 w-full" data-name="MintInput">
      <Container9 />
      <Container11 />
    </div>
  );
}

function Text6() {
  return (
    <div className="h-[24px] relative shrink-0 w-[83.35px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#4a5565] text-[16px] top-[-2.83px]">Tổng điểm:</p>
      </div>
    </div>
  );
}

function Text7() {
  return (
    <div className="h-[36px] relative shrink-0 w-[63.867px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[36px] left-0 text-[#99a1af] text-[30px] top-[-0.92px] w-[64px] whitespace-pre-wrap">0/10</p>
      </div>
    </div>
  );
}

function Container12() {
  return (
    <div className="content-stretch flex h-[60.717px] items-center justify-between pt-[0.717px] relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#f3f4f6] border-solid border-t-[0.717px] inset-0 pointer-events-none" />
      <Text6 />
      <Text7 />
    </div>
  );
}

function Container2() {
  return (
    <div className="bg-white col-[1] h-[300.717px] relative rounded-[24px] row-[1] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0" data-name="Container">
      <div className="content-stretch flex flex-col gap-[16px] items-start pt-[24px] px-[24px] relative size-full">
        <Heading1 />
        <MintInput />
        <MintInput1 />
        <MintInput2 />
        <Container12 />
      </div>
    </div>
  );
}

function Heading2() {
  return (
    <div className="absolute h-[24px] left-[25.43px] top-[25.43px] w-[357.133px]" data-name="Heading 3">
      <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[24px] left-0 text-[#364153] text-[16px] top-[-2.83px]">Tỷ lệ ra NFT</p>
    </div>
  );
}

function Text8() {
  return (
    <div className="h-[16px] relative shrink-0 w-[49.85px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[16px] left-0 text-[#6a7282] text-[12px] top-[-0.17px]">Common</p>
      </div>
    </div>
  );
}

function Text9() {
  return (
    <div className="h-[16px] relative shrink-0 w-[17.567px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[16px] left-0 text-[#6a7282] text-[12px] top-[-0.17px] w-[18px] whitespace-pre-wrap">0%</p>
      </div>
    </div>
  );
}

function Container15() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex items-start justify-between relative size-full">
        <Text8 />
        <Text9 />
      </div>
    </div>
  );
}

function Container17() {
  return <div className="bg-[#99a1af] h-[8px] shrink-0 w-full" data-name="Container" />;
}

function Container16() {
  return (
    <div className="bg-[#e5e7eb] h-[8px] relative rounded-[3.402820018375656e+38px] shrink-0 w-full" data-name="Container">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start pr-[357.133px] relative size-full">
          <Container17 />
        </div>
      </div>
    </div>
  );
}

function ProbBar() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[28px] items-start left-[25.43px] top-[65.43px] w-[357.133px]" data-name="ProbBar">
      <Container15 />
      <Container16 />
    </div>
  );
}

function Text10() {
  return (
    <div className="h-[16px] relative shrink-0 w-[26.183px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[16px] left-0 text-[#6a7282] text-[12px] top-[-0.17px]">Rare</p>
      </div>
    </div>
  );
}

function Text11() {
  return (
    <div className="h-[16px] relative shrink-0 w-[17.567px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[16px] left-0 text-[#6a7282] text-[12px] top-[-0.17px] w-[18px] whitespace-pre-wrap">0%</p>
      </div>
    </div>
  );
}

function Container18() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex items-start justify-between relative size-full">
        <Text10 />
        <Text11 />
      </div>
    </div>
  );
}

function Container20() {
  return <div className="bg-[#51a2ff] h-[8px] shrink-0 w-full" data-name="Container" />;
}

function Container19() {
  return (
    <div className="bg-[#e5e7eb] h-[8px] relative rounded-[3.402820018375656e+38px] shrink-0 w-full" data-name="Container">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start pr-[357.133px] relative size-full">
          <Container20 />
        </div>
      </div>
    </div>
  );
}

function ProbBar1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[28px] items-start left-[25.43px] top-[105.43px] w-[357.133px]" data-name="ProbBar">
      <Container18 />
      <Container19 />
    </div>
  );
}

function Text12() {
  return (
    <div className="h-[16px] relative shrink-0 w-[59.783px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[16px] left-0 text-[#6a7282] text-[12px] top-[-0.17px]">Legendary</p>
      </div>
    </div>
  );
}

function Text13() {
  return (
    <div className="h-[16px] relative shrink-0 w-[17.567px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[16px] left-0 text-[#6a7282] text-[12px] top-[-0.17px] w-[18px] whitespace-pre-wrap">0%</p>
      </div>
    </div>
  );
}

function Container21() {
  return (
    <div className="h-[16px] relative shrink-0 w-full" data-name="Container">
      <div className="content-stretch flex items-start justify-between relative size-full">
        <Text12 />
        <Text13 />
      </div>
    </div>
  );
}

function Container23() {
  return <div className="bg-[#fdc700] h-[8px] shrink-0 w-full" data-name="Container" />;
}

function Container22() {
  return (
    <div className="bg-[#e5e7eb] h-[8px] relative rounded-[3.402820018375656e+38px] shrink-0 w-full" data-name="Container">
      <div className="overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-start pr-[357.133px] relative size-full">
          <Container23 />
        </div>
      </div>
    </div>
  );
}

function ProbBar2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] h-[28px] items-start left-[25.43px] top-[145.43px] w-[357.133px]" data-name="ProbBar">
      <Container21 />
      <Container22 />
    </div>
  );
}

function Container14() {
  return (
    <div className="h-[210.867px] relative rounded-[24px] shrink-0 w-[408px]" data-name="Container">
      <div aria-hidden="true" className="absolute border-[1.433px] border-solid border-white inset-0 pointer-events-none rounded-[24px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <Heading2 />
        <ProbBar />
        <ProbBar1 />
        <ProbBar2 />
      </div>
    </div>
  );
}

function Button7() {
  return (
    <div className="bg-[#e5e7eb] h-[68px] relative rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] shrink-0 w-[408px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[204.45px] text-[#99a1af] text-[20px] text-center top-[16.3px]">CHƯA ĐỦ ĐIỂM</p>
      </div>
    </div>
  );
}

function Container13() {
  return (
    <div className="col-[2] content-stretch flex flex-col h-[300.717px] items-start justify-between relative row-[1] shrink-0" data-name="Container">
      <Container14 />
      <Button7 />
    </div>
  );
}

function Container1() {
  return (
    <div className="gap-[32px] grid grid-cols-[repeat(2,_minmax(0,_1fr))] grid-rows-[repeat(1,_minmax(0,_1fr))] h-[300.717px] relative shrink-0 w-full" data-name="Container">
      <Container2 />
      <Container13 />
    </div>
  );
}

function Container() {
  return (
    <div className="h-[420.717px] relative shrink-0 w-[896px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[32px] items-start px-[24px] relative size-full">
        <Header />
        <Container1 />
      </div>
    </div>
  );
}

function MintScreen() {
  return (
    <div className="bg-[#faf5ff] content-stretch flex flex-col h-[604.15px] items-center pb-[143.433px] pt-[40px] relative shrink-0 w-full" data-name="MintScreen">
      <Container />
    </div>
  );
}

function App() {
  return (
    <div className="bg-[#f3f4f6] content-stretch flex flex-col h-[604.15px] items-start relative shrink-0 w-full" data-name="App">
      <MintScreen />
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