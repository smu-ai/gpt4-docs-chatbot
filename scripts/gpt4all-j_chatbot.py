from typing import List
import os
import urllib
from bs4 import BeautifulSoup
from timeit import default_timer as timer


from langchain import PromptTemplate, LLMChain
from langchain.document_loaders import PyPDFLoader
from langchain.document_loaders import DirectoryLoader
from langchain.embeddings import HuggingFaceInstructEmbeddings
from langchain.llms import GPT4All
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores.chroma import Chroma
from langchain.chains import ConversationalRetrievalChain
from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
from langchain.memory import ConversationBufferMemory

# Constants
local_path = '../../models/ggml-gpt4all-j.bin'
index_path = "../data/chromadb"

## utility functions

import textwrap
import os

def wrap_text_preserve_newlines(text, width=110):
    # Split the input text into lines based on newline characters
    lines = text.split('\n')

    # Wrap each line individually
    wrapped_lines = [textwrap.fill(line, width=width) for line in lines]

    # Join the wrapped lines back together using newline characters
    wrapped_text = '\n'.join(wrapped_lines)

    return wrapped_text

def process_llm_response(llm_response):
    print(wrap_text_preserve_newlines(llm_response['result']))
    if 'source_documents' in llm_response:
        print('\nSources:')
        for source in llm_response["source_documents"]:
            print(source.metadata['url'] + " page: " + str(source.metadata['page']))
    else:
        print(llm_response.__dict__)        

# Main execution
# Callbacks support token-wise streaming
callbacks = [StreamingStdOutCallbackHandler()]
# Verbose is required to pass to the callback manager
# llm = GPT4All(model=local_path, callbacks=callbacks, verbose=True)
# If you want to use GPT4ALL_J model add the backend parameter
llm = GPT4All(model=local_path, n_ctx=2048, backend='gptj',
              callbacks=callbacks, verbose=True)

embeddings =  HuggingFaceInstructEmbeddings(model_name="hkunlp/instructor-xl",
                                         model_kwargs={"device": "cpu"})

index = Chroma(embedding_function= embeddings, 
               persist_directory= index_path)

memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

qa = ConversationalRetrievalChain.from_llm(
    llm, index.as_retriever(), max_tokens_limit=400, 
    memory=memory, return_source_documents=True)

# Chatbot loop
chat_history = []
print("Welcome to the Priceless Chatbot! Type 'exit' to stop.")
while True:
    query = input("Please enter your question: ")

    if query.lower() == 'exit':
        break
    start = timer()
    result = qa({"question": query, "chat_history": chat_history})
    end = timer()

    process_llm_response(result)
    print(end - start) # Time in seconds, e.g. 5.38091952400282    
