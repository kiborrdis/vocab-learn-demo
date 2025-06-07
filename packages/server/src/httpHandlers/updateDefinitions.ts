import { createPostHandler, response } from "../httpRouteHandlers";
import { withSchemaValidation, withAuthentication } from "../middlewares";
import { PrismaClient } from "@prisma/client";
import { BaseServices } from "../dialogDriver/specificTypes";
import { Router } from "express";
import { DictionaryApiDefinition } from "../apis/dictionaryApiClient";
import { dictIdToName } from "../services";

type UpdateDefinitionsBody = { userWordId: number };

export function registerDefinitionsUpdateRoute(
  router: Router,
  prisma: PrismaClient,
  services: BaseServices
) {
  createPostHandler(router, "/definitions/update")
    .use(withSchemaValidation<{}, UpdateDefinitionsBody>())
    .use(withAuthentication(prisma))
    .handle(async (_path, { userWordId }, { extra: { user } }) => {
      const wordObj = await services.vocabulary.getWordForUserWordId(user.id, userWordId);
      if (!wordObj) {
        return response(404, { error: "UserWord not found" });
      }
      const { id: wordId, lemma, language } = wordObj;
      const definitions = await services.definitions.refreshDefinitions(wordId, lemma, language);
      return response(200, {
        definitions: definitions.map((def) => ({
          name: dictIdToName[def.dictionaryId],
          data: def.data as unknown as DictionaryApiDefinition,
        })),
      });
    });
}
