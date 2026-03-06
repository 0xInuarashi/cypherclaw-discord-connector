import { v4 as uuidv4 } from "uuid";

const sessionMap = new Map<string, string>();

export function getSessionId(channelId: string): string {
  let sessionId = sessionMap.get(channelId);
  if (!sessionId) {
    sessionId = `discord-${channelId}-${uuidv4()}`;
    sessionMap.set(channelId, sessionId);
  }
  return sessionId;
}
