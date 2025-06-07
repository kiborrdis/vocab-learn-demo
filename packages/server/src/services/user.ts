import { PrismaClient } from "@prisma/client";
import { BaseUser } from "../dialogDriver/specificTypes";
import { tokenGenerate } from "../randomToken";

export class UsersService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getUserByTelegramID(telegramId: number): Promise<
    | (BaseUser & {
        lastWordExportAt?: Date;
      })
    | null
  > {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      telegramId: user.telegramId,
      lastWordExportAt: user.lastWordExportAt ?? undefined,
    };
  }

  async updateLastWordExportAt(userId: number, date: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastWordExportAt: date },
    });
  }

  async createUser(telegramId: number): Promise<BaseUser> {
    const user = await this.prisma.user.create({ data: { telegramId } });
    return { id: user.id, telegramId: user.telegramId };
  }

  async createTelegramAuthToken(userId: number) {
    const token = tokenGenerate(32);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.prisma.telegramAuthToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async consumeTelegramAuthToken(token: string) {
    const record = await this.prisma.telegramAuthToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      return null;
    }

    await this.prisma.telegramAuthToken.delete({ where: { token } });
    return record.user;
  }

  async createSession(userId: number) {
    const sessionId = tokenGenerate(60);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await this.prisma.session.create({
      data: {
        sessionId,
        userId,
        expiresAt,
      },
    });
    return sessionId;
  }
}
