import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";

const PID_FILE = path.join(os.tmpdir(), "cypherclaw-discord.pid");
const LOG_FILE = path.join(os.tmpdir(), "cypherclaw-discord.log");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function writePid(pid: number): Promise<void> {
  await fs.writeFile(PID_FILE, String(pid), "utf-8");
}

async function readPid(): Promise<number | null> {
  try {
    const content = await fs.readFile(PID_FILE, "utf-8");
    const pid = parseInt(content.trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

async function clearPid(): Promise<void> {
  try {
    await fs.unlink(PID_FILE);
  } catch {}
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const cmd = process.argv[2];

if (cmd === "start") {
  const existingPid = await readPid();
  if (existingPid && isRunning(existingPid)) {
    console.log(`[daemon] Already running (pid ${existingPid}). Use "npm run stop" first.`);
    process.exit(1);
  }

  const envPath = path.resolve(__dirname, "../.env");
  const envRaw = await fs.readFile(envPath, "utf-8").catch(() => "");
  const connectorEnv: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    TMPDIR: process.env.TMPDIR ?? "",
    ...parseEnv(envRaw),
  };

  const logFd = await fs.open(LOG_FILE, "a");
  const child = spawn(process.execPath, ["--import", "tsx/esm", path.join(__dirname, "index.ts")], {
    detached: true,
    stdio: ["ignore", logFd.fd, logFd.fd],
    env: connectorEnv,
    cwd: path.resolve(__dirname, ".."),
  });

  child.unref();
  await logFd.close();
  await writePid(child.pid!);

  console.log(`[daemon] Started (pid ${child.pid}). Logs: ${LOG_FILE}`);
  console.log(`[daemon] Stop with: npm run stop`);

} else if (cmd === "stop") {
  const pid = await readPid();
  if (!pid || !isRunning(pid)) {
    console.log("[daemon] Not running.");
    await clearPid();
    process.exit(0);
  }
  process.kill(pid, "SIGTERM");
  await clearPid();
  console.log(`[daemon] Stopped (pid ${pid}).`);

} else if (cmd === "status") {
  const pid = await readPid();
  if (!pid || !isRunning(pid)) {
    console.log("[daemon] Not running.");
  } else {
    console.log(`[daemon] Running (pid ${pid}). Logs: ${LOG_FILE}`);
  }

} else if (cmd === "logs") {
  const { execSync } = await import("node:child_process");
  try {
    execSync(`tail -n 100 -f ${LOG_FILE}`, { stdio: "inherit" });
  } catch {}

} else {
  console.log("Usage: npm run <start:daemon|stop|status|logs>");
  process.exit(1);
}
