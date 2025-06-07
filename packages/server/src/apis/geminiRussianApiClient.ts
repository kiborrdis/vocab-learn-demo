// Use GoogleGenAI client for Russian translations
import { GoogleGenAI } from "@google/genai";
import { DictionaryApiDefinition, DictionaryRequestError } from "./dictionaryApiClient";

const geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getRussianTranslationFromGemini(
  lemma: string,
  language: string
): Promise<DictionaryApiDefinition> {
  const prompt = `You are a translation API. Translate the word "${lemma}" from "${language}" to Russian and provide translated word or words in Russian in the meaning array. Provide response only in the following JSON format.
  Always return only one example per meaning. Return plain json without any additional text or formatting.
  If the word is already in Russian, provide definitions in Russian.
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
    throw new Error("Invalid response from Gemini Russian API " + String(e));
  }
}

export const geminiRussianApi = {
  getWordDefinition(word: string, lang: string = "en"): Promise<DictionaryApiDefinition[] | null> {
    return getRussianTranslationFromGemini(word, lang).then((definition) => {
      if (!definition || !definition.meanings || definition.meanings.length === 0) {
        throw new DictionaryRequestError(`Failed to fetch Russian translation for "${word}"`);
      }
      return [definition];
    });
  },
};
