export interface AchievementItem {
  milestone: number;
  title: string;
  description: string;
  image: string;
}

export const ACHIEVEMENTS: AchievementItem[] = [
  {
    milestone: 1,
    title: "Khởi Đầu",
    description: "Đạt streak 1",
    image: "/achievements/achievement1.png",
  },
  {
    milestone: 5,
    title: "Nhiệt Huyết",
    description: "Đạt streak 5",
    image: "/achievements/achievement2.png",
  },
  {
    milestone: 18,
    title: "Cao Thủ",
    description: "Đạt streak 18",
    image: "/achievements/achievement3.png",
  },
  {
    milestone: 36,
    title: "Huyền Thoại",
    description: "Đạt streak 36",
    image: "/achievements/achievement4.png",
  },
  {
    milestone: 67,
    title: "Bất Khả Chiến Bại",
    description: "Đạt streak 67",
    image: "/achievements/achievement5.png",
  },
];
