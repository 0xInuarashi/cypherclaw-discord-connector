import { AttachmentBuilder, Client, Events, GatewayIntentBits, Partials, type Message } from "discord.js";
import type { Config } from "./config.js";
import { chat } from "./gateway.js";
import { isAllowed } from "./permissions.js";
import { getSessionId } from "./sessions.js";

const CHUNK_SIZE = 1800;
const FILE_THRESHOLD = 20_000;

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > CHUNK_SIZE) {
    let cut = remaining.lastIndexOf(" ", CHUNK_SIZE);
    if (cut <= 0) cut = CHUNK_SIZE;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

async function sendReply(message: Message, reply: string): Promise<void> {
  if (reply.length > FILE_THRESHOLD) {
    const attachment = new AttachmentBuilder(Buffer.from(reply, "utf-8"), { name: "reply.txt" });
    await message.reply({ files: [attachment] });
    return;
  }

  if (reply.length <= CHUNK_SIZE) {
    await message.reply(reply);
    return;
  }

  const chunks = splitIntoChunks(reply);
  let previous: Message = await message.reply(chunks[0]);
  for (let i = 1; i < chunks.length; i++) {
    previous = await previous.reply(chunks[i]);
  }
}

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
    console.log(`[bot:debug] messageCreate from=${message.author.id} bot=${message.author.bot} isDM=${!message.guild} content="${message.content}"`);

    if (message.author.bot) return;

    const isDM = !message.guild;
    const clientId = client.user?.id;

    if (!clientId) return;

    if (!isDM && !isMentioned(message, clientId)) {
      console.log(`[bot:debug] ignored — not mentioned`);
      return;
    }

    if (!isAllowed(message, config)) {
      console.log(`[bot:debug] ignored — not allowed (owner/guild/channel check failed)`);
      return;
    }

    const rawContent = isDM ? message.content : stripMention(message.content, clientId);

    if (!rawContent) {
      console.log(`[bot:debug] ignored — empty content after strip`);
      return;
    }

    const sessionId = getSessionId(message.channelId);

    try {
      await message.channel.sendTyping();
      const typingInterval = setInterval(() => message.channel.sendTyping(), 8000);
      let reply: string;
      try {
        reply = await chat(config.cypherclawToken, rawContent, sessionId);
      } finally {
        clearInterval(typingInterval);
      }
      await sendReply(message, reply);
    } catch (err) {
      console.error("[bot] Error handling message:", err instanceof Error ? err.message : err);
      await message.reply("Something went wrong reaching the CypherClaw agent.").catch(() => {});
    }
  });

  return client;
}
