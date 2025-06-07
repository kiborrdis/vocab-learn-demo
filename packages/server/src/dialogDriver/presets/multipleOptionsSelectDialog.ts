import { UserDialogDriverContext } from "../types";
import { uid } from "uid";
import { createMatchCallback } from "../matchers/callbackMatchers";
import { Markup } from "telegraf";
import { getTextOrSkip } from "./getTextOrSkip";

export type MultpleOptionsSelectTexts = {
  more: string;
  custom: string;
  end: string;
  endCustom: string;

  firstWithOptions: string;
  notFirstWithOptions: string;

  firstNoOptions: string;
  notFirstNoOptions: string;
};

const defaultTexts: Pick<MultpleOptionsSelectTexts, "more" | "custom" | "end" | "endCustom"> = {
  more: "Еще",
  custom: "Свое",
  end: "Я все",
  endCustom: "Пропустить",
} as const;

export const createMultipleOptionSelectTexts = (
  texts: Omit<MultpleOptionsSelectTexts, keyof typeof defaultTexts>
): MultpleOptionsSelectTexts => {
  return {
    ...defaultTexts,
    ...texts,
  };
};

export const createMultipleOptionsSelectDialog =
  <O>({
    texts,
    optionsPerIteration,
    getOptionId,
    getOptionLabel,
    onAddNewOption,
  }: {
    texts: MultpleOptionsSelectTexts;
    optionsPerIteration: number;
    getOptionId: (option: O) => string;
    getOptionLabel: (option: O) => string;
    onAddNewOption: (context: UserDialogDriverContext, newOptionText: string) => Promise<O>;
  }) =>
  async (
    context: UserDialogDriverContext,
    {
      options,
    }: {
      options: O[];
    }
  ) => {
    let optionsOrder = options.map((option) => getOptionId(option));
    const optionsMap = options.reduce<Record<string, string>>((memo, option) => {
      memo[getOptionId(option)] = getOptionLabel(option);

      return memo;
    }, {});

    let lastCallbackData: "" | "end" | "more" | "custom" = "";
    let optionsStartIndex = 0;
    const selectedOptions: string[] = [];
    let meta: MessageMeta | null = null;

    while (lastCallbackData !== "end") {
      let selectedOption: O | undefined = undefined;

      if (optionsOrder.length === 0 || lastCallbackData === "custom") {
        const result = await waitNewOptionOrSkip(context, {
          messageText:
            selectedOptions.length === 0 ? texts.firstNoOptions : texts.notFirstNoOptions,
          texts,
        });

        if (result.type === "end") {
          lastCallbackData = "end";
        } else {
          const newOption = await onAddNewOption(context, result.text);
          const newOptionId = getOptionId(newOption);
          selectedOption = newOption;

          optionsMap[newOptionId] = getOptionLabel(newOption);
          lastCallbackData = "";
        }

        meta = null;
      } else if (lastCallbackData === "more") {
        optionsStartIndex += optionsPerIteration;
        lastCallbackData = "";
      } else if (lastCallbackData === "") {
        const selectResult: WaitOptionSelectResult = await waitOptionSelect(context, {
          messageText:
            selectedOptions.length === 0 ? texts.firstWithOptions : texts.notFirstWithOptions,
          optionsMap,
          optionsOrder,
          iterationSize: optionsPerIteration,
          startIndex: optionsStartIndex,
          texts,
          prevMessageId: meta?.messageId,
        });
        meta = selectResult.meta;

        if (selectResult.type === "selected") {
          selectedOption = options.find((option) => getOptionId(option) === selectResult.option);
        } else {
          if (selectResult.type === "empty") {
            throw new Error("Should not happen, empty from waitOptionSelect");
          }

          lastCallbackData = selectResult.type;
        }
      }

      if (selectedOption) {
        selectedOptions.push(getOptionId(selectedOption));
        optionsOrder = optionsOrder.filter((key) => key !== getOptionId(selectedOption!));
      }
    }

    return { optionsMap, selectedOptions };
  };

const waitNewOptionOrSkip = async (
  context: UserDialogDriverContext,
  {
    messageText,
    texts,
  }: {
    messageText: string;
    texts: MultpleOptionsSelectTexts;
  }
): Promise<{ type: "end" } | { type: "text"; text: string }> => {
  const result = await getTextOrSkip(context, {
    messageText,
    texts: {
      skip: texts.endCustom,
    },
  });

  if (result.type === "skip") {
    return {
      type: "end",
    };
  }

  return result;
};

type MessageMeta = {
  messageId: number;
};

type WaitOptionSelectResult =
  | {
      type: "empty" | "more" | "custom" | "end";
      meta: MessageMeta;
    }
  | {
      type: "selected";
      option: string;
      meta: MessageMeta;
    };

const waitOptionSelect = async (
  context: UserDialogDriverContext,
  params: {
    messageText: string;
    optionsOrder: string[];
    optionsMap: Record<string, string>;
    startIndex: number;
    iterationSize: number;
    texts: MultpleOptionsSelectTexts;
    prevMessageId?: number;
  }
): Promise<WaitOptionSelectResult> => {
  const { messageText, prevMessageId } = params;
  const prefix = uid();
  let messageMeta: MessageMeta;

  if (!prevMessageId) {
    const messageMetaRaw = await context.bot.sendMessage(
      context.user.telegramId,
      messageText,
      makeOptionsKeyboard({ prefix, ...params })
    );

    messageMeta = {
      messageId: messageMetaRaw.message_id,
    };
  } else {
    await context.bot.editMessageReplyMarkup(
      context.user.telegramId,
      prevMessageId,
      undefined,
      makeOptionsKeyboard({ prefix, ...params }).reply_markup
    );
    messageMeta = {
      messageId: prevMessageId,
    };
  }

  let { data: optionData } = await context.waitMessage(
    createMatchCallback(new RegExp(`${prefix}_([0-9]*|end|more|custom)`))
  );

  optionData = optionData?.replace(prefix + "_", "");

  if (!optionData) {
    return { type: "empty", meta: messageMeta };
  } else if (optionData === "more" || optionData === "custom" || optionData === "end") {
    return { type: optionData, meta: messageMeta };
  }

  return {
    type: "selected",
    option: optionData,
    meta: messageMeta,
  };
};

const makeOptionsKeyboard = ({
  prefix,
  optionsMap,
  optionsOrder,
  startIndex,
  iterationSize,
  texts,
}: {
  texts: MultpleOptionsSelectTexts;
  prefix: string;
  optionsOrder: string[];
  optionsMap: Record<string, string>;
  startIndex: number;
  iterationSize: number;
}) => {
  return Markup.inlineKeyboard([
    ...[...new Array(Math.min(iterationSize, optionsOrder.length))].map((_, i) => {
      const index = (i + startIndex) % optionsOrder.length;

      return [
        Markup.button.callback(optionsMap[optionsOrder[index]], `${prefix}_` + optionsOrder[index]),
      ];
    }),
    [
      Markup.button.callback(texts.end, `${prefix}_end`),
      Markup.button.callback(texts.custom, `${prefix}_custom`),
      Markup.button.callback(texts.more, `${prefix}_more`),
    ],
  ]);
};
