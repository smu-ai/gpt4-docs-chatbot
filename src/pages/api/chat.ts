import type { NextApiRequest, NextApiResponse } from 'next';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores';
import { makeChain } from '@/utils/makechain';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { EVENT_STREAM_ENABLED, VECTOR_STORE, HNSWLIB_DB_DIR, CHROMA_SERVER_URL, CHROMA_COLLECTION_NAME, MILVUS_SERVER_URL, MILVUS_COLLECTION_NAME, MILVUS_DB_USERNAME, MILVUS_DB_PASSWORD } from '@/config/data';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { Chroma } from 'langchain/vectorstores/chroma';
import { Milvus } from 'langchain/vectorstores/milvus';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { question, history } = req.body;

  console.log('Question: ', question);

  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  const embeddings = new OpenAIEmbeddings();

  let vectorStore
  if (VECTOR_STORE === 'pinecone') {
    const index = pinecone.Index(PINECONE_INDEX_NAME!);

    /* create vectorstore*/
    vectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index,
        textKey: 'text',
        namespace: PINECONE_NAME_SPACE,
      },
    );
  } else if (VECTOR_STORE === 'chroma') {
    vectorStore = await Chroma.fromExistingCollection(embeddings,
      {
        collectionName: CHROMA_COLLECTION_NAME!,
        url: CHROMA_SERVER_URL,
      });
  } else if (VECTOR_STORE === 'milvus') {
    vectorStore = await Milvus.fromExistingCollection(embeddings,
      {
        collectionName: MILVUS_COLLECTION_NAME!,
        url: MILVUS_SERVER_URL!,
        username: MILVUS_DB_USERNAME,
        password: MILVUS_DB_PASSWORD,
        ssl: MILVUS_SERVER_URL!.startsWith('https')
      });
  } else {
    vectorStore = await HNSWLib.load(HNSWLIB_DB_DIR!, embeddings);
  }

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

  //create chain
  const chain = makeChain(vectorStore, (token: string) => {
    if (EVENT_STREAM_ENABLED) {
      sendData(JSON.stringify({ token }));
    }
  });

  try {
    const timer = `Elapsed time:`;
    console.time(timer);
    //Ask a question
    const response = await chain.call({
      question: sanitizedQuestion,
      chat_history: history || [],
    });

    const answer = response.text;
    console.log('Answer:', answer);
    console.timeEnd(timer);

    if (!EVENT_STREAM_ENABLED) {
      sendData(JSON.stringify({ token: answer }));
    }
    sendData(JSON.stringify({ sourceDocs: response.sourceDocuments }));
  } catch (error) {
    console.log('error', error);
  } finally {
    res.end();
  }
}
