import { createGetHandler, response } from "../httpRouteHandlers";
import { withSchemaValidation, withAuthentication } from "../middlewares";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export function registerInfoRoute(router: Router, prisma: PrismaClient) {
  createGetHandler(router, "/info/:id")
    .use(withSchemaValidation<{ id: string }, {}>())
    .use(withAuthentication(prisma))
    .handle(async ({ id }, _data, { extra: { user } }) => {
      return response(200, { id, userId: user.id, serverTime: new Date().toISOString() });
    });
}

export function registerVocabularyCountRoute(router: Router, prisma: PrismaClient) {
  createGetHandler(router, "/vocabulary/count")
    .use(withSchemaValidation<{}, {}>())
    .use(withAuthentication(prisma))
    .handle(async (_path, _data, { extra: { user } }) => {
      const count = await prisma.userWord.count({ where: { userId: user.id } });
      return response(200, { count });
    });
}
