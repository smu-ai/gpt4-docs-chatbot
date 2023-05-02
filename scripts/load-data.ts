import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { CustomPDFLoader, CustomHTMLLoader } from '@/utils/customPDFLoader';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { VECTOR_STORE, HNSWLIB_DB_DIR, SOURCE_FILES_DIR, CHROMA_SERVER_URL, CHROMA_COLLECTION_NAME, MILVUS_SERVER_URL, MILVUS_COLLECTION_NAME, MILVUS_DB_USERNAME, MILVUS_DB_PASSWORD } from '@/config/data';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { Chroma } from "langchain/vectorstores/chroma";
import { Embeddings } from "langchain/embeddings/base";
import { Document } from "langchain/document";
import { Milvus } from "langchain/vectorstores/milvus";

/* Name of directory to retrieve your files from */
const filePath = SOURCE_FILES_DIR!;

const processDocumentsWithHNSWLib = async (embeddings: Embeddings, docs: Document[]) => {
  while (true) {
    let vectorStore
    try {
      vectorStore = await HNSWLib.load(HNSWLIB_DB_DIR!, embeddings);
    } catch (error) {
      vectorStore = await HNSWLib.fromDocuments([], embeddings);
    }

    let startIndex = vectorStore.docstore._docs.size;
    console.log('startIndex: ', startIndex);
    const length = docs.length;

    if (startIndex === length) {
      break;
    }

    try {
      const batchSize = 100;
      for (let i = startIndex; i < length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        await vectorStore.addDocuments(batch);
        await vectorStore.save(HNSWLIB_DB_DIR!);
      }
    } catch (error) {
      console.error('Retrying after error: ', error);
    }
  }
};

const loadVectorsToPinecone = async (embeddings: Embeddings, docs: Document[]) => {
  while (true) {
    let vectorStore = await HNSWLib.load(HNSWLIB_DB_DIR!, embeddings);
    const ids = vectorStore.index.getIdsList();
    ids.sort((a, b) => a - b);
    // console.log(ids);
    const length = docs.length;
    const size = ids.length;
    if (length !== size) {
      throw new Error(`HNSWLib vector store size ${size} doesn't match #docs ${length}`)
    }

    const docInStore = vectorStore.docstore._docs.get('100');
    const docLoadedFromFile = docs[100];
    if (docInStore?.pageContent !== docLoadedFromFile.pageContent) {
      throw new Error(`HNSWLib vector store doc \n${JSON.stringify(docInStore)} \n\ndoesn't match with doc loaded from file \n${JSON.stringify(docLoadedFromFile)}`)
    }

    const index = pinecone.Index(PINECONE_INDEX_NAME!); //change to your own index name
    const indexData = await index.describeIndexStats({
      describeIndexStatsRequest: {},
    });

    let startIndex = indexData.totalVectorCount!;
    console.log('startIndex: ', startIndex);

    if (startIndex >= length) {
      break;
    }

    const pineconeVectorStore = await PineconeStore.fromExistingIndex(
      embeddings,
      {
        pineconeIndex: index,
        textKey: 'text',
        namespace: PINECONE_NAME_SPACE,
      },
    );

    try {
      const batchSize = 100;
      for (let i = startIndex; i < length; i += batchSize) {
        console.log(i);
        const idNumbers = ids.slice(i, i + batchSize);
        const vectorBatch = idNumbers.map(id => vectorStore.index.getPoint(id));
        const idBatch = idNumbers.map(id => id.toString());
        const docBatch = docs.slice(i, i + batchSize);
        await pineconeVectorStore.addVectors(vectorBatch, docBatch, idBatch);
      }
    } catch (error) {
      console.error('Retrying after error: ', error);
    }
  }
};

const loadVectorsToChroma = async (embeddings: Embeddings, docs: Document[]) => {
  while (true) {
    let vectorStore = await HNSWLib.load(HNSWLIB_DB_DIR!, embeddings);
    const ids = vectorStore.index.getIdsList();
    ids.sort((a, b) => a - b);
    // console.log(ids);
    const length = docs.length;
    const size = ids.length;
    if (length !== size) {
      throw new Error(`HNSWLib vector store size ${size} doesn't match #docs ${length}`)
    }

    const docInStore = vectorStore.docstore._docs.get('100');
    const docLoadedFromFile = docs[100];
    if (docInStore?.pageContent !== docLoadedFromFile.pageContent) {
      throw new Error(`HNSWLib vector store doc \n${JSON.stringify(docInStore)} \n\ndoesn't match with doc loaded from file \n${JSON.stringify(docLoadedFromFile)}`)
    }

    let chromaVectorStore;
    try {
      chromaVectorStore = await Chroma.fromExistingCollection(embeddings,
        {
          collectionName: CHROMA_COLLECTION_NAME!,
          url: CHROMA_SERVER_URL,
        });

    } catch (error) {
      console.error(error);
      chromaVectorStore = new Chroma(embeddings,
        {
          url: CHROMA_SERVER_URL,
          numDimensions: 1536,
          collectionName: CHROMA_COLLECTION_NAME,
        });
    }

    let startIndex = await chromaVectorStore.collection?.count()!;
    console.log('startIndex: ', startIndex);

    if (startIndex >= length) {
      break;
    }

    try {
      const batchSize = 100;
      for (let i = startIndex; i < length; i += batchSize) {
        console.log(i);
        const idNumbers = ids.slice(i, i + batchSize);
        const vectorBatch = idNumbers.map(id => vectorStore.index.getPoint(id));
        const docBatch = docs.slice(i, i + batchSize);
        await chromaVectorStore.addVectors(vectorBatch, docBatch);
      }
    } catch (error) {
      console.error('Retrying after error: ', error);
    }
  }
};

