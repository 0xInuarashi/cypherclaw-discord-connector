import { loadConfig } from "./config.js";
import { healthCheck, registerConnector } from "./gateway.js";
import { createBot } from "./bot.js";

const config = loadConfig();

const alive = await healthCheck();
if (!alive) {
  console.error(
    "[cypherclaw-discord] CypherClaw gateway is not reachable at http://127.0.0.1:59152. Is the daemon running?",
  );
  process.exit(1);
}

await registerConnector(config.cypherclawToken);
console.log("[cypherclaw-discord] Registered with CypherClaw gateway.");

const bot = createBot(config);
await bot.login(config.botToken);
