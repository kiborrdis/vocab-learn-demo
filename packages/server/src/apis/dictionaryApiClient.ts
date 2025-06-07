// Simple client for Free Dictionary API (dictionaryapi.dev)
// Docs: https://dictionaryapi.dev/

export interface DictionaryApiDefinition {
  word: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

export class DictionaryRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DictionaryRequestError";
  }
}

export const dictionaryApi = {
  async getWordDefinition(
    word: string,
    lang: string = "en"
  ): Promise<DictionaryApiDefinition[] | null> {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/${lang}/${encodeURIComponent(word)}`
      );
      if (!res.ok) {
        return null;
      }
      const data = await res.json();
      return data as DictionaryApiDefinition[];
    } catch (e) {
      throw new DictionaryRequestError(
        `Failed to fetch definition for "${word}": ${e instanceof Error ? e.message : String(e)}`
      );
    }
  },
};
