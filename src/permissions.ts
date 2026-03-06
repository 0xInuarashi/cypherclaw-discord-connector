import type { Message } from "discord.js";
import type { Config } from "./config.js";

export function isOwner(userId: string, config: Config): boolean {
  if (config.allowAnyone) return true;
  return config.ownerIds.includes(userId);
}

export function isAllowedGuild(guildId: string | null, config: Config): boolean {
  if (config.guildIds.length === 0) return true;
  if (!guildId) return false;
  return config.guildIds.includes(guildId);
}

export function isAllowedChannel(
  channelId: string,
  guildId: string | null,
  config: Config,
): boolean {
  if (!isAllowedGuild(guildId, config)) return false;

  if (config.channelIds.length === 0) return true;
  return config.channelIds.includes(channelId);
}

export function isAllowed(message: Message, config: Config): boolean {
  if (!isOwner(message.author.id, config)) return false;

  const isDM = !message.guild;

  if (isDM) return true;

  return isAllowedChannel(message.channelId, message.guildId, config);
}
