import { OpenAIStream } from "../../utils/index";
import { Configuration, OpenAIApi } from "openai";
import { OpenAIModel } from "@/types";
import { NextApiResponse, NextApiRequest } from "next";

// export const config = {
//   runtime: "edge",
// };

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      // Important to set no-transform to avoid compression, which will delay
      // writing response chunks to the client.
      // See https://github.com/vercel/next.js/issues/9965
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const { prompt, history } = req.body as {
      prompt: string;
      history: { role: string; content: string }[];
    };

    const sendData = (data: string) => {
      res.write(`data: ${data}\n\n`);
    };

    try {
      await OpenAIStream(
        prompt,
        process.env.OPENAI_API_KEY!,
        history,
        (token) => {
          if (token === "[DONE]") {
            res.write(`data: ${token}\n\n`);
            res.end();
          } else {
            sendData(JSON.stringify({ data: token }));
          }
        }
      );
    } catch (err) {
      console.error(err);
      // Ignore error
    }

    //     const completion = openai.createChatCompletion({
    //       model: OpenAIModel.DAVINCI_TURBO,
    //       messages: [
    //         {
    //           role: "system",
    //           content:
    //             "You are a helpful assistant that accurately answers queries. Use the text provided to form your answer, but avoid copying word-for-word from the essays. Try to use your own words when possible. Keep your answer under 5 sentences. Be accurate, helpful, concise, and clear.",
    //         },
    //         {
    //           role: "user",
    //           content: prompt,
    //         },
    //       ],
    //       max_tokens: 150,
    //       temperature: 0.0,
    //       stream: true,
    //     });

    // 	// const response = await fetch("https://example.com");
    // 	const stream = completion.
    //   const textStream = stream.pipeThrough(new TextDecoderStream());

    // return new Response(stream, { status: 200 });
  } catch (e) {
    debugger;
    return new Response("Error", { status: 500 });
  }
};

export default handler;
