import { Message } from 'discord.js';
import { ModerationService } from './moderationService';
import { MessageTracker } from './messageTracker';
import { LoggingService } from './loggingService';
import { TIMEOUT_DURATION_MS } from '../utils/constants';

export class ProtectionService {
  private moderationService: ModerationService;
  private messageTracker: MessageTracker;

  constructor(messageTracker: MessageTracker, moderationService: ModerationService) {
    this.messageTracker = messageTracker;
    this.moderationService = moderationService;
  }

  public async handleProtectedChannelMessage(message: Message): Promise<void> {
    // 1. Immediately try to delete the triggering message
    try {
      if (message.deletable) {
        await message.delete();
      }
    } catch (error) {
      // Ignore if message already deleted or missing permissions
    }

    // 2. If message.author.bot: just delete and return
    if (message.author.bot) {
      LoggingService.logInfo(`Deleted bot message in protected channel from ${message.author.tag}`);
      return;
    }

    // 3. Get the guild member
    const guild = message.guild;
    if (!guild) return;
    
    let member;
    try {
      member = await guild.members.fetch(message.author.id);
    } catch (err) {
      LoggingService.logInfo(`User ${message.author.tag} left before they could be processed`);
      return;
    }

    if (!member) return;
    
    const userId = member.id;
    const guildId = guild.id;

    // 4. Check if already processing
    if (this.moderationService.isProcessing(guildId, userId)) {
      return;
    }

    // 5. Try to acquire lock
    if (!this.moderationService.startProcessing(guildId, userId)) {
      return;
    }

    // 6. Try/finally block
    try {
      // a. Attempt timeout
      const timedOut = await this.moderationService.timeoutMember(
        member, 
        TIMEOUT_DURATION_MS, 
        'Sent message in protected anti-spam channel'
      );

      // b. Delete recent messages
      const deletedCount = await this.moderationService.deleteRecentMessages(
        guild, 
        userId, 
        message.channel.id
      );

      // c. Log the action
      LoggingService.logProtection({
        guildId,
        guildName: guild.name,
        userId,
        userTag: message.author.tag,
        action: timedOut ? 'timeout' : 'delete_only',
        deletedMessages: deletedCount
      });
      
    } finally {
      // 7. Release lock
      this.moderationService.stopProcessing(guildId, userId);
    }
  }
}
