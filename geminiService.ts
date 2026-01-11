
import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, AnalysisResult } from "./types";

// Initialize AI directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeItemImage = async (base64Image: string): Promise<AnalysisResult> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: "Identify this item. Provide a suggested name, a short category, and a brief description.",
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["name", "category", "description"],
      },
    },
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { name: "New Item", category: "General", description: "" };
  }
};

export const chatWithInventory = async (
  query: string, 
  inventory: InventoryItem[], 
  history: { role: 'user' | 'model', text: string }[]
) => {
  const inventoryContext = inventory.map(item => 
    `- Item: ${item.name}, Location: ${item.location}, Category: ${item.category}`
  ).join('\n');

  const systemInstruction = `
    You are the Won-It Storage Assistant. You help users find items in their inventory.
    Current Inventory:
    ${inventoryContext}

    Instructions:
    1. Be concise.
    2. If asked about an item's location, specify it clearly.
    3. If you don't see the item in the list, suggest searching the physical area or check if it was named differently.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: { systemInstruction },
  });

  return response.text;
};
