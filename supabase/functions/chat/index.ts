import { serve } from "http/server.ts";
import { CallbackManager } from "langchain/callbacks";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { corsHeaders } from "../_shared/cors.ts";
import { initVectorStore } from "../_shared/vectorstore.ts";
import { makeChain } from '../_shared/makechain.ts';
import { ChainValues, LLMResult } from "langchain/dist/schema/index.js";

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question, history } = await req.json();
    console.log('Question:', question);

    if (!question) {
      throw new Error('No question in the request');
    }

    const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendData = async (data: string) => {
      const res = `data: ${data}\n\n`;
      // console.log('sendData:', res);
      await writer.write(encoder.encode(res));
    };

    const callbackManagerForLLM = CallbackManager.fromHandlers({
      handleLLMNewToken: async (token) => {
        await writer.ready;
        await sendData(JSON.stringify({ data: token }));
      },
      handleLLMEnd: async (output: LLMResult) => {
        console.log('handleLLMEnd:', output);
      },
      handleLLMError: async (e) => {
        console.log('handleLLMError:', e);
      },
    });

    const embeddings = new OpenAIEmbeddings();
    const vectorStore = await initVectorStore(embeddings);
    const chain = makeChain(vectorStore, callbackManagerForLLM);

    const callbackManagerForChain = CallbackManager.fromHandlers({
      handleChainEnd: async (outputs: ChainValues) => {
        // console.log('handleChainEnd:', outputs);

        if (outputs.sourceDocuments) {
          await writer.ready;

          sendData(JSON.stringify({ sourceDocs: outputs.sourceDocuments }));
          sendData('[DONE]');

          const answer = outputs.text;
          console.log('Answer:', answer);
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
});
