import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env");

function loadEnvFile(): Record<string, string> {
  try {
    return parseEnv(readFileSync(ENV_PATH, "utf-8"));
  } catch {
    console.error(`[config] Could not read ${ENV_PATH}. Run "npm run setup" first.`);
    process.exit(1);
  }
}

function require(env: Record<string, string>, key: string): string {
  const value = env[key];
  if (!value) {
    console.error(`[config] Missing required config: ${key}. Run "npm run setup" first.`);
    process.exit(1);
  }
  return value;
}

function optionalList(env: Record<string, string>, key: string): string[] {
  const value = env[key];
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
  const env = loadEnvFile();

  const botToken = require(env, "DISCORD_BOT_TOKEN");
  const cypherclawToken = require(env, "CYPHERCLAW_TOKEN");

  const ownerRaw = require(env, "DISCORD_OWNER_IDS");
  const ownerIds = ownerRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ownerIds.length === 0) {
    console.error("[config] DISCORD_OWNER_IDS must contain at least one value.");
    process.exit(1);
  }

  const allowAnyone = ownerIds.includes("000000000000");

  const guildIds = optionalList(env, "DISCORD_GUILD_IDS");
  const channelIds = optionalList(env, "DISCORD_CHANNEL_IDS");

  return { botToken, cypherclawToken, ownerIds, allowAnyone, guildIds, channelIds };
}
