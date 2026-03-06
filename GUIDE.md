# CypherClaw Discord Connector — Agent Setup Guide

This guide is written for the CypherClaw agent to follow autonomously. Execute each step in order. Do not skip steps. If any step fails, stop and report the error.

---

## What this does

Installs and starts a Discord bot that forwards messages to you (the CypherClaw agent). Users can @mention the bot in allowed channels or DM it directly.

---

## Step 1 — Gather required information from the user

Before running any commands, you must collect:

| Item | How to get it |
|---|---|
| **Discord bot token** | Ask the user. They get it from: https://discord.com/developers/applications → their app → "Bot" → "Reset Token". |
| **Owner Discord user ID(s)** | Ask the user for their Discord user ID(s). In Discord: Settings → Advanced → enable Developer Mode, then right-click their username → "Copy User ID". Multiple IDs are comma-separated. Use `000000000000` to allow anyone. |
| **Guild IDs** *(optional)* | Ask the user if they want to restrict the bot to specific servers. Right-click the server icon → "Copy Server ID" (requires Developer Mode). |
| **Channel IDs** *(optional)* | Ask the user if they want to restrict the bot to specific channels. Right-click the channel → "Copy Channel ID" (requires Developer Mode). |

Do not proceed without the bot token and at least one owner ID.

**Discord bot setup note:** In the [Discord Developer Portal](https://discord.com/developers/applications), under Bot → Privileged Gateway Intents, the **Message Content Intent** must be enabled or the bot will receive messages with empty content.

---

## Step 2 — Check prerequisites

Run these checks. If any fail, report them to the user and stop.

**Node.js version (must be >= 20):**
```bash
node --version
```
Expected: `v20.x.x` or higher.

**Git is available:**
```bash
git --version
```

**CypherClaw daemon is running:**
```bash
curl -s http://127.0.0.1:59152/
```
Expected response: `{"status":"ok","pid":<number>}`. If this fails, the daemon is not running — tell the user to start it first.

---

## Step 3 — Create a CypherClaw channel token

Run this command to generate a bearer token for the connector:

```bash
cypherclaw token create discord
```

**Copy the printed token immediately.** It is only shown once. This is your `--cypherclaw-token` value.

---

## Step 4 — Clone and install

Replace `<repo-url>` with the actual repository URL:

```bash
git clone <repo-url> cypherclaw-discord-connector
cd cypherclaw-discord-connector
npm install
```

---

## Step 5 — Run setup

Construct the setup command using the information from Step 1 and the token from Step 3.

**Minimum (required flags only):**
```bash
npm run setup -- \
  --bot-token <discord_bot_token> \
  --cypherclaw-token <cypherclaw_token> \
  --owners <owner_id>
```

**With optional guild and channel restrictions:**
```bash
npm run setup -- \
  --bot-token <discord_bot_token> \
  --cypherclaw-token <cypherclaw_token> \
  --owners <owner_id1,owner_id2> \
  --guilds <guild_id1,guild_id2> \
  --channels <channel_id1,channel_id2>
```

**Allow anyone to use the bot:**
```bash
npm run setup -- \
  --bot-token <discord_bot_token> \
  --cypherclaw-token <cypherclaw_token> \
  --owners 000000000000
```

Expected output: `[setup] Created .env` followed by `[setup] Done. Run: npm start`

If setup exits with an error, a required flag is missing — recheck the command.

---

## Step 6 — Start the connector

**As a daemon (recommended):**
```bash
npm run start:daemon
```

Expected output: `[daemon] Started (pid <number>). Logs: /tmp/cypherclaw-discord.log`

The connector runs in the background and survives the current terminal session. Logs are written to `/tmp/cypherclaw-discord.log`.

**Foreground (for debugging):**
```bash
npm start
```

Expected output (in order):
1. `[cypherclaw-discord] Registered with CypherClaw gateway.`
2. `[bot] Logged in as <BotName>#<discriminator>`

If the gateway registration fails with a 401 error, the `--cypherclaw-token` is invalid — re-run Step 3 and Step 5.

If the bot login fails, the `--bot-token` is invalid — ask the user to regenerate it from the Discord Developer Portal.

---

## Managing the connector

### Daemon control

| Command | Description |
|---|---|
| `npm run start:daemon` | Start in background |
| `npm run stop` | Stop the daemon |
| `npm run status` | Check if running |
| `npm run logs` | Tail live logs |

### Managing owners, guilds, and channels

Add or remove IDs without re-running setup. Changes take effect on the next start.

```bash
npm run manage -- add owner <id1,id2>
npm run manage -- remove owner <id>
npm run manage -- add guild <id1,id2>
npm run manage -- remove guild <id>
npm run manage -- add channel <id1,id2>
npm run manage -- remove channel <id>
npm run manage -- list
```

### Reconfiguring from scratch

Re-run Step 5 with new flags — it overwrites the existing `.env`.

To revoke the CypherClaw token:
```bash
cypherclaw token revoke discord
```

---

## Bot behavior (for your reference)

- **Guild channels**: responds only when @mentioned. Only allowed owners trigger a response.
- **DMs**: responds to any message, but only from allowed owners.
- **Filtering**: if guilds were configured, the bot ignores messages from other guilds. If channels were also configured, only those channels within those guilds are active.
- **Sessions**: each Discord channel gets its own conversation session (`discord-<channelId>-<uuid>`), scoped to the current connector run.

---

## Viewing this guide

```bash
npm run guide
```
