import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const SERVICE_NAME = "cypherclaw-discord";
const SYSTEMD_USER_DIR = path.join(os.homedir(), ".config", "systemd", "user");
const UNIT_FILE = path.join(SYSTEMD_USER_DIR, `${SERVICE_NAME}.service`);

const TSX_BIN = path.join(PROJECT_ROOT, "node_modules", ".bin", "tsx");
const NODE_BIN = process.execPath;
const ENTRY = path.join(PROJECT_ROOT, "src", "index.ts");

if (os.platform() !== "linux") {
  console.error(
    `[service] Unsupported OS: ${os.platform()}. Only Linux (systemd) is currently supported.`,
  );
  process.exit(1);
}

const cmd = process.argv[2];

function readEnvVars(): Record<string, string> {
  if (!existsSync(ENV_PATH)) {
    console.error('[service] No .env found. Run "npm run setup" first.');
    process.exit(1);
  }
  return parseEnv(readFileSync(ENV_PATH, "utf-8"));
}

function buildUnitFile(env: Record<string, string>): string {
  const envLines = Object.entries(env)
    .map(([k, v]) => `Environment="${k}=${v}"`)
    .join("\n");

  return `[Unit]
Description=CypherClaw Discord Connector
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${PROJECT_ROOT}
ExecStart=${NODE_BIN} ${TSX_BIN} ${ENTRY}
${envLines}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`;
}

if (cmd === "install") {
  const env = readEnvVars();

  mkdirSync(SYSTEMD_USER_DIR, { recursive: true });
  writeFileSync(UNIT_FILE, buildUnitFile(env), "utf-8");

  execSync("systemctl --user daemon-reload");
  execSync(`systemctl --user enable --now ${SERVICE_NAME}`);

  console.log(`[service] Installed and started ${SERVICE_NAME}.`);
  console.log(`[service] Check status: npm run service -- status`);
  console.log(`[service] View logs:    journalctl --user -u ${SERVICE_NAME} -f`);

} else if (cmd === "uninstall") {
  try {
    execSync(`systemctl --user disable --now ${SERVICE_NAME}`);
  } catch {}

  if (existsSync(UNIT_FILE)) {
    unlinkSync(UNIT_FILE);
    execSync("systemctl --user daemon-reload");
    console.log(`[service] Uninstalled ${SERVICE_NAME}.`);
  } else {
    console.log("[service] Service not installed.");
  }

} else if (cmd === "status") {
  try {
    execSync(`systemctl --user status ${SERVICE_NAME}`, { stdio: "inherit" });
  } catch {}

} else if (cmd === "logs") {
  try {
    execSync(`journalctl --user -u ${SERVICE_NAME} -f --no-pager`, { stdio: "inherit" });
  } catch {}

} else if (cmd === "restart") {
  execSync(`systemctl --user restart ${SERVICE_NAME}`);
  console.log(`[service] Restarted ${SERVICE_NAME}.`);

} else {
  console.log("Usage: npm run service -- <install|uninstall|status|logs|restart>");
  process.exit(1);
}
