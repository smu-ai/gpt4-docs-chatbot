import { OpenAIChat } from 'langchain/llms/openai';
import { ConversationalRetrievalQAChain } from 'langchain/chains';


export const makeChain = (vectorStore, callbackManager, env) => {
  const model = new OpenAIChat({
    temperature: 0,
    modelName: env.get('OPENAI_MODEL_NAME') ?? 'gpt-4-1106-preview', //change this to older versions (e.g. gpt-3.5-turbo) if you don't have access to gpt-4
    streaming: Boolean(callbackManager),
    callbackManager
  });

  const QA_PROMPT = `You are a helpful AI assistant. Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say ${env.get('PROMPT_YOU_DONT_KNOW') ?? "you don't know"}. DO NOT try to make up an answer.
If the question is not related to the context, politely respond that you are tuned to only answer questions that are related to the context.

{context}

Question: {question}
Helpful answer in markdown:`;

  const chain = ConversationalRetrievalQAChain.fromLLM(
    model,
    vectorStore.asRetriever(),
    {
      qaTemplate: QA_PROMPT,
      returnSourceDocuments: true, //The number of source documents returned is 4 by default
    },
  );
  return chain;
};
