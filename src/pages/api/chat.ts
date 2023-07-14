import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { CallbackManager } from 'langchain/callbacks';
import { initVectorStore } from '@/utils/vectorstore';
import { makeChain } from '@/utils/makechain';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { question, history } = req.body;

  console.log('Question: ', question);

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }

  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  res.writeHead(200, {
    Connection: 'keep-alive',
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Transfer-Encoding': 'chunked',
    'Content-Encoding': 'none'
  });

  const sendData = (data: string) => {
    res.write(`data: ${data}\n\n`);
  };

  const callbackManagerForLLM = CallbackManager.fromHandlers({
    handleLLMNewToken: async (token: any) => {
      await sendData(JSON.stringify({ token }));
    },
    handleLLMEnd: async (output: any) => {
      console.log('handleLLMEnd:', JSON.stringify(output));
      await sendData(JSON.stringify({ token: "\n" }));
    },
    handleLLMError: async (e: any) => {
      console.error('handleLLMError:', e);
    },
  });

  const embeddings = new OpenAIEmbeddings();
  const vectorStore = await initVectorStore(embeddings, {
    get: (key: any) => process.env[key]
  });

  const getChatHistoryString = (chatHistory: any) => {
    if (Array.isArray(chatHistory)) {
      return chatHistory
        .map((chatMessage) => {
          return `Human: ${chatMessage[0]}\nAssistant: ${chatMessage[1]}`;
        })
        .join("\n");
    }
    return chatHistory;
  }

  //create chain
  const chain = makeChain(vectorStore, callbackManagerForLLM);

  try {
    const timer = `Elapsed time:`;
    console.time(timer);
    //Ask a question
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: getChatHistoryString(history || []),
    });

    const answer = response.text;
    console.log('Answer:', answer);
    console.timeEnd(timer);

    sendData(JSON.stringify({ sourceDocs: response.sourceDocuments }));
  } catch (error) {
    console.log('error', error);
  } finally {
    res.end();
  }
}
