import { OpenAIChat } from 'langchain/llms/openai';
import { VectorStore } from 'langchain/vectorstores/base';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { CallbackManager } from 'langchain/callbacks';

const CONDENSE_PROMPT = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.
Use Simplified Chinese only.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:`;

const QA_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.
Use Simplified Chinese only.

{context}

Question: {question}
Helpful answer in markdown:`;

export const makeChain = (vectorStore: VectorStore, callbackManager: CallbackManager, traditional_chinese: any) => {
  const model = new OpenAIChat({
    temperature: 0,
    modelName: 'gpt-4-1106-preview', //change this to older versions (e.g. gpt-3.5-turbo) if you don't have access to gpt-4
    streaming: Boolean(callbackManager),
    callbackManager
  });

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(),
    {
      qaTemplate: traditional_chinese == "true" ? QA_PROMPT.replace("Simplified Chinese", "Traditional Chinese") : QA_PROMPT,
      questionGeneratorTemplate: traditional_chinese == "true" ? CONDENSE_PROMPT.replace("Simplified Chinese", "Traditional Chinese") : CONDENSE_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );

  return chain;
};
