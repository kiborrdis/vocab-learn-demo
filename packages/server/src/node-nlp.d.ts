// wink-lemmatizer is now used instead of node-nlp.

declare module "node-nlp" {
  export class NlpManager {
    constructor(options?: { languages?: string[] });
    container: {
      get(name: "lemmatizer"): Lemmatizer;
    };
  }

  export interface Lemmatizer {
    lemmatize(word: string, lang?: string): string;
  }
}
