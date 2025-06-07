import { UsersService } from "../services/user";
import { VocabularyService } from "../services/vocabulary";
import { DefinitionsService } from "../services/definitions";
import { TrainingService } from "../services/training";
import { WordService } from "../services/wordService";

export type BaseUser = {
  id: number;
  telegramId: number;
};

export type BaseServices = {
  users: UsersService;
  vocabulary: VocabularyService;
  definitions: DefinitionsService;
  training: TrainingService;
  wordService: WordService;
};
