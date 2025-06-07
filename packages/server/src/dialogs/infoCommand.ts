import { UserDialogDriverContext } from "../dialogDriver/types";
import { format } from "date-fns";

export const infoDialog = async (context: UserDialogDriverContext) => {
  await context.bot.sendMessage(
    context.user.telegramId,
    `
Server time: ${format(new Date(), "yyyy-MM-dd HH:mm")}
Server timezone offset: ${new Date().getTimezoneOffset()}
`
  );

  await context.bot.sendDocument(context.user.telegramId, {
    source: Buffer.from([1, 2, 3].join("\n")),
    filename: "test.csv",
  });
};
