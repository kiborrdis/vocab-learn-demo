// Use GoogleGenAI client
import { GoogleGenAI } from "@google/genai";
import { DictionaryApiDefinition, DictionaryRequestError } from "./dictionaryApiClient";

const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getDefinitionsFromGemini(
  lemma: string,
  language: string
): Promise<DictionaryApiDefinition> {
  const prompt = `You are a dictionary API. Provide definitions for the word "${lemma}" in "${language}". Provide reponse only in the following JSON format.
  Always return only one example per meaning. Return plain json without any additional text or formatting.
  JSON schema:
  {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meanings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                partOfSpeech: { type: Type.STRING },
                definitions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      definition: { type: Type.STRING },
                      example: { type: Type.STRING, optional: true },
                    },
                  },
                },
              },
            },
          },
        },
        required: ["word", "meanings"],
      }`;

  const response = await geminiClient.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  let text = response.text || "";
  text = text.replace(/^```json/, "");
  text = text.replace(/```$/, "").trim();

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch (e) {
    throw new Error("Invalid response from Gemini API " + String(e));
  }
}

export const geminiApi = {
  getWordDefinition(word: string, lang: string = "en"): Promise<DictionaryApiDefinition[] | null> {
    return getDefinitionsFromGemini(word, lang).then((definition) => {
      if (!definition || !definition.meanings || definition.meanings.length === 0) {
        throw new DictionaryRequestError(`Failed to fetch gemini definition for "${word}"`);
      }
      return [definition];
    });
  },
};
