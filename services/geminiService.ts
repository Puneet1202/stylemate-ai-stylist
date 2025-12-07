import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, OutfitSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to strip base64 prefix
const cleanBase64 = (base64: string) => {
  return base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
};

// 1. Analyze Clothing Item
export const analyzeClothingImage = async (base64Image: string): Promise<Partial<ClothingItem>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(base64Image),
            },
          },
          {
            text: `Analyze this clothing item. Identify the category (e.g., Shirt, Pants, Dress, Shoes), primary color, suitable seasons, and style tags (e.g., Casual, Formal, Streetwear). Return JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            color: { type: Type.STRING },
            season: { type: Type.ARRAY, items: { type: Type.STRING } },
            style: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

// 2. Generate Outfit Suggestion
export const generateOutfit = async (
  wardrobe: ClothingItem[],
  occasion: string,
  notes: string
): Promise<OutfitSuggestion> => {
  const inventoryDescription = wardrobe
    .map((item) => `- ID: ${item.id}, ${item.color} ${item.category} (${item.style.join(", ")})`)
    .join("\n");

  const prompt = `
    I need an outfit for: ${occasion}.
    Additional notes: ${notes}.
    
    Here is my current wardrobe inventory:
    ${inventoryDescription}
    
    Please suggest the best outfit using my items. You can also suggest *one or two* missing items I should buy to complete the look if necessary.
    
    Return the result in strict JSON format matching this structure:
    {
      "outfitName": "A catchy name for the look",
      "description": "A vivid description of the outfit styling",
      "selectedItemIds": ["id1", "id2"],
      "missingItems": ["description of missing item 1"],
      "reasoning": "Why this works for the occasion"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Using a schema ensures strict adherence
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            outfitName: { type: Type.STRING },
            description: { type: Type.STRING },
            selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning: { type: Type.STRING },
          },
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating outfit:", error);
    throw error;
  }
};

// 3. Generate Outfit Visualization
export const generateOutfitVisualization = async (description: string): Promise<string | null> => {
  try {
    // Using gemini-2.5-flash-image for generation
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: `Create a high-fashion, pinterest-style flatlay or lifestyle photography of this outfit: ${description}. Clean lighting, aesthetic background.`,
          },
        ],
      },
    });

    // Extract image from response parts
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

// 4. Shopping Assistant with Search Grounding
export const searchForItems = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find shopping links for: ${query}. Return a list of 3-5 distinct specific items available for purchase online.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const text = response.text;
    
    return { text, groundingChunks };
  } catch (error) {
    console.error("Error searching items:", error);
    throw error;
  }
};