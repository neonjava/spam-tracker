import { Events, Guild, TextChannel, ChannelType, PermissionFlagsBits } from 'discord.js';
import { PresenceService } from '../services/presenceService';
import { createWelcomeEmbed } from '../utils/embeds';
import { LoggingService } from '../services/loggingService';

export const name = Events.GuildCreate;
export const once = false;

export async function execute(guild: Guild): Promise<void> {
  try {
    LoggingService.logInfo('GuildCreateEvent', `Joined new guild: ${guild.name} (${guild.id})`);
    PresenceService.updatePresence(guild.client);

    let targetChannel = guild.systemChannel;

    if (!targetChannel || !targetChannel.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages)) {
      targetChannel = guild.channels.cache.find(c => 
        c.type === ChannelType.GuildText && 
        c.permissionsFor(guild.members.me!)?.has(PermissionFlagsBits.SendMessages)
      ) as TextChannel | null;
    }

    if (targetChannel) {
      await targetChannel.send({ embeds: [createWelcomeEmbed()] });
    }
  } catch (error: any) {
    LoggingService.logError('GuildCreateEvent', `Error handling guild join for ${guild.id}`, error);
  }
}
