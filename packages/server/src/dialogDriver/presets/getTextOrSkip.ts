import { Markup } from "telegraf";
import { uid } from "uid";
import { createMatchOrTextCallback } from "../matchers/callbackMatchers";
import { UserDialogDriverContext } from "../types";

export const getTextOrSkip = async (
  context: UserDialogDriverContext,
  {
    messageText,
    texts,
    timeoutSeconds,
  }: {
    messageText: string;
    texts: {
      skip: string;
    };
    timeoutSeconds?: number;
  }
): Promise<{ type: "skip" } | { type: "text"; text: string; messageId: number }> => {
  const prefix = uid();

  await context.bot.sendMessage(
    context.user.telegramId,
    messageText,
    Markup.inlineKeyboard([[Markup.button.callback(texts.skip, `${prefix}_skip`)]])
  );

  const result = await context.waitMessage(createMatchOrTextCallback(`${prefix}_skip`), {
    timeoutSeconds,
  });

  if (result.type === "callback") {
    return {
      type: "skip",
    };
  }

  return {
    type: "text",
    text: result.message.text,
    messageId: result.message.message_id,
  };
};
