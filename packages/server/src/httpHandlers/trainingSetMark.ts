import { createPostHandler, response } from "../httpRouteHandlers";
import { withSchemaValidation, withAuthentication } from "../middlewares";
import { PrismaClient } from "@prisma/client";
import { BaseServices } from "../dialogDriver/specificTypes";
import { Router } from "express";

type TrainingSetMarkBody = { userWordId: number; remembered: boolean };

export function registerTrainingSetMarkRoute(
  router: Router,
  prisma: PrismaClient,
  services: BaseServices
) {
  createPostHandler(router, "/training-set/mark")
    .use(withSchemaValidation<{}, TrainingSetMarkBody>())
    .use(withAuthentication(prisma))
    .handle(async (_path, { userWordId, remembered }, { extra: { user } }) => {
      try {
        const status = await services.training.markUserWord({
          userId: user.id,
          userWordId,
          remembered,
        });
        return response(200, { success: true, status: { score: status.score } });
      } catch (error: unknown) {
        return response(404, { error: (error as Error).message || "Could not mark word" });
      }
    });
}
