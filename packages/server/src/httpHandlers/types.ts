import { DictionaryApiDefinition } from "../apis/dictionaryApiClient";

type DictDefinition = {
  name: string;
  data: DictionaryApiDefinition;
};
export type TrainingItem = {
  userWordId: number;
  lemma: string;
  language: string;
  learnedScore: number;

  definitions: Array<DictDefinition>;
};
