export enum OpenAIModel {
  DAVINCI_TURBO = "gpt-3.5-turbo",
}

export type PGArticle = {
  title: string;
  url: string;
  date: string;
  content: string;
  tokens: number;
  chunks: PGChunk[];
};

export type PGChunk = {
  article_title: string;
  article_url: string;
  article_date: string;
  content: string;
  content_tokens: number;
  embedding: number[];
};

export type PGJSON = {
  tokens: number;
  articles: PGArticle[];
};
