export interface ClothingItem {
  id: string;
  image: string; // Base64 or URL
  category: string;
  color: string;
  season: string[];
  style: string[];
  description?: string;
}

export interface OutfitSuggestion {
  outfitName: string;
  description: string;
  selectedItemIds: string[];
  missingItems: string[];
  reasoning: string;
}

export interface ShoppingResult {
  title: string;
  url: string;
  source: string;
}

export enum AppTab {
  WARDROBE = 'WARDROBE',
  OUTFIT_GENERATOR = 'OUTFIT_GENERATOR',
  SHOPPING = 'SHOPPING'
}

export interface ChartData {
  name: string;
  value: number;
  fill: string;
}