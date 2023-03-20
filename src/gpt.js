import { PineconeClient } from "@pinecone-database/pinecone";
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models";
import { OpenAIEmbeddings } from "langchain/embeddings";
import {
    AIMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";
import { PineconeStore } from "langchain/vectorstores";

export const getGPTResponse = async ({ docsLength = 12, historyLength = 24, input, messages }) => {
    const llm = new ChatOpenAI({ maxTokens: 2048, modelName: "gpt-4", temperature: 0.9, topP: 1 });
    const docs = await getDocs({ docsLength, input });
    const prompt = getPrompt({ docs, historyLength, messages })
    const chain = new LLMChain({ llm, prompt });

    // console.log("chain", chain.serialize());

    // const response = "pong";
    const { text: response } = await chain.call({ input });

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

    // console.log("docs", docs);

    return docs;
}

function getPrompt({ docs, historyLength, messages }) {
    const systemMessage = `
        The following is a fun, friendly, and collaborative conversation between an AI (you) and a human user in a chat application.
    `;
    
    const promptMessages = [
        SystemMessagePromptTemplate.fromTemplate(systemMessage)
    ]

    docs.forEach(doc => {
        try {
            const jsonDoc = JSON.parse(doc.pageContent);
            promptMessages.push(openAIResponseToChatMessage(jsonDoc.role, jsonDoc.content));
        } catch (error) {
            console.error("Could not include doc", doc, error);
        }
    });

    messages.slice(0, historyLength).reverse().forEach(message => {
        promptMessages.push(openAIResponseToChatMessage(message.role, message.content));
    });

    promptMessages.push(HumanMessagePromptTemplate.fromTemplate("{input}"));

    // console.log("promptMessages", promptMessages);

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
