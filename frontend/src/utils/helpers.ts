export const getTierEmoji = (tier: number): string => {
  if (tier === 1) return '🥉';
  if (tier === 2) return '🥈';
  return '🥇';
};

export const getTierName = (tier: number): string => {
  if (tier === 1) return 'Đồng';
  if (tier === 2) return 'Bạc';
  return 'Vàng';
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const calculateTotalPoints = (tier1: number, tier2: number, tier3: number): number => {
  return tier1 * 1 + tier2 * 2 + tier3 * 3;
};
