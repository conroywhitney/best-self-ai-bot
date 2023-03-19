import { ConversationChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models";
import { AIChatMessage, ChatMessage, HumanChatMessage, SystemChatMessage } from "langchain/schema";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
  MessagesPlaceholder,
} from "langchain/prompts";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";

export const getGPTResponse = async ({ input, messages }) => {
    const systemMessage = `
        Hey GPT! You are being called from a new Discord chatbot conversation tool. The goal is to increase the quality of interactions with you by:
        * Using the full range of interface tools that Discord has to offer (DMs, reactions, threads, select menus, buttons, etc.
        * Saving user messages in a vector database for additional context retrieval during conversations.
        * Adding pre-defined persona prompts and asking the user to define their intentions at the start of the conversation.
        * Creating a conversation tree to allow users to circle back to previous topics to explore in more depth.
        * Integrating with a library called LangChain to allow you to search the internet and perform other actions.

        This tool is currently in development. Please be patient as we work out the kinks. If you have any feedback, suggestions, or improvements, please let me know!
    `

    const llm = new ChatOpenAI({ maxTokens: 1024, modelName: "gpt-4", temperature: 1, topP: 1 });

    const prompt = ChatPromptTemplate.fromPromptMessages([
        SystemMessagePromptTemplate.fromTemplate(systemMessage),
        new MessagesPlaceholder("history"),
        HumanMessagePromptTemplate.fromTemplate("{input}"),
    ]);

    const memory = new BufferMemory({ returnMessages: true, memoryKey: "history" })

    const chatHistory = new ChatMessageHistory(messages.map((message) =>
        openAIResponseToChatMessage(message.role, message.content))
    );
    memory.chatHistory = chatHistory;

    const chain = new ConversationChain({ llm, memory, prompt });

    // return { response: "pong" };
    return await chain.call({ input });
}

function openAIResponseToChatMessage(role, text) {
    switch (role) {
      case "user":
        return new HumanChatMessage(text);
      case "assistant":
        return new AIChatMessage(text);
      case "system":
        return new SystemChatMessage(text);
      default:
        return new ChatMessage(text, role ?? "unknown");
    }
}