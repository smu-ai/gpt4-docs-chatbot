import { url } from 'inspector';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { VECTOR_STORE, HNSWLIB_DB_DIR, CHROMA_SERVER_URL, CHROMA_COLLECTION_NAME, MILVUS_SERVER_URL, MILVUS_COLLECTION_NAME, MILVUS_DB_USERNAME, MILVUS_DB_PASSWORD } from '@/config/data';
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { Chroma } from "langchain/vectorstores/chroma";
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { pinecone } from '@/utils/pinecone-client';
import { makeChain } from '@/utils/makechain';
import { ChainValues } from 'langchain/dist/schema';
import { Milvus } from "langchain/vectorstores/milvus";
import { ConversationalRetrievalQAChain } from 'langchain/chains';

function printSourceURLs(result: ChainValues) {
}
async function callChain(chain: ConversationalRetrievalQAChain, values: ChainValues) {
    console.log(values.question);
    const timer = "\n\nElapsed time";
    console.time(timer);
    const result = await chain.call(values);
    console.timeEnd(timer);

    console.log("\nSources:");
    for (const doc of result.sourceDocuments) {
        // console.log('\t', doc.metadata.url);
        console.log(doc.metadata);
    }
    console.log("------------------------------------------------------------------------");
}

export const run = async () => {
    try {
        console.log(`question answering with vector store ${VECTOR_STORE} ...`);
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

        const chain = makeChain(vectorStore, (token: string) => {
            process.stdout.write(token);
        });

        let question = "What is Mastercard Priceless?";
        await callChain(chain, { question, chat_history: [] });

        question = "What is Priceless Singapore?";
        await callChain(chain, { question, chat_history: [] });

        question = "Any recommendation on dining in Istanbul?";
        await callChain(chain, { question, chat_history: [] });

        question = "Any recommendation on entertainment in New York?";
        await callChain(chain, { question, chat_history: [] });

        question = "请推荐一下纽约的娱乐";
        await callChain(chain, { question, chat_history: [] });
    } catch (error) {
        console.log("error", error);
    }
};

(async () => {
    await run();
    console.log('question answering complete');
})();



