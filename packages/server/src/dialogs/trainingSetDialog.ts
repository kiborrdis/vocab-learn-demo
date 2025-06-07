import { UserDialogDriverContext } from "../dialogDriver/types";

export const trainingSetDialog = async (context: UserDialogDriverContext) => {
  const trainingSet = await context.services.training.getTrainingSetForUser(context.user.id);
  if (!trainingSet.length) {
    await context.bot.sendMessage(context.user.telegramId, "No words available for training.");
    return;
  }
  const msg = trainingSet
    .map((item, idx) => `${idx + 1}. ${item.word.lemma} (${item.word.language})`)
    .join("\n");
  await context.bot.sendMessage(context.user.telegramId, `Your training set:\n${msg}`);
};
