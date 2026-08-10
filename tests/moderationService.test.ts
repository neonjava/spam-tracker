import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModerationService } from '../src/services/moderationService';
import { MessageTracker } from '../src/services/messageTracker';

vi.mock('../src/services/messageTracker');

describe('ModerationService', () => {
  let moderationService: ModerationService;
  let messageTracker: MessageTracker;

  beforeEach(() => {
    messageTracker = new MessageTracker();
    moderationService = new ModerationService(messageTracker);
  });

  it('should not be processing initially', () => {
    expect(moderationService.isProcessing('g1', 'u1')).toBe(false);
  });

  it('should acquire processing lock', () => {
    expect(moderationService.startProcessing('g1', 'u1')).toBe(true);
    expect(moderationService.isProcessing('g1', 'u1')).toBe(true);
  });

  it('should prevent duplicate processing', () => {
    expect(moderationService.startProcessing('g1', 'u1')).toBe(true);
    expect(moderationService.startProcessing('g1', 'u1')).toBe(false);
  });

  it('should allow processing different users', () => {
    expect(moderationService.startProcessing('g1', 'u1')).toBe(true);
    expect(moderationService.startProcessing('g1', 'u2')).toBe(true);
  });

  it('should release processing lock', () => {
    moderationService.startProcessing('g1', 'u1');
    moderationService.stopProcessing('g1', 'u1');
    expect(moderationService.isProcessing('g1', 'u1')).toBe(false);
    expect(moderationService.startProcessing('g1', 'u1')).toBe(true);
  });

  it('should isolate locks by guild', () => {
    expect(moderationService.startProcessing('g1', 'u1')).toBe(true);
    expect(moderationService.startProcessing('g2', 'u1')).toBe(true);
  });
});
