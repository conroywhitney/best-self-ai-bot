import * as dotenv from 'dotenv';
import { ChannelType, Client, Events, GatewayIntentBits, Partials } from 'discord.js'

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

    // Relay the message to GPT and get the response
    const gptResponse = await getGPTResponse(message.content);

    console.log(gptResponse)

    // simulate a delay
    setTimeout(() => {
        // Send the GPT response back to the user in a DM
        message.channel.send(gptResponse);
    }, 5000);
  }
});

client.login(process.env.DISCORD_TOKEN);

async function getGPTResponse(input) {
  // Replace this with the code to call the GPT API and get the response
  const response = `GPT response to: ${input}`;
  return response;
}
