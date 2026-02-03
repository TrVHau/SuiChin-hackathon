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
    <div className="h-[36px] relative shrink-0 w-[250.9px]" data-name="Heading 1">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <p className="absolute font-['Arimo:Bold',sans-serif] font-bold leading-[36px] left-0 text-[#1e2939] text-[30px] top-[-0.92px]">Xin Chun (Faucet)</p>
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

function Container2() {
  return (
    <div className="absolute h-[28px] left-[40px] top-[40px] w-[768px]" data-name="Container">
      <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[28px] left-[384.92px] text-[#6a7282] text-[18px] text-center top-[-2.27px]">Số Chun Có Thể Nhận</p>
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute h-[96px] left-[40px] top-[76px] w-[768px]" data-name="Container">
      <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[96px] left-[383.92px] text-[#ff6900] text-[96px] text-center top-[-2.68px]">1</p>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="absolute h-[24px] left-[40px] top-[188px] w-[768px]" data-name="Paragraph">
      <p className="-translate-x-1/2 absolute font-['Arimo:Regular',sans-serif] font-normal leading-[24px] left-[384.82px] text-[#99a1af] text-[16px] text-center top-[-2.83px]">Công thức: 2 giờ = 1 chun (Tối đa 10)</p>
    </div>
  );
}

function Button1() {
  return (
    <div className="absolute bg-gradient-to-r from-[#ff8904] h-[72px] left-[40px] rounded-[16px] shadow-[0px_10px_15px_0px_rgba(0,0,0,0.1),0px_4px_6px_0px_rgba(0,0,0,0.1)] to-[#f6339a] top-[244px] w-[768px]" data-name="Button">
      <p className="-translate-x-1/2 absolute font-['Arimo:Bold',sans-serif] font-bold leading-[32px] left-[383.92px] text-[24px] text-center text-white top-[19.67px]">XIN NGAY</p>
    </div>
  );
}

function Container1() {
  return (
    <div className="bg-white h-[356px] relative rounded-[24px] shadow-[0px_20px_25px_0px_rgba(0,0,0,0.1),0px_8px_10px_0px_rgba(0,0,0,0.1)] shrink-0 w-full" data-name="Container">
      <Container2 />
      <Container3 />
      <Paragraph />
      <Button1 />
    </div>
  );
}

function Container() {
  return (
    <div className="h-[476px] relative shrink-0 w-[896px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex flex-col gap-[32px] items-start px-[24px] relative size-full">
        <Header />
        <Container1 />
      </div>
    </div>
  );
}

function FaucetScreen() {
  return (
    <div className="bg-[#fff7ed] content-stretch flex flex-col h-[604.15px] items-center pb-[88.15px] pt-[40px] relative shrink-0 w-full" data-name="FaucetScreen">
      <Container />
    </div>
  );
}

function App() {
  return (
    <div className="bg-[#f3f4f6] content-stretch flex flex-col h-[604.15px] items-start relative shrink-0 w-full" data-name="App">
      <FaucetScreen />
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