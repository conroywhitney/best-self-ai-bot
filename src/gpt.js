import { PineconeClient } from "@pinecone-database/pinecone";
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models";
import { OpenAIEmbeddings } from "langchain/embeddings";
import {
    AIMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    PromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";
import { PineconeStore } from "langchain/vectorstores";

export const getGPTResponse = async ({ docsLength = 5, historyLength = 25, input, messages }) => {
    const llm = new ChatOpenAI({ maxTokens: 1024, modelName: "gpt-4", temperature: 0.9, topP: 1 });
    const prompt = getPrompt({ historyLength, messages })
    const chain = new LLMChain({ llm, prompt });
    const docs = await getDocs({ docsLength, input });
    const vector_database_docs = docs.map(doc => doc.pageContent).join("\n");

    console.log("vector_database_docs", vector_database_docs);

    console.log("chain", chain.serialize());

    // const response = "pong";
    const { text: response } = await chain.call({ input, vector_database_docs });

    console.log("response", response);

    return response;
}

async function getDocs({ docsLength, input }) {
    const pinecone = new PineconeClient();
    await pinecone.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), { pineconeIndex });
    const docs = await vectorStore.similaritySearch(input, docsLength);

    console.log("docs", docs);

    return docs;
}

function getPrompt({ historyLength, messages }) {
    const systemMessage = `
        The following is a conversation with a human user in a chat application.
        The following documents were retrieved from a vector database based on the user's input.
        These may or may not prove useful to helping you generate a response.

        {vector_database_docs}
    `;
    
    const promptMessages = [
        SystemMessagePromptTemplate.fromTemplate(systemMessage)
    ]

    messages.slice(0, historyLength).forEach(message => {
        promptMessages.push(openAIResponseToChatMessage(message.role, message.content));
    });

    promptMessages.push(HumanMessagePromptTemplate.fromTemplate("{input}"));

    console.log("promptMessages", promptMessages);

    return ChatPromptTemplate.fromPromptMessages(promptMessages);
}

function openAIResponseToChatMessage(role, text) {
    switch (role) {
      case "user":
        return HumanMessagePromptTemplate.fromTemplate(text);
      case "assistant":
        return AIMessagePromptTemplate.fromTemplate(text);
    }
}
