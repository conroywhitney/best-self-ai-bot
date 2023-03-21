import * as dotenv from 'dotenv';
import { ChannelType, Client, Events, GatewayIntentBits, Partials } from 'discord.js'

import { getGPTResponse } from './gpt.js';

dotenv.config();

let botId = null;

const client = new Client({
	intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions
	],
  partials: [Partials.Channel],
});

const preloadMessages = async (channel) => {
  const messageHistory = await channel.messages.fetch({ limit: 100 });
  const messages = messageHistory.filter((message) => {
    const { content } = message;

    return !(
      content == "Sorry, an error occurred." ||
      content == "pong" ||
      content.startsWith("GPT response to:") ||
      content.startsWith("I received the following prompt:") ||
      content.startsWith("Yes, here is everything I received as part of this message:") ||
      content.startsWith("I'm glad the formatting is working well for the most part")
    )
  }).map((message) => {
    const { author, content } = message;

    return {
      content,
      role: author.id == botId ? "assistant" : "user"
    }
  })

  return messages;
}

client.on(Events.ClientReady, () => {
  botId = client.user.id;
  console.log(`Logged in as ${client.user.tag}! (${botId})`);
});

client.on(Events.MessageReactionAdd, async (reaction) => {
  console.log("reaction", reaction);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if the message is a DM
  if (message.channel.type == ChannelType.DM) {
    const messages = await preloadMessages(message.channel);

    // Start the "typing" indicator
    message.channel.sendTyping();

    try {
      // Relay the message to GPT and get the response
      const response = await getGPTResponse({
        docsLength: 12,
        historyLength: 24,
        input: message.content,
        messages,
      });

      message.channel.send(response);
    } catch (error) {
      console.error(error);
      message.channel.send("Sorry, an error occurred.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
