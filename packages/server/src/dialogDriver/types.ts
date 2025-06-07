import { Telegraf } from "telegraf";
import { Update } from "telegraf/types";
import { BaseServices, BaseUser } from "./specificTypes";

export type PendingAwait<V> = {
  matcher: Matcher<V>;
  promiseAccessor: PromiseAccessor<V>;
};
export type PromiseAccessor<V> = {
  resolve?: (res: V) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reject?: (error: any) => void;
};
export type Matcher<M> = (update: Update) => M | false;
type WaitMessageType = <M>(
  userId: number,
  matcher: Matcher<M>,
  options?: { timeoutSeconds?: number }
) => Promise<M>;
type UserWaitMessageType = <M>(
  matcher: Matcher<M>,
  options?: { timeoutSeconds?: number }
) => Promise<M>;
export type DialogDriverContext = {
  waitMessage: WaitMessageType;
  services: BaseServices;
};
export type UserDialogDriverContext = Omit<DialogDriverContext, "waitMessage"> & {
  user: BaseUser;
  waitMessage: UserWaitMessageType;
  bot: Pick<
    Telegraf["telegram"],
    | "sendMessage"
    | "sendDocument"
    | "editMessageReplyMarkup"
    | "editMessageText"
    | "deleteMessage"
    | "getFileLink"
  >;
};
export type DialogDriverState = {
  [k: number]: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingAwaits: PendingAwait<any>[];
  };
};
