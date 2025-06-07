import { Update } from "telegraf/types";
import { matchTextMessage } from "./textMatchers";

export const matchCallbackMessage = (update: Update) => {
  if ("callback_query" in update && "data" in update.callback_query) {
    return update.callback_query;
  }

  return false;
};

export const createMatchCallback = (pattern: string | RegExp) => (update: Update) => {
  const callback = matchCallbackMessage(update);

  if (callback) {
    const matched =
      typeof pattern === "string" ? pattern === callback.data : pattern.test(callback.data || "");

    if (matched) {
      return callback;
    }
  }

  return false;
};

export const createMatchOrTextCallback = (targetCallback: string) => (update: Update) => {
  const callback = matchCallbackMessage(update);

  if (callback) {
    const matched = targetCallback === callback.data;

    if (matched) {
      return { type: "callback", callback } as const;
    }
  }

  const textMessage = matchTextMessage(update);

  if (textMessage) {
    return { type: "text", message: textMessage } as const;
  }

  return false;
};
