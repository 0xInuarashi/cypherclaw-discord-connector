const GATEWAY = "http://127.0.0.1:59152";

function headers(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function registerConnector(token: string): Promise<void> {
  const res = await fetch(`${GATEWAY}/channels/register`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ name: "discord", pid: process.pid }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway register failed ${res.status}: ${text}`);
  }
}

export async function chat(token: string, message: string, sessionId: string): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ message, sessionId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gateway chat failed ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { reply: string };
  return data.reply;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY}/`);
    return res.ok;
  } catch {
    return false;
  }
}
