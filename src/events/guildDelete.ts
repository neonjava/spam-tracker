import { Events, Guild } from 'discord.js';
import { PresenceService } from '../services/presenceService';
import { GuildConfigService } from '../services/guildConfigService';
import { LoggingService } from '../services/loggingService';

export const name = Events.GuildDelete;
export const once = false;

export async function execute(guild: Guild): Promise<void> {
  try {
    LoggingService.logInfo('GuildDeleteEvent', `Removed from guild: ${guild.name} (${guild.id})`);
    PresenceService.updatePresence(guild.client);
    await GuildConfigService.deleteConfig(guild.id);
  } catch (error: any) {
    LoggingService.logError('GuildDeleteEvent', `Error handling guild leave for ${guild.id}`, error);
  }
}
