import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createExecute, data } from '../src/commands/remove';
import { ModerationService } from '../src/services/moderationService';
import { MessageTracker } from '../src/services/messageTracker';

describe('RemoveCommand', () => {
  let messageTracker: MessageTracker;
  let moderationService: ModerationService;

  beforeEach(() => {
    messageTracker = new MessageTracker();
    moderationService = new ModerationService(messageTracker);
  });

  it('should define command data correctly', () => {
    expect(data.name).toBe('remove');
    expect(data.description).toContain('Purge a user');
  });

  it('should execute remove command and call deleteRecentMessages', async () => {
    const deleteRecentMessagesSpy = vi
      .spyOn(moderationService, 'deleteRecentMessages')
      .mockResolvedValue(5);

    const mockInteraction: any = {
      guild: { id: 'g1' },
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn().mockResolvedValue(undefined),
      options: {
        getUser: vi.fn().mockReturnValue({ id: 'u123', tag: 'Spammer#0001' }),
      },
    };

    const execute = createExecute(moderationService);
    await execute(mockInteraction);

    expect(mockInteraction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(deleteRecentMessagesSpy).toHaveBeenCalledWith({ id: 'g1' }, 'u123');
    expect(mockInteraction.editReply).toHaveBeenCalled();
  });
});
