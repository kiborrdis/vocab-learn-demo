import { PrismaClient } from "@prisma/client";
import { DefinitionsService } from "./definitions";
import winkLemmatizer from "wink-lemmatizer";

export class WordService {
  private prisma: PrismaClient;
  private definitionsService: DefinitionsService;

  constructor(prisma: PrismaClient, definitionsService: DefinitionsService) {
    this.prisma = prisma;
    this.definitionsService = definitionsService;
  }

  async processWord(inputStr: string, userId: number) {
    const trimmedStr = inputStr.trim();
    const isSingleWord = !trimmedStr.includes(" ");

    let lemma;
    if (isSingleWord) {
      lemma =
        [
          winkLemmatizer.noun(trimmedStr),
          winkLemmatizer.verb(trimmedStr),
          winkLemmatizer.adjective(trimmedStr),
        ].find((l) => l !== trimmedStr) || trimmedStr;
    } else {
      lemma = trimmedStr;
    }

    const language = "en"; // TODO: detect or pass language

    const dbWord =
      (await this.prisma.word.findUnique({
        where: { lemma_language: { lemma, language } },
      })) || (await this.prisma.word.create({ data: { lemma, language } }));

    const wordId = dbWord.id;

    const alreadyInVocab = !!(await this.prisma.userWord.findUnique({
      where: { userId_wordId: { userId, wordId } },
    }));

    let definitions = null;
    if (!alreadyInVocab) {
      definitions = await this.prisma.definition.findMany({ where: { wordId } });
      if (!definitions.length) {
        // Fetch definitions using DefinitionsService
        definitions = await this.definitionsService.getOrFetchDefinitions(wordId, lemma, language);
      }
    }

    return { lemma, wordId, alreadyInVocab, definitions };
  }
}
