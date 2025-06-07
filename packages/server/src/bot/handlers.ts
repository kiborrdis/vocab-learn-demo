import { Telegraf } from "telegraf";
import { DialogDriver } from "../dialogDriver/driver";
import { BaseServices, BaseUser } from "../dialogDriver/specificTypes";
import { infoDialog } from "../dialogs/infoCommand";
import { addWordDialog } from "../dialogs/addWordDialog";
import { trainingSetDialog } from "../dialogs/trainingSetDialog";
import { matchTextMessage } from "../dialogDriver/matchers/textMatchers";
import { telegramAuthDialog } from "../dialogs/telegramAuthDialog";
import { exportWordsDialog } from "../dialogs/exportWordsDialog";

export const attachHandlers = (
  bot: Telegraf,
  services: BaseServices,
  dialogDriver: DialogDriver
) => {
  bot.command(
    "info",
    withUserHandler(async (_, user) => {
      if (user) {
        dialogDriver.startDialog(user, infoDialog, {
          defaultWaitTimeoutSeconds: 180,
        });
      }
    }, services)
  );

  bot.command(
    "export",
    withUserHandler(async (_, user) => {
      if (user) {
        dialogDriver.startDialog(user, exportWordsDialog, {
          defaultWaitTimeoutSeconds: 180,
        });
      }
    }, services)
  );

  bot.command(
    "training",
    withUserHandler(async (_, user) => {
      if (user) {
        await dialogDriver.startDialog(user, trainingSetDialog, {
          defaultWaitTimeoutSeconds: 180,
        });
      }
    }, services)
  );

  bot.command(
    "auth",
    withUserHandler(async (_, user) => {
      if (user) {
        await dialogDriver.startDialog(user, telegramAuthDialog, {
          defaultWaitTimeoutSeconds: 180,
        });
      }
    }, services)
  );

  bot.on(
    "message",
    withUserHandler(async (context, user) => {
      if (matchTextMessage(context.update)) {
        await dialogDriver.startDialog(user, addWordDialog, {}, context.update.message);
      }
    }, services)
  );

  bot.on(
    "callback_query",
    withUserHandler(async (context, user) => {
      dialogDriver.applyUpdate({ user }, context.update);
    }, services)
  );
};

const withUserHandler =
  <
    C extends {
      from?: {
        id: number;
        first_name: string;
      };
    },
  >(
    handler: (context: C, user: BaseUser) => Promise<void>,
    services: BaseServices
  ) =>
  async (context: C) => {
    let user: BaseUser | null = null;

    if (context.from) {
      user = await services.users.getUserByTelegramID(context.from.id);

      if (user === null) {
        user = await services.users.createUser(context.from.id);
      }
    }

    if (user === null) {
      return;
    }

    return await handler(context, user);
  };
