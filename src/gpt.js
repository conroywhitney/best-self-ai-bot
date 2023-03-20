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
import { OpenAI } from "langchain/llms";

export const summarize = async (message) => {
    const model = new OpenAI({ maxTokens: 2048, modelName: "gpt-3.5-turbo", temperature: 0.5 });
    const { content, role } = message;

    return await model.call(`
        Please create a JSON representation of the following chat message so that it can be indexed in a vector database and recalled by an AI during a future conversation.

        The object should have the following properties in this order: role, content, summary, keywords, searchTerms, concepts.

        Role: ${role}
        Content: ${content}
        JSON:
    `);
}

export const getGPTResponse = async ({ docsLength = 12, historyLength = 24, input, messages }) => {
    const llm = new ChatOpenAI({ maxTokens: 2048, modelName: "gpt-4", temperature: 0.9, topP: 1 });
    const docs = await getDocs({ docsLength, input });
    const prompt = getPrompt({ docs, historyLength, messages })
    const chain = new LLMChain({ llm, prompt });

    console.log("chain", chain.serialize());

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
    const search = await summarize(input);
    const docs = await vectorStore.similaritySearch(search, docsLength);

    console.log("docs", docs);

    return docs;
}

function getPrompt({ docs, historyLength, messages }) {
    const systemMessage = `
        The following is a fun, friendly, and collaborative conversation between an AI (you) and a human user in a chat application.
    `;
    
    const promptMessages = [
        SystemMessagePromptTemplate.fromTemplate(systemMessage)
    ]

    messages.slice(0, historyLength).reverse().forEach(message => {
        promptMessages.push(openAIResponseToChatMessage(message.role, message.content));
    });

    docs.forEach(doc => {
        try {
            const { content, role } = JSON.parse(doc.pageContent);
            promptMessages.push(
                SystemMessagePromptTemplate.fromTemplate(`
                    The following is a past chat message that was indexed in a vector database recalled by search of the most recent user message.
                    It may or may not be relevant to the current conversation, so it's up to the AI to decide whether to include it in the response.
                    The user does not have acccess to the vector database, so they will not know if the AI is including a past message in the response.

                    Role: ${role}
                    Content: ${content}
                `)
            );
        } catch (error) {
            console.error("Could not include doc", doc, error);
        }
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
