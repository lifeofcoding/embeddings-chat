import { PGChunk, PGArticle, PGJSON } from "@/types";
import axios from "axios";
import * as cheerio from "cheerio";
import { encode } from "gpt-3-encoder";
import fs from "fs";

const BASE_URL = "http://www.paulgraham.com";
const CHUNK_SIZE = 200;

const getLinks = async () => {
  const html = await axios.get(`${BASE_URL}/articles.html`);
  const $ = cheerio.load(html.data);

  const linkArr: { url: string; title: string }[] = [];
  const tables = $("table");
  tables.each((i, table) => {
    if (i === 2) {
      const links = $(table).find("a");
      links.each((i, link) => {
        const url = $(link).attr("href");
        const title = $(link).text();

        if (url?.endsWith(".html") && title) {
          const linkObj = {
            url,
            title,
          };
          linkArr.push(linkObj);
        }
      });
    }
  });

  return linkArr;
};

const getArticle = async (url: string, title: string) => {
  let article: PGArticle = {
    title: "",
    url: "",
    date: "",
    content: "",
    tokens: 0,
    chunks: [],
  };

  const html = await axios.get(`${BASE_URL}/${url}`);
  const $ = cheerio.load(html.data);
  const tables = $("table");

  tables.each((i, table) => {
    if (i === 1) {
      const text = $(table).text();

      let cleanedText = text
        .replace(/\s+/g, " ")
        .replace(/\.([a-zA-Z])/g, ". $1");

      const split = cleanedText.match(/([A-Z][a-z]+ [0-9]{4})/);
      let dateStr = "";
      let textWithoutDate = "";

      if (split) {
        dateStr = split[0];
        textWithoutDate = cleanedText.replace(dateStr, "");
      }

      let articleText = textWithoutDate.replace(/\n/g, " ").trim();

      article = {
        title,
        url: `${BASE_URL}/${url}`,
        date: dateStr,
        content: articleText,
        tokens: encode(articleText).length,
        chunks: [],
      };
    }
  });

  return article;
};

const getChunks = async (article: PGArticle) => {
  const { title, url, date, content } = article;

  let articleTextChunks: string[] = [];

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split(". ");
    let chunkText = "";

    for (let i = 0; i < split.length; ++i) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence).length;
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength > CHUNK_SIZE) {
        articleTextChunks.push(chunkText);
        chunkText = "";
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + ". ";
      } else {
        chunkText += sentence + " ";
      }
    }

    articleTextChunks.push(chunkText.trim());
  } else {
    articleTextChunks.push(content.trim());
  }

  const articleChunks: PGChunk[] = articleTextChunks.map((chunkText, i) => {
    const chunk = {
      article_title: title,
      article_url: url,
      article_date: date,
      content: chunkText,
      content_tokens: encode(chunkText).length,
      embedding: [],
    };

    return chunk;
  });

  if (articleChunks.length > 1) {
    for (let i = 0; i < articleChunks.length; ++i) {
      const chunk = articleChunks[i];
      const prevChunk = articleChunks[i - 1];

      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += " " + chunk.content;
        prevChunk.content_tokens = encode(prevChunk.content).length;
        articleChunks.splice(i, 1);
      }
    }
  }

  const chunkedArticle: PGArticle = {
    ...article,
    chunks: articleChunks,
  };

  return chunkedArticle;
};

(async function () {
  const links = await getLinks();
  let articles: PGArticle[] = [];
  console.log("Total links:" + links.length);
  for (let i = 0; i < links.length; ++i) {
    if (i < 7) {
      const link = links[i];

      // if (i !== 0) break;
      const article = await getArticle(link.url, link.title);
      const chunkedArticle = await getChunks(article);
      articles.push(chunkedArticle);
      // console.log(chunkedArticle);
    }
  }

  const json: PGJSON = {
    tokens: articles.reduce((acc, article) => acc + article.tokens, 0),
    articles,
  };

  fs.writeFileSync("scripts/pg.json", JSON.stringify(json));

  //   console.log(articles);
})();
