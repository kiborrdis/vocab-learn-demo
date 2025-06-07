/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserDialogDriverContext } from "../dialogDriver/types";
import { Message, Update } from "telegraf/types";
import { matchTextMessage } from "../dialogDriver/matchers/textMatchers";

export const addWordDialog = async (context: UserDialogDriverContext, message?: Message) => {
  if (!message) {
    return;
  }
  const wordService = context.services.wordService;
  const textMsg = matchTextMessage({ message } as Update);

  if (!textMsg) {
    await context.bot.sendMessage(context.user.telegramId, "No word provided.");
    return;
  }

  const firstLine = textMsg.text.split("\n")[0].trim();
  const strToAdd = firstLine
    .replace(
      /^['"\u201c\u201d\u00ab\u00bb\u201e\u201f\u2018\u2019\u201a\u201b]+|['"\u201c\u201d\u00ab\u00bb\u201e\u201f\u2018\u2019\u201a\u201b]+$/g,
      ""
    )
    .toLowerCase();
  if (!strToAdd) {
    await context.bot.sendMessage(context.user.telegramId, "No word provided.");
    return;
  }

  const { lemma, wordId, alreadyInVocab, definitions } = await wordService.processWord(
    strToAdd,
    context.user.id
  );

  if (alreadyInVocab) {
    await context.bot.sendMessage(
      context.user.telegramId,
      `Word "${lemma}" is already in your vocabulary.`
    );
    return;
  }

  if (!definitions || definitions.length === 0) {
    await context.bot.sendMessage(context.user.telegramId, `No definitions found for "${lemma}".`);
    return;
  }

  // 6. Add word to user's vocabulary
  await context.services.vocabulary.addWordToUserVocab(context.user.id, wordId);

  // Prepare definition message
  let definitionMsg = "";
  if (definitions.length > 0) {
    definitionMsg = definitions
      .map((def: any) => {
        const data: any = def.data;
        if (!data || !data.meanings) {
          return "No definition found.";
        }
        return data.meanings
          .map(
            (m: any) =>
              `• ${m.partOfSpeech}:\n` +
              m.definitions
                .map((d: any) => `  - ${d.definition}${d.example ? `\n    e.g. ${d.example}` : ""}`)
                .join("\n")
          )
          .join("\n");
      })
      .join("\n\n");
  } else {
    definitionMsg = "No definition found.";
  }

  await context.bot.sendMessage(
    context.user.telegramId,
    `Received word: "${strToAdd}".\nLemma: ${lemma}\nDefinitions:\n${definitionMsg}\nWord added to your vocabulary.`
  );
};
