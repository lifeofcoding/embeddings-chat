import Head from "next/head";
import { useState } from "react";
import { PGChunk } from "../types";
import endent from "endent";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { Answer } from "@/components/Answer";

export default function Home() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [chunks, setChunks] = useState<PGChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ role: string; content: string }[]>(
    []
  );

  const handleAnswer = async () => {
    setLoading(true);
    setAnswer("");
    const searchResponse = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!searchResponse.ok) {
      return;
    }

    const results: PGChunk[] = await searchResponse.json();
    setChunks(results);

    const prompt = endent`
      Use the following passages to answer the query: ${query}

      ${results.map((chunk) => chunk.content).join("\n")}
    `;

    const ctrl = new AbortController();
    let ans = "";
    const answerResponse = await fetchEventSource("/api/answer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, history }),
      signal: ctrl.signal,
      onerror(err) {
        console.error(err);
      },
      onmessage: (event) => {
        if (event.data === "[DONE]") {
          ctrl.abort();

          setHistory((prev) => {
            return [
              ...prev,
              { role: "user", content: query },
              { role: "assistant", content: ans },
            ];
          });
        } else {
          setLoading(false);
          const data = JSON.parse(event.data);
          if (!data || !data.data) {
            return;
          }
          ans += data.data;
          setAnswer((prev) => prev + data.data);
        }
      },
    });
  };
  return (
    <>
      <Head>
        <title>Embeddings ChatGPT</title>
        <meta name="description" content="Embeddings ChatGPT" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col ">
        <input
          className="border border-gray-300 text-black rounded-md p-2"
          placeholder="Ask a question"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          alt="Ask a question"
        />
        <button
          type="button"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleAnswer}
        >
          Submit
        </button>

        <div className="mt-4">
          {loading ? <div>Loading...</div> : <Answer text={answer} />}
        </div>
      </div>
    </>
  );
}
