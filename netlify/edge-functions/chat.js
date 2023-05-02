import { CallbackManager } from "langchain/callbacks";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { corsHeaders } from "../_shared/cors.js";
import { initVectorStore } from "../_shared/vectorstore.js";
import { makeChain } from '../_shared/makechain.js';


const serve = async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, history } = await req.json();
    console.log('Question:', question);

    const readyToSendData = !history || history.length === 0;

    if (!question) {
      throw new Error('No question in the request');
    }
    const timer = `Elapsed time:`;
    console.time(timer);

    const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendData = async (data) => {
      if (readyToSendData) {
        const res = `data: ${data}\n\n`;
        // console.log('sendData:', res);
        await writer.write(encoder.encode(res));
      }
    };

    const callbackManagerForLLM = CallbackManager.fromHandlers({
      handleLLMNewToken: async (token) => {
        await writer.ready;
        await sendData(JSON.stringify({ token }));
      },
      handleLLMEnd: async (output) => {
        console.log('handleLLMEnd:', output);
        if (!readyToSendData) {
          readyToSendData = true;
        }
      },
      handleLLMError: async (e) => {
        console.log('handleLLMError:', e);
      },
    });

    const embeddings = new OpenAIEmbeddings();
    const vectorStore = await initVectorStore(embeddings, Deno.env);
    const chain = makeChain(vectorStore, callbackManagerForLLM);

    const callbackManagerForChain = CallbackManager.fromHandlers({
      handleChainEnd: async (outputs) => {
        // console.log('handleChainEnd:', outputs);

        if (outputs.sourceDocuments) {
          const answer = outputs.text;
          console.log('Answer:', answer);

          console.timeEnd(timer);

          await writer.ready;
          sendData(JSON.stringify({ sourceDocs: outputs.sourceDocuments }));
          await writer.close();
        }
      },
    });

    chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    }, callbackManagerForChain).catch((e) => console.error(e));

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        'Connection': 'keep-alive',
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Transfer-Encoding': 'chunked',
        'Content-Encoding': 'none'
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config = { path: "/chat" };

export default serve;
