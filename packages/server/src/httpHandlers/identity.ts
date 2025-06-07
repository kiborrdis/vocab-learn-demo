import { createGetHandler, response } from "../httpRouteHandlers";
import { withSchemaValidation, withAuthentication } from "../middlewares";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export function registerIdentityRoute(router: Router, prisma: PrismaClient) {
  createGetHandler(router, "/identity")
    .use(withSchemaValidation<{}, {}>())
    .use(withAuthentication(prisma))
    .handle(async (_path, _data, { extra: { user } }) => {
      return response(200, { id: user.id });
    });
}
