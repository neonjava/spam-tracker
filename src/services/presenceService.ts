import { Client, ActivityType, PresenceUpdateStatus } from 'discord.js';
import { LoggingService } from './loggingService';

export class PresenceService {
  private static interval: NodeJS.Timeout | null = null;

  static updatePresence(client: Client): void {
    try {
      if (!client.user) return;

      const guildCount = client.guilds.cache.size;

      client.user.setPresence({
        status: PresenceUpdateStatus.Online,
        activities: [
          {
            name: `🛡️ /help | ${guildCount} server${guildCount === 1 ? '' : 's'}`,
            type: ActivityType.Watching,
          },
        ],
      });
    } catch (error) {
      LoggingService.logError('Failed to update presence', error as Error);
    }
  }

  static startPresenceInterval(client: Client, intervalMs = 30000): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.updatePresence(client);

    this.interval = setInterval(() => {
      this.updatePresence(client);
    }, intervalMs);
  }
}
