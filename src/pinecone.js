import { PineconeClient } from "@pinecone-database/pinecone";
import * as dotenv from 'dotenv';
import { existsSync, readFileSync } from "fs";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { PineconeStore } from "langchain/vectorstores";
import { OpenAI } from "langchain/llms";

dotenv.config();

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

async function indexFile(fileName) {
    const pinecone = new PineconeClient();
    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    });
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

    const messages = existsSync(fileName) ? JSON.parse(readFileSync(fileName, "utf8") || "[]") : [];

    const docs = await Promise.all(messages.map(async (message) => {
        const summary = await summarize(message)

        return new Document({
            metadata: { format: "json" },
            pageContent: summary
        });
    }));

    console.log(docs);

    await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), { pineconeIndex });
}

// indexFile("messages.json");