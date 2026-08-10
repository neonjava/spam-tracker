import { Guild, GuildMember, TextChannel, PermissionFlagsBits } from 'discord.js';
import { MessageTracker } from './messageTracker';
import { LoggingService } from './loggingService';
import { BATCH_DELETE_DELAY_MS } from '../utils/constants';
import { canModerate } from '../utils/permissions';

export class ModerationService {
  private messageTracker: MessageTracker;
  private processingLocks: Map<string, boolean>;

  constructor(messageTracker: MessageTracker) {
    this.messageTracker = messageTracker;
    this.processingLocks = new Map<string, boolean>();
  }

  public isProcessing(guildId: string, userId: string): boolean {
    return this.processingLocks.get(`${guildId}:${userId}`) === true;
  }

  public startProcessing(guildId: string, userId: string): boolean {
    const key = `${guildId}:${userId}`;
    if (this.processingLocks.get(key)) {
      return false;
    }
    this.processingLocks.set(key, true);
    return true;
  }

  public stopProcessing(guildId: string, userId: string): void {
    this.processingLocks.delete(`${guildId}:${userId}`);
  }

  public async timeoutMember(member: GuildMember, durationMs: number, reason: string): Promise<boolean> {
    try {
      const botMember = member.guild.members.me;
      if (!botMember) {
        LoggingService.logWarning(`Cannot timeout: bot member not found in guild ${member.guild.id}`);
        return false;
      }

      const eligibility = canModerate(member.guild, botMember, member);
      if (!eligibility.canModerate) {
        LoggingService.logWarning(`Cannot timeout member ${member.user.tag} in ${member.guild.id}: ${eligibility.reason}`);
        return false;
      }

      await member.timeout(durationMs, reason);
      LoggingService.logInfo(`Timed out member ${member.user.tag} in guild ${member.guild.id} for ${durationMs}ms`);
      return true;
    } catch (error) {
      LoggingService.logError(`Failed to timeout member ${member.user.tag} in guild ${member.guild.id}`, error as Error);
      return false;
    }
  }

  public async deleteRecentMessages(guild: Guild, userId: string, excludeChannelId?: string): Promise<number> {
    let deletedCount = 0;
    const trackedMessages = this.messageTracker.getUserMessages(guild.id, userId);
    
    // Group by channelId
    const messagesByChannel = new Map<string, typeof trackedMessages>();
    for (const msg of trackedMessages) {
      if (!messagesByChannel.has(msg.channelId)) {
        messagesByChannel.set(msg.channelId, []);
      }
      messagesByChannel.get(msg.channelId)!.push(msg);
    }

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    const botMember = guild.members.me;
    if (!botMember) return 0;

    for (const [channelId, messages] of messagesByChannel.entries()) {
      if (channelId === excludeChannelId) continue;

      try {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased() || !('messages' in channel)) continue;

        const perms = (channel as TextChannel).permissionsFor(botMember);
        if (!perms || !perms.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages])) {
          continue;
        }

        for (const msg of messages) {
          try {
            const fetchedMsg = await channel.messages.fetch(msg.messageId).catch(() => null);
            if (fetchedMsg && fetchedMsg.author.id === userId) {
              await fetchedMsg.delete();
              deletedCount++;
              this.messageTracker.removeMessage(guild.id, msg.messageId);
              await delay(BATCH_DELETE_DELAY_MS);
            }
          } catch (err) {
            // Ignore individual delete errors
          }
        }
      } catch (err) {
        // Ignore channel processing errors
      }
    }

    return deletedCount;
  }
}
