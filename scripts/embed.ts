import { loadEnvConfig } from "@next/env";
import fs from "fs";
import { Configuration, OpenAIApi } from "openai";
import { createClient } from "@supabase/supabase-js";
import { PGArticle, PGJSON } from "../types";

loadEnvConfig("");

const generateEmbeddings = async (articles: PGArticle[]) => {
  const config = new Configuration({ apiKey: process.env.OPENAI_API_KEY });

  const openai = new OpenAIApi(config);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  for (const article of articles) {
    for (const chunk of article.chunks) {
      const embeddingResponse = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: chunk.content,
      });

      const [{ embedding }] = embeddingResponse.data.data;

      const { data, error } = await supabase
        .from("test_articles")
        .insert({
          article_title: chunk.article_title,
          article_url: chunk.article_url,
          article_date: chunk.article_date,
          content: chunk.content,
          content_tokens: chunk.content_tokens,
          embedding,
        })
        .select("*");

      if (error) {
        console.log(error);
      } else {
        console.log("saved", data);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
};

(async () => {
  const json: PGJSON = JSON.parse(fs.readFileSync("scripts/pg.json", "utf8"));

  await generateEmbeddings(json.articles);
})();
