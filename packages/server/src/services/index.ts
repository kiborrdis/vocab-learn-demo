import { PrismaClient, DictionaryId } from "@prisma/client";
import { UsersService } from "./user";
import { VocabularyService } from "./vocabulary";
import { DefinitionsService } from "./definitions";
import { TrainingService } from "./training";
import { WordService } from "./wordService";

export function createBaseServices(prisma: PrismaClient) {
  const users = new UsersService(prisma);
  const vocabulary = new VocabularyService(prisma);
  const definitions = new DefinitionsService(prisma);
  const training = new TrainingService(prisma);
  const wordService = new WordService(prisma, definitions);
  return {
    users,
    vocabulary,
    definitions,
    training,
    wordService,
    prisma, // for ensureDictionariesExist
  };
}

export const dictIdToName: Record<DictionaryId, string> = {
  [DictionaryId.DICTIONARYAPI_DEV]: "dictionaryapi.dev",
  [DictionaryId.GEMINI]: "Gemini AI",
  [DictionaryId.GEMINI_RUSSIAN]: "Gemini AI Ru Transl",
};

export async function ensureDictionariesExist(prisma: PrismaClient) {
  const dictionaries = [
    { id: DictionaryId.DICTIONARYAPI_DEV, name: "dictionaryapi.dev" },
    { id: DictionaryId.GEMINI, name: "Gemini AI" },
    { id: DictionaryId.GEMINI_RUSSIAN, name: "Gemini AI Ru Translation" },
  ];
  for (const dict of dictionaries) {
    await prisma.dictionary.upsert({
      where: { id: dict.id },
      update: { name: dict.name },
      create: dict,
    });
  }
}
