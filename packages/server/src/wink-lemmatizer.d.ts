// Minimal type declaration for wink-lemmatizer

declare module "wink-lemmatizer" {
  const winkLemmatizer: {
    noun: (word: string) => string;
    verb: (word: string) => string;
    adjective: (word: string) => string;
  };
  export = winkLemmatizer;
}
