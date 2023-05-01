import { PineconeStore } from 'langchain/vectorstores';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { Chroma } from 'langchain/vectorstores/chroma';
// import { Milvus } from 'langchain/vectorstores/milvus';
import { Embeddings } from 'langchain/embeddings/base';
import { PineconeClient } from '@pinecone-database/pinecone';

const PINECONE_INDEX_NAME = Deno.env.get('PINECONE_INDEX_NAME');
const PINECONE_NAME_SPACE = Deno.env.get('PINECONE_NAME_SPACE');
const VECTOR_STORE = Deno.env.get('VECTOR_STORE');
const HNSWLIB_DB_DIR = Deno.env.get('HNSWLIB_DB_DIR');
const CHROMA_SERVER_URL = Deno.env.get('CHROMA_SERVER_URL');
const CHROMA_COLLECTION_NAME = Deno.env.get('CHROMA_COLLECTION_NAME');
// const MILVUS_SERVER_URL = Deno.env.get('MILVUS_SERVER_URL');
// const MILVUS_COLLECTION_NAME = Deno.env.get('MILVUS_COLLECTION_NAME');
// const MILVUS_DB_USERNAME = Deno.env.get('MILVUS_DB_USERNAME');
// const MILVUS_DB_PASSWORD = Deno.env.get('MILVUS_DB_PASSWORD');

async function initPinecone() {
  if (!Deno.env.get('PINECONE_ENVIRONMENT') || !Deno.env.get('PINECONE_API_KEY')) {
    throw new Error('Pinecone environment or api key vars missing');
  }

  try {
    const pinecone = new PineconeClient();

    await pinecone.init({
      environment: Deno.env.get('PINECONE_ENVIRONMENT'),
      apiKey: Deno.env.get('PINECONE_API_KEY'),
    });

    return pinecone;
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to initialize Pinecone Client');
  }
}

export const initVectorStore = async (embeddings: Embeddings) => {
  let vectorStore
  if (VECTOR_STORE === 'pinecone') {
    const pinecone = await initPinecone();
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
    // } else if (VECTOR_STORE === 'milvus') {
    //   vectorStore = await Milvus.fromExistingCollection(embeddings,
    //     {
    //       collectionName: MILVUS_COLLECTION_NAME!,
    //       url: MILVUS_SERVER_URL!,
    //       username: MILVUS_DB_USERNAME,
    //       password: MILVUS_DB_PASSWORD,
    //       ssl: MILVUS_SERVER_URL!.startsWith('https')
    //     });
  } else {
    vectorStore = await HNSWLib.load(HNSWLIB_DB_DIR!, embeddings);
  }

  return vectorStore;
}
