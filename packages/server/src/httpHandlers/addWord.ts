import { createPostHandler, response } from "../httpRouteHandlers";
import { withSchemaValidation, withAuthentication } from "../middlewares";
import { PrismaClient } from "@prisma/client";
import { BaseServices } from "../dialogDriver/specificTypes";
import { Router } from "express";

export type AddWordResponse = { success: true; wordId: number } | { error: string };

export function registerAddWordRoute(router: Router, prisma: PrismaClient, services: BaseServices) {
  createPostHandler(router, "/words/add")
    .use(withSchemaValidation<{}, { word: string; language?: string }>())
    .use(withAuthentication(prisma))
    .handle(async (_path, { word, language: _language = "en" }, { extra: { user } }) => {
      if (!word) {
        return response(400, { error: "Missing word" });
      }
      try {
        const { wordId } = await services.wordService.processWord(word, user.id);
        await services.vocabulary.addWordToUserVocab(user.id, wordId);
        return response(200, { success: true, wordId });
      } catch {
        return response(500, { error: "Failed to add word" });
      }
    });
}
