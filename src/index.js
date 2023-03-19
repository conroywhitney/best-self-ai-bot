import * as dotenv from 'dotenv';
import { ChannelType, Client, Events, GatewayIntentBits, Partials } from 'discord.js'

import { getGPTResponse } from './gpt.js';

dotenv.config();

const client = new Client({
	intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions
	],
    partials: [Partials.Channel],
});

client.on(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on(Events.MessageReactionAdd, async (reaction) => {
  console.log("reaction", reaction);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if the message is a DM
  if (message.channel.type == ChannelType.DM) {
    // Start the "typing" indicator
    message.channel.sendTyping();

    try {
      // Relay the message to GPT and get the response
      const { response } = await getGPTResponse(message.content);

      console.log(response)
      message.channel.send(response);
    } catch (error) {
      console.error(error);
      message.channel.send("Sorry, an error occurred.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
