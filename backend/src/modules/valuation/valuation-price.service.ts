export interface ValuationPriceNft {
  id: string;
  tier: number;
}

export interface ValuationPriceInput {
  nft: ValuationPriceNft;
  wagerSui: number;
}

function hashOffset(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000;
  }
  return (hash % 25) / 100;
}

export class ValuationPriceService {
  async getActualPriceSui(input: ValuationPriceInput): Promise<number> {
    const multiplier =
      input.nft.tier === 3 ? 2.4 : input.nft.tier === 2 ? 1.45 : 0.85;
    return Number((input.wagerSui * multiplier + hashOffset(input.nft.id)).toFixed(3));
  }
}

export const valuationPriceService = new ValuationPriceService();
