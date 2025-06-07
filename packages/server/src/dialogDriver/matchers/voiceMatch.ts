import { Message, Update } from "telegraf/types";

export const extractVoiceMessage = (message?: Message) => {
  if (message && "voice" in message) {
    return message;
  }

  return false;
};

export const matchVoiceMessage = (update: Update) => {
  if ("message" in update) {
    return extractVoiceMessage(update.message);
  }

  return false;
};
