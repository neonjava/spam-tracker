import { Events, Message } from 'discord.js';
import { MessageTracker } from '../services/messageTracker';
import { ProtectionService } from '../services/protectionService';
import { GuildConfigService } from '../services/guildConfigService';
import { LoggingService } from '../services/loggingService';

export const name = Events.MessageCreate;
export const once = false;

export function createHandler(messageTracker: MessageTracker, protectionService: ProtectionService) {
  return async (message: Message): Promise<void> => {
    try {
      if (!message.guild || message.author.bot) return;

      messageTracker.track({
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: message.id,
        authorId: message.author.id,
        createdTimestamp: message.createdTimestamp
      });

      const protectedChannelId = await GuildConfigService.getProtectedChannelId(message.guild.id);
      
      if (protectedChannelId && message.channel.id === protectedChannelId) {
        await protectionService.handleProtectedChannelMessage(message);
      }
    } catch (error: any) {
      LoggingService.logError('MessageCreateEvent', `Error processing message ${message.id}`, error);
    }
  };
}
