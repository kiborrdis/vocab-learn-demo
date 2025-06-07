import { UserDialogDriverContext } from "../dialogDriver/types";

export const telegramAuthDialog = async (context: UserDialogDriverContext) => {
  const token = await context.services.users.createTelegramAuthToken(context.user.id);

  // Construct the login link (adjust host as needed)
  const host = process.env.WEB_CLIENT_URL || "http://localhost:5173";
  const link = `${host}/auth/telegram/${token}`;

  const message =
    `To log in to the web client, follow this link:\n${link}` +
    `\n\nOr use this token directly (click to copy):\n\`${token}\`` +
    `\n\nThis link and token are valid for 10 minutes and one use.`;
  await context.bot.sendMessage(context.user.telegramId, message, {
    parse_mode: "Markdown",
  });
};
