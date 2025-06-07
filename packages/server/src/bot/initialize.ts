import { Telegraf } from "telegraf";
import { BaseServices } from "../dialogDriver/specificTypes";
import { makeDialogDriver } from "../dialogDriver/driver";
import { attachHandlers } from "./handlers";

export const initializeBot = async (telegramToken: string, services: BaseServices) => {
  const bot = new Telegraf(telegramToken, {
    telegram: {
      webhookReply: false,
    },
  });

  const dialogDriver = makeDialogDriver(
    {
      services,
    },
    bot,
    (_e) => {}
  );

  attachHandlers(bot, services, dialogDriver);

  return {
    bot,
    dialogDriver,
    services,
  } as const;
};
