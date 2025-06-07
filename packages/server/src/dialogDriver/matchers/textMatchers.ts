import { Update } from "telegraf/types";

export const matchTextMessage = (update: Update) => {
  if ("message" in update) {
    const message = update.message;
    if (message && "text" in message) {
      return message;
    }
  }

  return false;
};

export const createMatchText = (pattern: string | RegExp) => (update: Update) => {
  const message = matchTextMessage(update);

  if (message) {
    const matched =
      typeof pattern === "string" ? message.text.includes(pattern) : pattern.test(message.text);

    if (matched) {
      return message;
    }
  }

  return false;
};
