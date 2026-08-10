import { prisma } from '../database/prisma';
import { LoggingService } from './loggingService';
import { GuildConfig } from '@prisma/client';

export class GuildConfigService {
  static async getConfig(guildId: string): Promise<GuildConfig | null> {
    try {
      return await prisma.guildConfig.findUnique({
        where: { guildId }
      });
    } catch (error) {
      LoggingService.logError(`Failed to fetch config for guild ${guildId}`, error as Error);
      return null;
    }
  }

  static async upsertConfig(
    guildId: string, 
    data: { 
      protectedChannelId?: string; 
      enabled?: boolean; 
      logChannelId?: string; 
      moderationEnabled?: boolean; 
      timeoutDuration?: number; 
      cleanupWindow?: number; 
    }
  ): Promise<GuildConfig> {
    try {
      return await prisma.guildConfig.upsert({
        where: { guildId },
        update: data,
        create: {
          guildId,
          ...data
        }
      });
    } catch (error) {
      LoggingService.logError(`Failed to upsert config for guild ${guildId}`, error as Error);
      throw error;
    }
  }

  static async deleteConfig(guildId: string): Promise<void> {
    try {
      await prisma.guildConfig.delete({
        where: { guildId }
      });
    } catch (error: any) {
      // Prisma throws P2025 if record not found
      if (error.code !== 'P2025') {
        LoggingService.logError(`Failed to delete config for guild ${guildId}`, error);
      }
    }
  }

  static async getProtectedChannelId(guildId: string): Promise<string | null> {
    try {
      const config = await prisma.guildConfig.findUnique({
        where: { guildId },
        select: { protectedChannelId: true }
      });
      return config?.protectedChannelId || null;
    } catch (error) {
      LoggingService.logError(`Failed to fetch protectedChannelId for guild ${guildId}`, error as Error);
      return null;
    }
  }
}
