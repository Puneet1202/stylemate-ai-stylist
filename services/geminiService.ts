import { GoogleGenAI, Schema, Type } from "@google/genai";
import { ClothingItem, StylistResponse, OutfitCardData, OutfitSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanBase64 = (base64: string) => base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
const getMimeType = (base64: string) => {
  const match = base64.match(/^data:(image\/\w+);base64,/);
  return match ? match[1] : 'image/jpeg';
};

// 1. Analyze Clothing Item
export const analyzeClothingImage = async (base64Image: string): Promise<Partial<ClothingItem>> => {
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
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(base64Image), data: cleanBase64(base64Image) } },
          { text: "Analyze this clothing item. Categorize it (e.g., Shirt, Pants, Shoes), detect the color, season (Summer, Winter, All-Season, etc.), style (Casual, Formal, Streetwear, etc.), and provide a brief description." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
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
      description: "Could not analyze item."
    };
  }
};

// 2. Search for Items (Shopping Tab Helper)
export const searchForItems = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find fashion items for: ${query} in India.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    
    return {
      text: response.text || "No results found.",
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Search failed", error);
    return {
        text: "Search unavailable.",
        groundingChunks: []
    };
  }
};

// 3. Strict Wardrobe-First Stylist Logic
export const generateStylistResponse = async (
  message: string,
  wardrobe: ClothingItem[],
  history: any[]
): Promise<StylistResponse> => {
  
  const wardrobeDesc = wardrobe.map(item => `ID: ${item.id} - ${item.color} ${item.category} (${item.style.join(', ')})`).join('\n');
  const historyText = history.map(h => `${h.role}: ${h.content}`).join('\n');
  const hasItems = wardrobe.length > 0;

  const prompt = `
    You are "AI Style Mate", a personal fashion stylist.

    STRICT RULES YOU MUST FOLLOW:
    1. ALWAYS analyze ALL items in the wardrobe first
    2. Match clothing formality to the occasion:
       - Night Party/Wedding/Formal Event → MUST use SUIT or most formal items first
       - Business Meeting → Use Suit or Jacket + Formal Shirt
       - Casual Hangout/College → Use Casual Shirts and Jackets
       - Date/Dinner → Use Jacket + Nice Shirt combination
    3. NEVER ignore Suits or Formal wear when user mentions parties, weddings, or formal events
    4. You MUST create outfit from EXISTING wardrobe items ONLY
    5. After suggesting outfit from wardrobe, then recommend additional items to buy

    CURRENT USER'S WARDROBE ITEMS (Use these IDs):
    ${hasItems ? wardrobeDesc : "User's wardrobe is empty."}

    USER REQUEST: "${message}"

    CONVERSATION HISTORY:
    ${historyText}

    RESPONSE FORMAT (Follow this EXACTLY):

    🎯 **PERFECT OUTFIT FROM YOUR WARDROBE:**

    👔 **TOP:** [Specific item from wardrobe with color]
    👖 **BOTTOM:** [Specific item from wardrobe OR write "Need to buy pants" if none match]
    🧥 **LAYER/JACKET:** [If suit or jacket available and fits occasion, mention here]

    ✨ **Why This Works:**
    [Write 2-3 lines explaining why this combination is perfect for the specific occasion]

    ---

    🛍️ **ITEMS TO BUY TO COMPLETE THE LOOK:**

    1. 👞 **[Item Name - be specific like "Black Leather Oxford Shoes"]**
       💰 **Price:** ₹[X,XXX - X,XXX]
       🏪 **BUY HERE (Click links):**
       • https://www.myntra.com/search?q=[URL_Encoded_Item_Name]
       • https://www.ajio.com/search/?text=[URL_Encoded_Item_Name]
       • https://www.amazon.in/s?k=[URL_Encoded_Item_Name]

    2. ⌚ **[Item Name - like "Silver Minimalist Watch"]**
       💰 **Price:** ₹[X,XXX - X,XXX]
       🏪 **BUY HERE (Click links):**
       • https://www.myntra.com/search?q=[URL_Encoded_Item_Name]
       • https://www.amazon.in/s?k=[URL_Encoded_Item_Name]

    3. 🎒 **[If needed - like "Black Leather Belt" or accessories]**
       💰 **Price:** ₹[X,XXX - X,XXX]
       🏪 **BUY HERE (Click links):**
       • https://www.myntra.com/search?q=[URL_Encoded_Item_Name]
       • https://www.amazon.in/s?k=[URL_Encoded_Item_Name]

    ---

    📌 **PINTEREST INSPIRATION - CLICK TO SEE OUTFIT PICTURES:**

    🔍 **Search 1:** "[Specific outfit description with colors and style]"
    🔗 **CLICK HERE:** https://in.pinterest.com/search/pins/?q=[search+terms+joined+by+plus]

    🔍 **Search 2:** "[Another style variation or angle]"
    🔗 **CLICK HERE:** https://in.pinterest.com/search/pins/?q=[search+terms+joined+by+plus]

    🔍 **Search 3:** "[Styling details or accessories focus]"
    🔗 **CLICK HERE:** https://in.pinterest.com/search/pins/?q=[search+terms+joined+by+plus]

    🔍 **Search 4:** "[Footwear or complete look inspiration]"
    🔗 **CLICK HERE:** https://in.pinterest.com/search/pins/?q=[search+terms+joined+by+plus]

    🔍 **Search 5:** "[Color combination or seasonal styling]"
    🔗 **CLICK HERE:** https://in.pinterest.com/search/pins/?q=[search+terms+joined+by+plus]

    ---

    💡 **PRO STYLING TIP:**
    [Give one specific, actionable styling tip relevant to the occasion]

    ---

    CRITICAL REMINDERS:
    - For queries with "party", "night party", "wedding" → Suit is TOP PRIORITY
    - For "college", "casual" → Casual shirts and jackets
    - Always provide 5 Pinterest links with different search angles
    - Make all shopping links clickable and specific using search queries
    - Use emojis to make response visually appealing
    - Be conversational and friendly in tone

    OUTPUT JSON STRUCTURE:
    {
      "message": "The full formatted markdown text following the RESPONSE FORMAT",
      "selectedItemIds": ["id1", "id2", "id3"],
      "suggestions": ["Next quick reply option 1", "Option 2"]
    }
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      message: { type: Type.STRING },
      selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["message", "selectedItemIds", "suggestions"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = JSON.parse(response.text || "{}");
    
    // Map to StylistResponse type expected by the app
    // We create a dummy "outfit" object to hold the selectedItemIds so the UI can verify them
    const outfits: OutfitCardData[] = [{
        id: 'generated-outfit',
        title: 'Your Outfit',
        description: 'Generated from wardrobe',
        matchScore: 100,
        selectedItemIds: result.selectedItemIds || [],
        missingItems: [],
        pinterestLooks: [],
        reasoning: ''
    }];

    return {
      mode: 'wardrobe_outfit',
      message: result.message || "Here is a suggestion.",
      outfits: outfits,
      suggestions: result.suggestions || []
    };

  } catch (error) {
    console.error("Stylist generation failed", error);
    return {
      mode: 'wardrobe_outfit',
      message: "Network issue hai! Try again later.",
      outfits: [],
      suggestions: ["Try again"]
    };
  }
};

// 4. Generate Specific Outfit (for OutfitGenerator)
export const generateOutfit = async (
  wardrobe: ClothingItem[],
  occasion: string,
  notes: string
): Promise<OutfitSuggestion> => {
  if (!wardrobe.length) {
    throw new Error("Wardrobe is empty");
  }

  const wardrobeDesc = wardrobe.map(item => `ID: ${item.id} - ${item.color} ${item.category} (${item.style.join(', ')})`).join('\n');
  
  const prompt = `
    You are a fashion stylist. 
    User Occasion: "${occasion}"
    User Notes: "${notes}"
    
    User's Wardrobe:
    ${wardrobeDesc}
    
    Select the best outfit from the wardrobe for this occasion.
    If pieces are missing to complete the look, list them.
    
    Return JSON.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      outfitName: { type: Type.STRING },
      description: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      selectedItemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      missingItems: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["outfitName", "description", "reasoning", "selectedItemIds", "missingItems"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });
    return JSON.parse(response.text || "{}") as OutfitSuggestion;
  } catch (error) {
    console.error("Generate outfit failed", error);
    return {
      outfitName: "Error generating outfit",
      description: "Please try again.",
      reasoning: "",
      selectedItemIds: [],
      missingItems: []
    };
  }
};

export const generateOutfitVisualization = async (description: string): Promise<string | null> => {
    // Visualization is optional/mocked for now to satisfy interface
    return null;
};
