import { Events, Client } from 'discord.js';
import { PresenceService } from '../services/presenceService';
import { LoggingService } from '../services/loggingService';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>): void {
  LoggingService.logInfo('ReadyEvent', `Bot is online as ${client.user.tag}`);
  PresenceService.startPresenceInterval(client);
  LoggingService.logInfo('ReadyEvent', `Serving ${client.guilds.cache.size} guilds`);
}
