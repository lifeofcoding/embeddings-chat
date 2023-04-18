import { OpenAIStream } from "../../utils/index";

export const config = {
  runtime: "edge",
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { prompt, history } = (await req.json()) as {
      prompt: string;
      history: { role: string; content: string }[];
    };

    const stream = await OpenAIStream(
      prompt,
      process.env.OPENAI_API_KEY!,
      history
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response("Error", { status: 500 });
  }
};

export default handler;
