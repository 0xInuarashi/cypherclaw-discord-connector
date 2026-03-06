import { config } from "dotenv";

config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(
      `[config] Missing required environment variable: ${key}. Run "npm run setup" first.`,
    );
    process.exit(1);
  }
  return value;
}

function optionalList(key: string): string[] {
  const value = process.env[key];
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export type Config = {
  botToken: string;
  cypherclawToken: string;
  ownerIds: string[];
  allowAnyone: boolean;
  guildIds: string[];
  channelIds: string[];
};

export function loadConfig(): Config {
  const botToken = requireEnv("DISCORD_BOT_TOKEN");
  const cypherclawToken = requireEnv("CYPHERCLAW_TOKEN");

  const ownerRaw = requireEnv("DISCORD_OWNER_IDS");
  const ownerIds = ownerRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ownerIds.length === 0) {
    console.error("[config] DISCORD_OWNER_IDS must contain at least one value.");
    process.exit(1);
  }

  const allowAnyone = ownerIds.includes("000000000000");

  const guildIds = optionalList("DISCORD_GUILD_IDS");
  const channelIds = optionalList("DISCORD_CHANNEL_IDS");

  return { botToken, cypherclawToken, ownerIds, allowAnyone, guildIds, channelIds };
}
