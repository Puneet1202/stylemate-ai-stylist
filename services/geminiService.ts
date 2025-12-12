import { GoogleGenAI, Schema, Type } from "@google/genai";
import { ClothingItem, StylistResponse, OutfitCardData, OutfitSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanBase64 = (base64: string) =>
  base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
const getMimeType = (base64: string) => {
  const match = base64.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : "image/jpeg";
};

// ----------------------------------------
// 1. Analyze Clothing Item
// ----------------------------------------
export const analyzeClothingImage = async (
  base64Image: string
): Promise<Partial<ClothingItem>> => {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING },
      color: { type: Type.STRING },
      season: { type: Type.ARRAY, items: { type: Type.STRING } },
      style: { type: Type.ARRAY, items: { type: Type.STRING } },
      description: { type: Type.STRING },
    },
    required: ["category", "color", "season", "style", "description"],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: getMimeType(base64Image),
              data: cleanBase64(base64Image),
            },
          },
          {
            text: "Analyze this clothing item. Detect category, color, season, style, and description.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Analysis failed", error);
    return {
      category: "Unknown",
      color: "Unknown",
      style: ["Casual"],
      season: ["All-Year"],
      description: "Could not analyze item.",
    };
  }
};

// ----------------------------------------
// 2. Google Search Helper (Shopping Tab)
// ----------------------------------------
export const searchForItems = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find fashion items for: ${query} in India.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    return {
      text: response.text || "No results found.",
      groundingChunks:
        response.candidates?.[0]?.groundingMetadata?.groundingChunks || [],
    };
  } catch (error) {
    console.error("Search failed", error);
    return { text: "Search unavailable.", groundingChunks: [] };
  }
};

// ----------------------------------------
// 3. Wardrobe-first Stylist Engine
// ----------------------------------------
export const generateStylistResponse = async (
  message: string,
  wardrobe: ClothingItem[],
  history: any[]
): Promise<StylistResponse> => {
  const wardrobeDesc = wardrobe
    .map(
      (item) =>
        `ID: ${item.id} - ${item.color} ${item.category} (${item.style.join(
          ", "
        )})`
    )
    .join("\n");

  const historyText = history
    .map((h) => `${h.role}: ${h.content}`)
    .join("\n");

  const systemPrompt = `
You are "AI Style Mate", a wardrobe-first stylist. OUTPUT ONLY CLEAN JSON.

JSON Schema:
{
  "message": string,
  "selectedItemIds": [string],
  "inspirationImages": [{ "title": string, "imageUrl": string, "link": string }],
  "shopping": [{ "name": string, "priceRange": string, "links": [{ "label": string, "url": string }] }],
  "suggestions": [string]
}
`;

  const context = `
USER WARDROBE:
${wardrobeDesc || "No items uploaded."}

USER SAID: "${message}"

CHAT HISTORY:
${historyText}

RULES:
- ALWAYS use wardrobe first.
- Only after that, recommend items to buy.
- Provide up to 3 Pinterest inspiration images.
- Provide up to 3 shopping suggestions with Myntra/Ajio/Amazon search links.
- KEEP MESSAGE SHORT (3–6 lines).
- OUTPUT STRICT JSON ONLY.
`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      message: { type: Type.STRING },
      selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      inspirationImages: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            link: { type: Type.STRING },
          },
        },
      },
      shopping: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            priceRange: { type: Type.STRING },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  url: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: [
      "message",
      "selectedItemIds",
      "inspirationImages",
      "shopping",
      "suggestions",
    ],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt + "\n" + context,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    // Clean JSON parsing
    const raw = (response.text || "").toString();
    const start = raw.indexOf("{");
    const parsed = JSON.parse(start >= 0 ? raw.slice(start) : "{}");

    // Normalize arrays
    parsed.selectedItemIds = parsed.selectedItemIds ?? [];
    parsed.inspirationImages = parsed.inspirationImages ?? [];
    parsed.shopping = parsed.shopping ?? [];
    parsed.suggestions = parsed.suggestions ?? [];

    // ------------------------------
    // Convert MODEL → APP STRUCTURE
    // ------------------------------

    // pinterestLooks (your types)
    const pinterestLooks = parsed.inspirationImages.map(
      (p: any, i: number) => ({
        title: p.title || `Look ${i + 1}`,
        description: "",
        previewImageUrl: p.imageUrl || "",
        pinterestUrl: p.link || "",
      })
    );

    // missingItems (your types)
    const missingItems = parsed.shopping.map((item: any, i: number) => {
      const shoppingOptions =
        item.links?.map((ln: any) => ({
          storeName: ln.label || "Store",
          url: ln.url,
          price: item.priceRange || "N/A",
          type: "online" as const,
        })) || [];

      return {
        id: `missing-${i}-${Date.now()}`,
        name: item.name || `Item ${i + 1}`,
        pinterestQuery: item.name || "",
        shoppingOptions,
      };
    });

    // OutfitCardData
    const outfits: OutfitCardData[] = [
      {
        id: "generated-outfit",
        title: "Your Outfit",
        description: parsed.message,
        matchScore: 100,
        selectedItemIds: parsed.selectedItemIds,
        missingItems,
        pinterestLooks,
        reasoning: parsed.message || "",
      },
    ];

    return {
      mode: "wardrobe_outfit",
      message: parsed.message,
      outfits,
      suggestions: parsed.suggestions,
    };
  } catch (error) {
    console.error("Stylist generation failed", error);
    return {
      mode: "wardrobe_outfit",
      message: "Network issue occurred.",
      outfits: [],
      suggestions: ["Try again"],
    };
  }
};

// ----------------------------------------
// 4. Generate Outfit (Occasion Feature)
// ----------------------------------------
export const generateOutfit = async (
  wardrobe: ClothingItem[],
  occasion: string,
  notes: string
): Promise<OutfitSuggestion> => {
  if (!wardrobe.length) throw new Error("Wardrobe empty");

  const wardrobeDesc = wardrobe
    .map(
      (item) =>
        `ID: ${item.id} - ${item.color} ${item.category} (${item.style.join(
          ", "
        )})`
    )
    .join("\n");

  const prompt = `
Select the best outfit from wardrobe for:
Occasion = "${occasion}"
Notes = "${notes}"

Wardrobe:
${wardrobeDesc}

Return JSON only.
`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      outfitName: { type: Type.STRING },
      description: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: [
      "outfitName",
      "description",
      "reasoning",
      "selectedItemIds",
      "missingItems",
    ],
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return JSON.parse(response.text || "{}") as OutfitSuggestion;
  } catch (error) {
    console.error("Generate outfit failed", error);
    return {
      outfitName: "Error",
      description: "Please try again.",
      reasoning: "",
      selectedItemIds: [],
      missingItems: [],
    };
  }
};

// ----------------------------------------
export const generateOutfitVisualization = async (
  description: string
): Promise<string | null> => {
  return null;
};
