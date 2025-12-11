
export interface ClothingItem {
  id: string;
  image: string; // Base64 or URL
  category: string;
  color: string;
  season: string[];
  style: string[];
  description?: string;
}

export interface ShoppingOption {
  storeName: string;
  url: string;
  price: string;
  type: 'online' | 'offline';
  location?: string; // For offline stores
}

export interface MissingItem {
  id: string;
  name: string;
  pinterestQuery: string;
  shoppingOptions: ShoppingOption[];
}

export interface PinterestLook {
  title: string;
  description: string;
  previewImageUrl: string;
  pinterestUrl: string;
}

export interface OutfitCardData {
  id: string;
  title: string;
  description: string;
  matchScore: number; // 0-100
  selectedItemIds: string[]; // IDs from wardrobe
  missingItems: MissingItem[];
  pinterestLooks: PinterestLook[];
  reasoning: string;
}

export interface StylistResponse {
  message: string;
  outfits: OutfitCardData[];
  mode: 'wardrobe_outfit' | 'new_ideas' | 'shopping_help' | 'chat';
  suggestions: string[]; // Quick replies
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'stylist';
  content: string; // Text message
  data?: StylistResponse; // Rich content
  timestamp: number;
}

export interface OutfitSuggestion {
  outfitName: string;
  description: string;
  reasoning: string;
  selectedItemIds: string[];
  missingItems: string[];
}

export enum AppTab {
  WARDROBE = 'WARDROBE',
  STYLIST = 'STYLIST',
  FAVORITES = 'FAVORITES',
  SHOPPING = 'SHOPPING'
}

export interface ChartData {
  name: string;
  value: number;
  fill: string;
}
