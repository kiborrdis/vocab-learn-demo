import { UserDialogDriverContext } from "../dialogDriver/types";
import { format } from "date-fns";
import { selectOption } from "../dialogDriver/presets/optionSelectMessage";

export const exportWordsDialog = async (context: UserDialogDriverContext) => {
  const user = await context.services.users.getUserByTelegramID(context.user.telegramId);

  const res = await selectOption(context, {
    messageText: `Your last word export was at: ${
      user?.lastWordExportAt ? format(user.lastWordExportAt, "yyyy-MM-dd HH:mm") : "never"
    }. Choose an option:`,
    options: [
      { label: "Export words added since last export", id: 1 },
      { label: "Export all words", id: 0 },
    ],
    perRow: 1,
  });

  if (res.type === "skip") {
    return;
  }

  const since =
    res.option.id === 0
      ? new Date("1970-01-01T00:00:00Z")
      : user?.lastWordExportAt || new Date("1970-01-01T00:00:00Z");
  const fileName =
    res.option.id === 0
      ? `all_words_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`
      : `words_since_${format(since, "yyyy-MM-dd_HH-mm")}.csv`;

  const words = await context.services.vocabulary.getWordsSinceDate(context.user.id, since);

  if (words.length === 0) {
    await context.bot.sendMessage(
      context.user.telegramId,
      `No new words to export since ${format(since, "yyyy-MM-dd HH:mm")}.`
    );
    return;
  }

  const csvLines = words.map((uw) => `${uw.word.lemma}`);
  const csvContent = csvLines.join("\n");

  await context.bot.sendMessage(
    context.user.telegramId,
    `Exporting ${words.length} words added since ${format(since, "yyyy-MM-dd HH:mm")}.`
  );

  await context.services.users.updateLastWordExportAt(context.user.id, new Date());

  await context.bot.sendDocument(context.user.telegramId, {
    source: Buffer.from(csvContent),
    filename: fileName,
  });
};
