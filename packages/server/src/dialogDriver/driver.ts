import { Telegraf } from "telegraf";
import { Message, Update } from "telegraf/types";
import { DialogDriverWaitTimeoutError } from "./DialogDriverTimeoutError";
import {
  DialogDriverContext,
  DialogDriverState,
  UserDialogDriverContext,
  Matcher,
  PromiseAccessor,
  PendingAwait,
} from "./types";
import { BaseUser } from "./specificTypes";

export type DialogDriver = ReturnType<typeof makeDialogDriver>;

export const makeDialogDriver = (
  params: Pick<DialogDriverContext, "services">,
  bot: Telegraf,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError: (e: any) => void
) => {
  const dialogDriverState: DialogDriverState = {};
  const dialogDriverContext: DialogDriverContext = {
    ...params,
    waitMessage: createWaitMessage(dialogDriverState),
  };

  return {
    startDialog: (
      user: BaseUser,
      dialogFunc: (context: UserDialogDriverContext, message?: Message) => Promise<void>,
      {
        onDialogError = (e) => {
          if (e instanceof DialogDriverWaitTimeoutError) {
            console.log("TimeoutError", e);

            return;
          } else {
            console.log("onDialogError", e);
            onError(e);
            return;
          }
        },
        defaultWaitTimeoutSeconds = 180,
      }: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onDialogError?: (e: any) => void;
        defaultWaitTimeoutSeconds?: number;
      } = {},
      message?: Message
    ): Promise<void> => {
      const userDialogDriverContext: UserDialogDriverContext = {
        ...dialogDriverContext,
        bot: bot.telegram,
        user,
        waitMessage: (matcher, options) => {
          return dialogDriverContext.waitMessage(user.telegramId, matcher, {
            ...options,
            timeoutSeconds: options?.timeoutSeconds || defaultWaitTimeoutSeconds,
          });
        },
      };

      return dialogFunc(userDialogDriverContext, message).catch(onDialogError);
    },
    applyUpdate: (
      data: {
        user: BaseUser;
      },
      update: Update
    ) => {
      const userDialog = dialogDriverState[data.user.telegramId];

      userDialog?.pendingAwaits.forEach((pendingAwait) => {
        const matchedUpdate = pendingAwait.matcher(update);

        if (matchedUpdate && pendingAwait.promiseAccessor.resolve) {
          pendingAwait.promiseAccessor.resolve(matchedUpdate);
        }
      });
    },
  };
};
const createWaitMessage =
  (dialogDriverState: DialogDriverState) =>
  <M>(
    userId: number,
    matcher: Matcher<M>,
    {
      timeoutSeconds = 120,
    }: {
      timeoutSeconds?: number;
    } = {}
  ): Promise<M> => {
    const promiseAccessor: PromiseAccessor<M> = {};

    const promise = new Promise<M>((resolve, reject) => {
      promiseAccessor.resolve = resolve;
      promiseAccessor.reject = reject;
    });
    const newPendingAwait: PendingAwait<M> = {
      promiseAccessor,
      matcher,
    };
    const userDialogState = dialogDriverState[userId] || {
      pendingAwaits: [],
    };

    const timeoutId = timeoutSeconds
      ? setTimeout(() => {
          if (promiseAccessor.reject) {
            promiseAccessor.reject(new DialogDriverWaitTimeoutError(timeoutSeconds));
          }
        }, timeoutSeconds * 1000)
      : undefined;

    dialogDriverState[userId] = {
      ...userDialogState,
      pendingAwaits: [...userDialogState.pendingAwaits, newPendingAwait],
    };

    return promise.finally(() => {
      dialogDriverState[userId].pendingAwaits = dialogDriverState[userId].pendingAwaits.filter(
        (pendingAwait) => pendingAwait !== newPendingAwait
      );
      clearTimeout(timeoutId);
    });
  };
