import { Client, Events, GatewayIntentBits, Partials, type Message } from "discord.js";
import type { Config } from "./config.js";
import { chat } from "./gateway.js";
import { isAllowed } from "./permissions.js";
import { getSessionId } from "./sessions.js";

function isMentioned(message: Message, clientId: string): boolean {
  return message.mentions.users.has(clientId);
}

function stripMention(content: string, clientId: string): string {
  return content
    .replace(new RegExp(`<@!?${clientId}>`, "g"), "")
    .trim();
}

export function createBot(config: Config): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once(Events.ClientReady, (ready) => {
    console.log(`[bot] Logged in as ${ready.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const isDM = !message.guild;
    const clientId = client.user?.id;

    if (!clientId) return;

    if (!isDM && !isMentioned(message, clientId)) return;

    if (!isAllowed(message, config)) return;

    const rawContent = isDM ? message.content : stripMention(message.content, clientId);

    if (!rawContent) return;

    const sessionId = getSessionId(message.channelId);

    try {
      await message.channel.sendTyping();
      const reply = await chat(config.cypherclawToken, rawContent, sessionId);
      await message.reply(reply);
    } catch (err) {
      console.error("[bot] Error handling message:", err instanceof Error ? err.message : err);
      await message.reply("Something went wrong reaching the CypherClaw agent.").catch(() => {});
    }
  });

  return client;
}
