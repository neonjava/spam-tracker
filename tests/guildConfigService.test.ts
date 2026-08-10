import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuildConfigService } from '../src/services/guildConfigService';
import { prisma } from '../src/database/prisma';

vi.mock('../src/database/prisma', () => ({
  prisma: {
    guildConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn()
    }
  }
}));

describe('GuildConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null for non-existent guild', async () => {
    vi.mocked(prisma.guildConfig.findUnique).mockResolvedValue(null as any);
    const result = await GuildConfigService.getConfig('g1');
    expect(result).toBeNull();
  });

  it('should return config for existing guild', async () => {
    const mockConfig = { guildId: 'g1', protectedChannelId: 'c1' } as any;
    vi.mocked(prisma.guildConfig.findUnique).mockResolvedValue(mockConfig);
    
    const result = await GuildConfigService.getConfig('g1');
    expect(result).toEqual(mockConfig);
  });

  it('should upsert config', async () => {
    const mockConfig = { guildId: 'g1', protectedChannelId: 'c1' } as any;
    vi.mocked(prisma.guildConfig.upsert).mockResolvedValue(mockConfig);
    
    const result = await GuildConfigService.upsertConfig('g1', { protectedChannelId: 'c1' });
    expect(result).toEqual(mockConfig);
    expect(prisma.guildConfig.upsert).toHaveBeenCalledWith({
      where: { guildId: 'g1' },
      update: { protectedChannelId: 'c1' },
      create: { guildId: 'g1', protectedChannelId: 'c1' }
    });
  });

  it('should delete config', async () => {
    await GuildConfigService.deleteConfig('g1');
    expect(prisma.guildConfig.delete).toHaveBeenCalledWith({
      where: { guildId: 'g1' }
    });
  });

  it('should return protectedChannelId', async () => {
    const mockConfig = { guildId: 'g1', protectedChannelId: 'c1' } as any;
    vi.mocked(prisma.guildConfig.findUnique).mockResolvedValue(mockConfig);
    
    const result = await GuildConfigService.getProtectedChannelId('g1');
    expect(result).toBe('c1');
  });

  it('should return null protectedChannelId when not configured', async () => {
    vi.mocked(prisma.guildConfig.findUnique).mockResolvedValue(null as any);
    
    const result = await GuildConfigService.getProtectedChannelId('g1');
    expect(result).toBeNull();
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(prisma.guildConfig.findUnique).mockRejectedValue(new Error('DB Error'));
    
    const result = await GuildConfigService.getConfig('g1');
    expect(result).toBeNull();
  });
});
