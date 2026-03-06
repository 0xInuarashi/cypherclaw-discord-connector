#!/usr/bin/env node
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";

const program = new Command();

program
  .name("setup")
  .description("Generate the .env config file for cypherclaw-discord-connector")
  .requiredOption("--bot-token <token>", "Discord bot token")
  .requiredOption("--cypherclaw-token <token>", "CypherClaw channel bearer token")
  .requiredOption(
    "--owners <ids>",
    'Comma-separated Discord user IDs. Use "000000000000" to allow anyone.',
  )
  .option("--guilds <ids>", "Comma-separated guild IDs to whitelist (optional)")
  .option("--channels <ids>", "Comma-separated channel IDs to whitelist (optional)")
  .parse(process.argv);

const opts = program.opts<{
  botToken: string;
  cypherclawToken: string;
  owners: string;
  guilds?: string;
  channels?: string;
}>();

const owners = opts.owners
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (owners.length === 0) {
  console.error(
    '[setup] Error: --owners must contain at least one Discord user ID or "000000000000" to allow anyone.',
  );
  process.exit(1);
}

const lines: string[] = [
  `DISCORD_BOT_TOKEN=${opts.botToken}`,
  `CYPHERCLAW_TOKEN=${opts.cypherclawToken}`,
  `DISCORD_OWNER_IDS=${owners.join(",")}`,
];

if (opts.guilds) {
  lines.push(`DISCORD_GUILD_IDS=${opts.guilds}`);
}

if (opts.channels) {
  lines.push(`DISCORD_CHANNEL_IDS=${opts.channels}`);
}

const envPath = resolve(process.cwd(), ".env");
const existed = existsSync(envPath);

writeFileSync(envPath, lines.join("\n") + "\n", "utf8");

console.log(`[setup] ${existed ? "Overwrote" : "Created"} ${envPath}`);
console.log("[setup] Done. Run: npm start");