const loadVectorsToMilvus = async (embeddings: Embeddings, docs: Document[]) => {
  while (true) {
    let vectorStore = await HNSWLib.load(HNSWLIB_DB_DIR!, embeddings);
    const ids = vectorStore.index.getIdsList();
    ids.sort((a, b) => a - b);
    // console.log(ids);

    const length = docs.length;
    const size = ids.length;
    if (length !== size) {
      throw new Error(`HNSWLib vector store size ${size} doesn't match #docs ${length}`)
    }

    const docInStore = vectorStore.docstore._docs.get('100');
    const docLoadedFromFile = docs[100];
    if (docInStore?.pageContent !== docLoadedFromFile.pageContent) {
      throw new Error(`HNSWLib vector store doc \n${JSON.stringify(docInStore)} \n\ndoesn't match with doc loaded from file \n${JSON.stringify(docLoadedFromFile)}`)
    }

    let milvusVectorStore;
    try {
      milvusVectorStore = await Milvus.fromExistingCollection(embeddings,
        {
          collectionName: MILVUS_COLLECTION_NAME!,
          url: MILVUS_SERVER_URL!,
          username: MILVUS_DB_USERNAME,
          password: MILVUS_DB_PASSWORD,
          ssl: MILVUS_SERVER_URL!.startsWith('https')
        });
    } catch (error) {
      console.error('fromExistingCollection error: ', error);
      milvusVectorStore = new Milvus(embeddings,
        {
          collectionName: MILVUS_COLLECTION_NAME!,
          url: MILVUS_SERVER_URL!,
          username: MILVUS_DB_USERNAME,
          password: MILVUS_DB_PASSWORD,
          ssl: MILVUS_SERVER_URL!.startsWith('https')
        });
    }
    // console.log(milvusVectorStore);
    // console.log('checkHealth: ', await milvusVectorStore.client.checkHealth());

    let startIndex = 0;
    try {
      const stats = await milvusVectorStore.client.getCollectionStatistics({
        collection_name: MILVUS_COLLECTION_NAME!,
      });
      console.log(stats);
      if (stats.data.row_count) {
        startIndex = parseInt(stats.data.row_count);
      }
    } catch (error) {
      console.error(error);
    }

    console.log('startIndex: ', startIndex);

    if (startIndex >= length) {
      break;
    }

    try {
      const batchSize = 100;
      for (let i = startIndex; i < length; i += batchSize) {
        console.log(i);
        const idNumbers = ids.slice(i, i + batchSize);
        const vectorBatch = idNumbers.map(id => vectorStore.index.getPoint(id));
        const docBatch = docs.slice(i, i + batchSize);
        await milvusVectorStore.addVectors(vectorBatch, docBatch);
      }
    } catch (error) {
      console.error('Retrying after error: ', error);
    }
  }
};

export const run = async () => {
  try {
    console.log('loading files from dir: ', filePath);

    /*load raw docs from the all files in the directory */
    const directoryLoader = new DirectoryLoader(filePath, {
      '.pdf': (path) => new CustomPDFLoader(path),
      '.html': (path) => new CustomHTMLLoader(path, filePath),
    });

    // const loader = new PDFLoader(filePath);
    const rawDocs = await directoryLoader.load();
    console.log('loaded #docs: ', rawDocs.length);

    /* Split text into chunks */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1600,
      chunkOverlap: 80,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    console.log('split #docs: ', docs.length);

    console.log(`creating vector store with ${VECTOR_STORE} ...`);
    /*create and store the embeddings in the vectorStore*/
    const embeddings = new OpenAIEmbeddings();

    if (VECTOR_STORE === 'hnswlib') {
      await processDocumentsWithHNSWLib(embeddings, docs);
    } else if (VECTOR_STORE === 'pinecone') {
      await loadVectorsToPinecone(embeddings, docs);
    } else if (VECTOR_STORE === 'chroma') {
      await loadVectorsToChroma(embeddings, docs);
    } else if (VECTOR_STORE === 'milvus') {
      await loadVectorsToMilvus(embeddings, docs);
    } else {
      throw new Error(`unsupported vector store: ${VECTOR_STORE}`)
    }
  } catch (error) {
    console.error('Failed to ingest your data: ', error);
  }
};

(async () => {
  console.time('myTimer');

  await run();

  console.timeEnd('myTimer');
  console.log('ingestion complete');
})();
