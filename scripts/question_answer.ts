import { url } from 'inspector';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { CallbackManager } from 'langchain/callbacks';
import { ChainValues } from 'langchain/dist/schema';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { initVectorStore } from '@/utils/vectorstore';
import { makeChain } from '@/utils/makechain';

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
        console.log('\t', doc.pageContent);
        console.log(doc.metadata);
    }
    console.log("------------------------------------------------------------------------");
}

export const run = async () => {
    try {
        const callbackManagerForLLM = CallbackManager.fromHandlers({
            handleLLMNewToken: async (token: any) => {
                process.stdout.write(token);
            },
            handleLLMEnd: async (output: any) => {
                console.log('\n\nhandleLLMEnd:', JSON.stringify(output));
            },
            handleLLMError: async (e: any) => {
                console.error('handleLLMError:', e);
            },
        });

        const embeddings = new OpenAIEmbeddings();
        const vectorStore = await initVectorStore(embeddings, {
            get: (key: any) => process.env[key]
        });

        //create chain
        const chain = makeChain(vectorStore, callbackManagerForLLM);

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



