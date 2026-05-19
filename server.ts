import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // AI Search API
  app.post("/api/ai-search", async (req, res) => {
    const { query, videoContext } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are an AI assistant for a movie streaming platform called VAAGAI.
Your task is to analyze the user's search query and recommend the most relevant videos from our library.

Library Context (JSON):
${JSON.stringify(videoContext)}

User Query: "${query}"

Return a JSON object containing:
- "recommendedVideoIds": an array of strings representing the IDs of the most relevant videos.
- "reason": a short explanation of why these were chosen.
- "aiResponse": a friendly message to the user about their search.

If no highly relevant matches exist, return an empty array for recommendedVideoIds and explain why.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedVideoIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              reason: { type: Type.STRING },
              aiResponse: { type: Type.STRING }
            },
            required: ["recommendedVideoIds", "reason", "aiResponse"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error) {
      console.error("AI Search Error:", error);
      res.status(500).json({ error: "Failed to process AI search" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
