import { GoogleGenAI, Type } from "@google/genai";
import { ClothingItem, OutfitSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to extract mime type and data from base64 string
const getBase64Details = (base64String: string) => {
  if (!base64String) {
    console.warn("Empty base64 string provided to getBase64Details");
    return { mimeType: "image/jpeg", data: "" };
  }
  const matches = base64String.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return {
      mimeType: matches[1],
      data: matches[2]
    };
  }
  // Fallback if already stripped or invalid format (assume jpeg/raw)
  return {
    mimeType: "image/jpeg",
    data: base64String.replace(/^data:image\/\w+;base64,/, "")
  };
};

// Helper to safely parse JSON from AI response
const safeJsonParse = (text: string) => {
  try {
    // Remove code blocks if present
    const cleanedText = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("JSON Parse Error:", e);
    console.log("Raw Text:", text);
    return null;
  }
};

// 1. Analyze Clothing Item
export const analyzeClothingImage = async (base64Image: string): Promise<Partial<ClothingItem>> => {
  try {
    const { mimeType, data } = getBase64Details(base64Image);
    if (!data) throw new Error("Invalid image data");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: data,
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
    
    const parsed = safeJsonParse(text);
    if (!parsed) throw new Error("Failed to parse AI response");
    
    // Sanitize response to ensure arrays exist
    return {
      category: parsed.category,
      color: parsed.color,
      season: Array.isArray(parsed.season) ? parsed.season : [],
      style: Array.isArray(parsed.style) ? parsed.style : [],
      description: parsed.description
    };
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze image with Gemini. Please try again.");
  }
};

// 2. Generate Outfit Suggestion
export const generateOutfit = async (
  wardrobe: ClothingItem[],
  occasion: string,
  notes: string
): Promise<OutfitSuggestion> => {
  if (wardrobe.length === 0) {
      throw new Error("Wardrobe is empty");
  }

  const inventoryDescription = wardrobe
    .map((item) => `- ID: ${item.id}, ${item.color} ${item.category} (${(item.style || []).join(", ")})`)
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
    
    const parsed = safeJsonParse(text);
    if (!parsed) throw new Error("Failed to parse outfit suggestion");
    
    // Sanitize response to ensure mandatory arrays are present
    const result: OutfitSuggestion = {
      outfitName: parsed.outfitName || "Outfit Suggestion",
      description: parsed.description || "No description provided.",
      selectedItemIds: Array.isArray(parsed.selectedItemIds) ? parsed.selectedItemIds : [],
      missingItems: Array.isArray(parsed.missingItems) ? parsed.missingItems : [],
      reasoning: parsed.reasoning || "Based on your wardrobe choices."
    };

    return result;
  } catch (error) {
    console.error("Error generating outfit:", error);
    throw new Error("Failed to generate outfit suggestion. Please try again.");
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
    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
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
    const text = response.text || "I couldn't find specific shopping results.";
    
    return { text, groundingChunks };
  } catch (error) {
    console.error("Error searching items:", error);
    throw new Error("Failed to search for items.");
  }
};
