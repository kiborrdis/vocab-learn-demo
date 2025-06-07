import { PrismaClient } from "@prisma/client";

export class VocabularyService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getWordsSinceDate(userId: number, since: Date) {
    return this.prisma.userWord.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      include: { word: true },
    });
  }

  async getOrCreateWord(lemma: string, language: string) {
    let dbWord = await this.prisma.word.findUnique({
      where: { lemma_language: { lemma, language } },
    });
    if (!dbWord) {
      dbWord = await this.prisma.word.create({ data: { lemma, language } });
    }
    return dbWord;
  }

  async isWordInUserVocab(userId: number, wordId: number) {
    const userWord = await this.prisma.userWord.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
    return !!userWord;
  }

  async addWordToUserVocab(userId: number, wordId: number) {
    return this.prisma.userWord.create({ data: { userId, wordId } });
  }

  async getWordForUserWordId(userId: number, userWordId: number) {
    const userWord = await this.prisma.userWord.findUnique({
      where: { id: userWordId },
      include: { word: true },
    });
    if (!userWord || userWord.userId !== userId) {
      return null;
    }
    return userWord.word;
  }
}
