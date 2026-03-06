#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Command } from "commander";

const ENV_PATH = resolve(process.cwd(), ".env");

type EnvKey = "DISCORD_OWNER_IDS" | "DISCORD_GUILD_IDS" | "DISCORD_CHANNEL_IDS";

const LABELS: Record<string, EnvKey> = {
  owner: "DISCORD_OWNER_IDS",
  guild: "DISCORD_GUILD_IDS",
  channel: "DISCORD_CHANNEL_IDS",
};

function readEnv(): Map<string, string> {
  if (!existsSync(ENV_PATH)) {
    console.error('[manage] No .env found. Run "npm run setup" first.');
    process.exit(1);
  }
  const map = new Map<string, string>();
  for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    map.set(trimmed.slice(0, idx), trimmed.slice(idx + 1));
  }
  return map;
}

function writeEnv(map: Map<string, string>): void {
  const lines = [...map.entries()].map(([k, v]) => `${k}=${v}`);
  writeFileSync(ENV_PATH, lines.join("\n") + "\n", "utf8");
}

function getList(map: Map<string, string>, key: EnvKey): string[] {
  const val = map.get(key) ?? "";
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function setList(map: Map<string, string>, key: EnvKey, list: string[]): void {
  if (list.length === 0) {
    map.delete(key);
  } else {
    map.set(key, list.join(","));
  }
}

function parseIds(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveTarget(name: string): EnvKey {
  const key = LABELS[name.toLowerCase()];
  if (!key) {
    console.error(`[manage] Unknown target "${name}". Use: owner, guild, channel`);
    process.exit(1);
  }
  return key;
}

const program = new Command();

program
  .name("manage")
  .description("Manage cypherclaw-discord-connector config without re-running setup");

program
  .command("add <target> <ids>")
  .description("Add one or more IDs to owners, guilds, or channels (comma-separated)")
  .action((target: string, ids: string) => {
    const key = resolveTarget(target);
    const map = readEnv();
    const current = getList(map, key);
    const toAdd = parseIds(ids).filter((id) => !current.includes(id));
    if (toAdd.length === 0) {
      console.log(`[manage] Nothing to add — all IDs already present in ${key}.`);
      return;
    }
    setList(map, key, [...current, ...toAdd]);
    writeEnv(map);
    console.log(`[manage] Added to ${key}: ${toAdd.join(", ")}`);
    console.log("[manage] Restart the connector for changes to take effect: npm start");
  });

program
  .command("remove <target> <ids>")
  .description("Remove one or more IDs from owners, guilds, or channels (comma-separated)")
  .action((target: string, ids: string) => {
    const key = resolveTarget(target);
    const map = readEnv();
    const current = getList(map, key);
    const toRemove = parseIds(ids);
    const updated = current.filter((id) => !toRemove.includes(id));
    if (updated.length === current.length) {
      console.log(`[manage] Nothing removed — none of those IDs found in ${key}.`);
      return;
    }
    if (key === "DISCORD_OWNER_IDS" && updated.length === 0) {
      console.error("[manage] Cannot remove all owners. At least one must remain.");
      process.exit(1);
    }
    setList(map, key, updated);
    writeEnv(map);
    const removed = current.filter((id) => toRemove.includes(id));
    console.log(`[manage] Removed from ${key}: ${removed.join(", ")}`);
    console.log("[manage] Restart the connector for changes to take effect: npm start");
  });

program
  .command("list [target]")
  .description("List current IDs for owners, guilds, or channels (omit target to list all)")
  .action((target?: string) => {
    const map = readEnv();
    const targets = target ? [resolveTarget(target)] : (Object.values(LABELS) as EnvKey[]);
    for (const key of targets) {
      const list = getList(map, key);
      console.log(`${key}: ${list.length ? list.join(", ") : "(none)"}`);
    }
  });

program.parse(process.argv);
