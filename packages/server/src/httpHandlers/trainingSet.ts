import { createGetHandler, response } from "../httpRouteHandlers";
import { withSchemaValidation, withAuthentication } from "../middlewares";
import { dictIdToName } from "../services";
import { PrismaClient } from "@prisma/client";
import { BaseServices } from "../dialogDriver/specificTypes";
import { Router } from "express";
import { DictionaryApiDefinition } from "../apis/dictionaryApiClient";
import { TrainingItem } from "./types";

export function registerTrainingSetRoute(
  router: Router,
  prisma: PrismaClient,
  services: BaseServices
) {
  createGetHandler(router, "/training-set")
    .use(withSchemaValidation<{}, {}>())
    .use(withAuthentication(prisma))
    .handle(async (_path, _data, { extra: { user } }) => {
      const trainingSet = await services.training.getTrainingSetForUser(user.id, { limit: 10 });
      const wordIds = trainingSet.map((item) => item.word.id);
      const definitionsByWordId = await services.definitions.getDefinitionsForWords(wordIds);
      const result: TrainingItem[] = trainingSet.map((item) => ({
        userWordId: item.userWordId,
        lemma: item.word.lemma,
        language: item.word.language,
        learnedScore: item.status?.score ?? 0,
        definitions: (definitionsByWordId[item.word.id] || []).map((def) => ({
          name: dictIdToName[def.dictionaryId],
          data: def.data as unknown as DictionaryApiDefinition,
        })),
      }));
      return response(200, { trainingSet: result });
    });
}
