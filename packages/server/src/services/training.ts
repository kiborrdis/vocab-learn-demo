import { PrismaClient } from "@prisma/client";

const MASTERED_THRESHOLD = 3; // e.g., n correct = mastered
const DEFAULT_TRAINING_SET_LIMIT = 10;
const RANDOM_WORDS_PERCENT = 0.2; // 20% of the set will be random non-prioritized words
const LOWEST_SCORE = 0;
const HIGHEST_SCORE = MASTERED_THRESHOLD;

function clampScore(value: number) {
  return Math.min(Math.max(value, LOWEST_SCORE), HIGHEST_SCORE);
}

/** Perform limited displacement scrambling on first `count` items of `arr`, each moving at most `maxDisp` positions */
function windowedScramble<T>(arr: T[], count: number, maxDisp: number) {
  for (let i = 0; i < Math.min(arr.length, count); i++) {
    const end = Math.min(i + maxDisp, arr.length - 1);
    const j = Math.floor(Math.random() * (end - i + 1)) + i;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Uniformly shuffle a copy of the array using Fisher–Yates */
function shuffleArray<T>(arr: T[]): T[] {
  const result = arr.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class TrainingService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getTrainingSetForUser(userId: number, options?: { limit?: number }) {
    const limit = options?.limit ?? DEFAULT_TRAINING_SET_LIMIT;
    const userWords = await this.prisma.userWord.findMany({
      where: { userId },
      include: {
        word: true,
        status: true,
      },
    });

    // Split into prioritized and non-prioritized
    const prioritized: typeof userWords = [];
    const nonPrioritized: typeof userWords = [];
    for (const uw of userWords) {
      if (!uw.status) {
        prioritized.push(uw);
        continue;
      }
      if (uw.status.score >= MASTERED_THRESHOLD && uw.status.lastReviewed) {
        nonPrioritized.push(uw); // mastered
      } else {
        prioritized.push(uw);
      }
    }

    // Sort prioritized by highest score (desc) and oldest review for ties
    prioritized.sort((a, b) => {
      const aScore = a.status?.score ?? 0;
      const bScore = b.status?.score ?? 0;
      if (aScore !== bScore) {
        return bScore - aScore;
      } // highest score first
      const aLast = a.status?.lastReviewed ? new Date(a.status.lastReviewed).getTime() : 0;
      const bLast = b.status?.lastReviewed ? new Date(b.status.lastReviewed).getTime() : 0;
      return aLast - bLast; // oldest review first
    });

    // Shuffle non-prioritized
    const shuffledNonPrioritized = shuffleArray(nonPrioritized);

    // Calculate how many random words to include
    const randomCount = Math.min(
      Math.round(limit * RANDOM_WORDS_PERCENT),
      shuffledNonPrioritized.length
    );
    const prioritizedCount = limit - randomCount;

    // On prioritized array: apply windowed scramble
    const maxDisp = Math.floor(prioritizedCount / 2);
    windowedScramble(prioritized, prioritizedCount, maxDisp);

    // Take from prioritized and random
    const trainingSet = [
      ...prioritized.slice(0, prioritizedCount),
      ...shuffledNonPrioritized.slice(0, randomCount),
    ];

    // Shuffle the final set for variety
    for (let i = trainingSet.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [trainingSet[i], trainingSet[j]] = [trainingSet[j], trainingSet[i]];
    }

    return trainingSet.map((uw) => ({
      userWordId: uw.id,
      word: uw.word,
      status: uw.status,
    }));
  }

  /**
   * Mark a user word as remembered or not remembered, updating UserWordStatus accordingly.
   */
  async markUserWord({
    userId,
    userWordId,
    remembered,
  }: {
    userId: number;
    userWordId: number;
    remembered: boolean;
  }) {
    // Find the userWord and check ownership
    const userWord = await this.prisma.userWord.findUnique({ where: { id: userWordId } });
    if (!userWord || userWord.userId !== userId) {
      throw new Error("UserWord not found");
    }
    let status = await this.prisma.userWordStatus.findUnique({ where: { userWordId } });
    const now = new Date();
    if (!status) {
      const initialScore = clampScore(remembered ? 1 : -1);
      status = await this.prisma.userWordStatus.create({
        data: {
          userWordId,
          lastReviewed: now,
          score: initialScore,
          updatedAt: now,
        },
      });
    } else {
      const newScore = clampScore(remembered ? status.score + 1 : status.score - 1);
      status = await this.prisma.userWordStatus.update({
        where: { userWordId },
        data: {
          lastReviewed: now,
          score: newScore,
          updatedAt: now,
        },
      });
    }
    return status;
  }
}
