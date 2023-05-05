# GPT-4 & LangChain - Create a ChatGPT Chatbot for Your HTML & PDF Files

This project uses the OpenAI's GPT-4 APIs to build a chatbot for multiple HTML & PDF files.

[![Chat with Mastercard Priceless](./public/demo.gif)](https://gpt4-docs-chatbot.netlify.app/)

## How it works

Tech stack used includes LangChain, Typescript, OpenAI, Next.js, HNSWLib, Chroma, Milvus and Pinecone. LangChain is a framework that makes it easier to build scalable AI/LLM apps and chatbots. HNSWLib, Chroma, Milvus and Pinecone are vectorstores for storing embeddings for your files. Here are some basic facts on these vectorstores.

| | HNSWLib | Chroma | Milvus | Pinecone |
| -------- | -------- | -------- | -------- | -------- |
| GitHub repos | [HNSWLib](https://github.com/nmslib/hnswlib) | [Chroma](https://github.com/chroma-core/chroma) | [Milvus](https://github.com/milvus-io/milvus) | [Pinecone](https://github.com/pinecone-io) |
| Open Source? | Yes | Yes| Yes | No |
| Open Source License | Apache-2.0 | Apache-2.0| Apache-2.0 | N/A |
| Managed Service Available? | No | No<br>[Coming Q3 2023](https://www.trychroma.com/)| [Yes](https://zilliz.com/cloud) | [Yes](https://www.pinecone.io/) |
| Managed Service Free-tier? | N/A | N/A| No<br>Get $100 credits with 30-day trial upon registration  | Yes<br>All users will have access to a single free project and index within a free tier environment.|

## Running Locally

Run `node -v` to make sure you're running Node version 18 or above. 

1. Clone the repo or download the ZIP

```
git clone [github https url]
```


2. Install packages

If not done already, run `npm install -g yarn` to install yarn globally.

Then run:

```
yarn install
```

3. Set up your `.env` file

- Copy `.env.example` into `.env`. Your `.env` file should look like this:

```
OPENAI_API_KEY=

NEXT_PUBLIC_DOCS_CHAT_API_URL=

VECTOR_STORE=hnswlib
# VECTOR_STORE=chroma
# VECTOR_STORE=milvus
# VECTOR_STORE=pinecone

SOURCE_FILES_DIR=data/docs
HNSWLIB_DB_DIR=data/hnswlib

CHROMA_COLLECTION_NAME=
CHROMA_SERVER_URL=

MILVUS_SERVER_URL=
MILVUS_DB_USERNAME=
MILVUS_DB_PASSWORD=

PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=
PINECONE_NAME_SPACE=
```

- Visit [openai](https://help.openai.com/en/articles/4936850-where-do-i-find-my-secret-api-key) to retrieve API keys and insert into your `.env` file.
- If you don't have access to `gpt-4` api, In `utils/makechain.ts` change `modelName` in `new OpenAI` to `gpt-3.5-turbo`
- The sample HTML files and the corresponding embeddings are stored in folders `data/docs` and `data/hnswlib` respectively, which allows you to run locally using HNSWLib vectorstore without any additional work. 
- You can also put your own files to any folder specified in `SOURCE_FILES_DIR` and run the command below to generate embeddings which will be stored in folder `HNSWLIB_DB_DIR`. Please note this will call OpenAI Embeddings API, which might cost a lot if your data size is big. As a reference, to load the 171 HTML files stored in folder `data/docs`, with a total size of around 180M, I spent around $22 USD.
```
yarn load
```
- If you want to use another vectorstore, i.e., Chroma, Milvus or Pinecone, you will need to uncomment the correct `VECTOR_STORE` line, set up the corresponding env variables and then load the embeddings from folder `HNSWLIB_DB_DIR` to the vectorstore by running `yarn load` command. This will not incur any cost as no OpenAI API will be called.


4. Start the local server at `http://localhost:3000`:

```
yarn dev
```

## One-Click Deploy

Deploy the project using  [Netlify](https://docs.netlify.com/site-deploys/create-deploys/#deploy-to-netlify-button):

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/inflaton/gpt4-docs-chatbot)


- Please use the following build command:
```
yarn build-netlify
```

- As the backend API will be deployed as an edge function at path `/chat`, please set up the environment variable `NEXT_PUBLIC_DOCS_CHAT_API_URL` to `'/caht'`, along with `OPENAI_API_KEY` and vectorstore related ones. 
- E.g., below are the environment variables required for using Pinecone vectorstore.
```
NEXT_PUBLIC_DOCS_CHAT_API_URL='/chat'
VECTOR_STORE=pinecone
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX_NAME=
PINECONE_NAME_SPACE=
```

- Please note HNSWLib vectorstore can't be used as it is not possible to read or write files from the file system in Edge Functions. 

## Blog Post

If you'd like to know more about this project, check out the [blog post](https://mirror.xyz/0x90f2036E332dfAD451ba9E9C82366F4ba79173d8/Kacd_FPecsMWTA5cvVXvNNzaiaYrtssHa-2sxxSIcIw).
