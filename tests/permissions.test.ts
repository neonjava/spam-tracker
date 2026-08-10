import { describe, it, expect, vi } from 'vitest';
import { checkBotPermissions, canModerate } from '../src/utils/permissions';
import { PermissionFlagsBits } from 'discord.js';

describe('Permissions Utils', () => {
  describe('checkBotPermissions', () => {
    it('should return hasAll true when bot has all permissions', () => {
      const mockGuild: any = {
        members: {
          me: {
            permissions: {
              has: vi.fn().mockReturnValue(true)
            }
          }
        }
      };

      const result = checkBotPermissions(mockGuild);
      expect(result.hasAll).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return missing permissions when bot lacks some', () => {
      const mockGuild: any = {
        members: {
          me: {
            permissions: {
              has: vi.fn().mockImplementation((perm) => perm !== PermissionFlagsBits.ManageMessages)
            }
          }
        }
      };

      const result = checkBotPermissions(mockGuild);
      expect(result.hasAll).toBe(false);
      expect(result.missing).toContain('ManageMessages');
    });
  });

  describe('canModerate', () => {
    const createMockGuild = (ownerId: string) => ({ ownerId } as any);
    const createMockMember = (id: string, bot: boolean, position: number) => ({
      id,
      user: { id, bot },
      roles: { highest: { position } },
      permissions: {
        has: vi.fn().mockReturnValue(true)
      }
    } as any);

    it('canModerate should return false for guild owner', () => {
      const guild = createMockGuild('u1');
      const bot = createMockMember('bot1', true, 10);
      const target = createMockMember('u1', false, 1);

      const result = canModerate(guild, bot, target);
      expect(result.canModerate).toBe(false);
      expect(result.reason).toContain('owner');
    });

    it('canModerate should return false for bots', () => {
      const guild = createMockGuild('owner1');
      const bot = createMockMember('bot1', true, 10);
      const target = createMockMember('bot2', true, 1);

      const result = canModerate(guild, bot, target);
      expect(result.canModerate).toBe(false);
      expect(result.reason).toContain('bot');
    });

    it('canModerate should return false when target role is higher', () => {
      const guild = createMockGuild('owner1');
      const bot = createMockMember('bot1', true, 5);
      const target = createMockMember('u1', false, 10);

      const result = canModerate(guild, bot, target);
      expect(result.canModerate).toBe(false);
      expect(result.reason).toContain('role');
    });

    it('canModerate should return true for valid targets', () => {
      const guild = createMockGuild('owner1');
      const bot = createMockMember('bot1', true, 10);
      const target = createMockMember('u1', false, 5);

      const result = canModerate(guild, bot, target);
      expect(result.canModerate).toBe(true);
    });

    it('canModerate should return false for the bot itself', () => {
      const guild = createMockGuild('owner1');
      const bot = createMockMember('bot1', true, 10);
      
      const result = canModerate(guild, bot, bot);
      expect(result.canModerate).toBe(false);
      expect(result.reason).toContain('itself');
    });
  });
});
