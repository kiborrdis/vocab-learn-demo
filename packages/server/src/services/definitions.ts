import { dictionaryApi } from "../apis/dictionaryApiClient";
import { geminiApi } from "../apis/geminiApiClient";
import { geminiRussianApi } from "../apis/geminiRussianApiClient";
import { PrismaClient, DictionaryId, Definition } from "@prisma/client";

export class DefinitionsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getOrFetchDefinitions(
    wordId: number,
    lemma: string,
    language: string
  ): Promise<Definition[]> {
    const cached = await this.prisma.definition.findMany({ where: { wordId } });
    if (cached.length) {
      return cached;
    }

    const sources: Array<{ api: typeof dictionaryApi; dictId: DictionaryId }> = [
      { api: dictionaryApi, dictId: DictionaryId.DICTIONARYAPI_DEV },
      { api: geminiApi, dictId: DictionaryId.GEMINI },
      { api: geminiRussianApi, dictId: DictionaryId.GEMINI_RUSSIAN },
    ];
    for (const { api, dictId } of sources) {
      try {
        const apiDefs = await api.getWordDefinition(lemma, language);
        if (apiDefs) {
          for (const apiDef of apiDefs) {
            await this.prisma.definition.create({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data: { wordId, dictionaryId: dictId, data: apiDef as any, dataFormat: 1 },
            });
          }
        }
      } catch (e) {
        console.log(e);
        // ignore individual source errors
      }
    }
    return this.prisma.definition.findMany({ where: { wordId } });
  }

  async getDefinitionsForWords(wordIds: number[]) {
    const definitions = await this.prisma.definition.findMany({
      where: { wordId: { in: wordIds } },
    });
    // Group by wordId
    const grouped: Record<number, typeof definitions> = {};
    for (const def of definitions) {
      if (!grouped[def.wordId]) {
        grouped[def.wordId] = [];
      }
      grouped[def.wordId].push(def);
    }
    return grouped;
  }

  async refreshDefinitions(wordId: number, lemma: string, language: string) {
    await this.prisma.definition.deleteMany({
      where: {
        wordId,
        dictionaryId: {
          in: [DictionaryId.DICTIONARYAPI_DEV, DictionaryId.GEMINI, DictionaryId.GEMINI_RUSSIAN],
        },
      },
    });
    return this.getOrFetchDefinitions(wordId, lemma, language);
  }
}
