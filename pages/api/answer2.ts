import { OpenAIStreamOld } from "../../utils/index";
import { NextApiResponse, NextApiRequest } from "next";

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
      await OpenAIStreamOld(
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
  } catch (e) {
    debugger;
    return new Response("Error", { status: 500 });
  }
};

export default handler;
