import { PineconeClient } from "@pinecone-database/pinecone";
import * as dotenv from 'dotenv';
import { existsSync, readFileSync } from "fs";
import { Document } from "langchain/document";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { PineconeStore } from "langchain/vectorstores";

dotenv.config();

const pinecone = new PineconeClient();
await pinecone.init({
  environment: process.env.PINECONE_ENVIRONMENT,
  apiKey: process.env.PINECONE_API_KEY,
});
const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME);

const fileName = "docs/best-self.json";
const messages = existsSync(fileName) ? JSON.parse(readFileSync(fileName, "utf8") || "[]") : [];

const docs = messages.map(message => {
    return new Document({
        metadata: { format: "json" },
        pageContent: JSON.stringify(message)
    });
});

await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), { pineconeIndex });
