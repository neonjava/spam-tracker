import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProtectionService } from '../src/services/protectionService';
import { ModerationService } from '../src/services/moderationService';
import { MessageTracker } from '../src/services/messageTracker';
import { TIMEOUT_DURATION_MS } from '../src/utils/constants';
import type { Message, GuildMember, Guild, User } from 'discord.js';

vi.mock('../src/services/moderationService');
vi.mock('../src/services/messageTracker');

describe('ProtectionService', () => {
  let protectionService: ProtectionService;
  let moderationService: vi.Mocked<ModerationService>;
  let messageTracker: vi.Mocked<MessageTracker>;
  let mockMessage: any;

  beforeEach(() => {
    messageTracker = new MessageTracker() as any;
    moderationService = new ModerationService(messageTracker) as any;
    protectionService = new ProtectionService(messageTracker, moderationService);

    const mockMember = { id: 'u1' } as GuildMember;

    mockMessage = {
      author: { id: 'u1', bot: false, tag: 'User#1234' },
      guild: {
        id: 'g1',
        name: 'Test Guild',
        members: {
          fetch: vi.fn().mockResolvedValue(mockMember)
        }
      },
      channel: { id: 'c1', name: 'protected-channel' },
      member: mockMember,
      deletable: true,
      createdTimestamp: Date.now(),
      delete: vi.fn().mockResolvedValue(true)
    };

    moderationService.startProcessing.mockReturnValue(true);
    moderationService.timeoutMember.mockResolvedValue(true);
    moderationService.deleteRecentMessages.mockResolvedValue(0);
  });

  it('should delete bot messages without timeout', async () => {
    mockMessage.author.bot = true;
    
    await protectionService.handleProtectedChannelMessage(mockMessage as Message);
    
    expect(mockMessage.delete).toHaveBeenCalled();
    expect(moderationService.timeoutMember).not.toHaveBeenCalled();
  });

  it('should timeout human users', async () => {
    await protectionService.handleProtectedChannelMessage(mockMessage as Message);
    
    expect(mockMessage.delete).toHaveBeenCalled();
    expect(moderationService.timeoutMember).toHaveBeenCalledWith(mockMessage.member, TIMEOUT_DURATION_MS, expect.any(String));
  });

  it('should delete recent messages after trigger', async () => {
    await protectionService.handleProtectedChannelMessage(mockMessage as Message);
    
    expect(moderationService.deleteRecentMessages).toHaveBeenCalledWith(mockMessage.guild, 'u1', 'c1');
  });

  it('should skip if already processing', async () => {
    moderationService.startProcessing.mockReturnValue(false);
    
    await protectionService.handleProtectedChannelMessage(mockMessage as Message);
    
    expect(mockMessage.delete).toHaveBeenCalled();
    expect(moderationService.timeoutMember).not.toHaveBeenCalled();
  });

  it('should release lock after processing', async () => {
    await protectionService.handleProtectedChannelMessage(mockMessage as Message);
    
    expect(moderationService.stopProcessing).toHaveBeenCalledWith('g1', 'u1');
  });

  it('should release lock even if timeout fails', async () => {
    moderationService.timeoutMember.mockRejectedValue(new Error('Discord error'));
    
    try {
        await protectionService.handleProtectedChannelMessage(mockMessage as Message);
    } catch(e) {}
    
    expect(moderationService.stopProcessing).toHaveBeenCalledWith('g1', 'u1');
  });

  it('should handle message deletion failure gracefully', async () => {
    mockMessage.delete.mockRejectedValue(new Error('Failed'));
    
    await expect(protectionService.handleProtectedChannelMessage(mockMessage as Message)).resolves.not.toThrow();
    expect(moderationService.timeoutMember).toHaveBeenCalled();
  });

  it('should handle missing guild member gracefully', async () => {
    mockMessage.guild.members.fetch.mockRejectedValue(new Error('Member left'));
    
    await protectionService.handleProtectedChannelMessage(mockMessage as Message);
    
    expect(mockMessage.delete).toHaveBeenCalled();
    expect(moderationService.timeoutMember).not.toHaveBeenCalled();
  });
});
