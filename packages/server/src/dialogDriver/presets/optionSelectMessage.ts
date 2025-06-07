import { Markup } from "telegraf";
import { uid } from "uid";
import { createMatchCallback } from "../matchers/callbackMatchers";
import { UserDialogDriverContext } from "../types";

export type OptionSelectOption = {
  id: number;
  label: string;
};

export type OptionSelectTexts = {
  skip: string;
};

export const selectOption = async (
  context: UserDialogDriverContext,
  {
    options,
    messageText,
    perRow,
    canSkip = true,
    texts = { skip: "Пропустить" },
  }: {
    messageText: string;
    options: OptionSelectOption[];
    perRow: number;
    texts?: OptionSelectTexts;
    canSkip?: boolean;
  }
) => {
  const prefix = uid();

  context.bot.sendMessage(
    context.user.telegramId,
    messageText,
    createOptionsInlineKeyboard({
      options,
      perRow,
      texts,
      prefix,
      canSkip,
    })
  );

  const { data } = await context.waitMessage(
    createMatchCallback(new RegExp(`${prefix}_([0-9]*|skip)`))
  );

  if (!data) {
    throw new Error("Something went wrong, no data from waitMessage");
  }
  const rawOptionId = data.replace(`${prefix}_`, "");

  if (rawOptionId === "skip") {
    return { type: "skip" } as const;
  }

  const option = options.find((option) => option.id === Number(rawOptionId));

  if (!option) {
    throw new Error("Something went wrong, option not found");
  }

  return {
    type: "selected",
    option,
  } as const;
};

const createOptionsInlineKeyboard = ({
  options,
  perRow,
  prefix,
  texts,
  canSkip,
}: {
  options: OptionSelectOption[];
  perRow: number;
  prefix: string;
  texts: OptionSelectTexts;
  canSkip: boolean;
}) => {
  return Markup.inlineKeyboard([
    ...options.reduce<ReturnType<typeof Markup.button.callback>[][]>((memo, option, index) => {
      if (index % perRow === 0) {
        memo.push([]);
      }

      memo[memo.length - 1].push(Markup.button.callback(option.label, `${prefix}_` + option.id));

      return memo;
    }, []),
    ...(canSkip ? [[Markup.button.callback(texts.skip, `${prefix}_skip`)]] : []),
  ]);
};
