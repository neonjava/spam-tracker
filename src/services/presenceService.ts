import { Client, ActivityType, PresenceUpdateStatus } from 'discord.js';
import { LoggingService } from './loggingService';

export class PresenceService {
  private static interval: NodeJS.Timeout | null = null;
  private static lastCount: number = -1;

  /**
   * Actively queries Discord for the live server count and updates presence
   */
  static async updatePresence(client: Client): Promise<void> {
    try {
      if (!client.user) return;

      // 1. Fetch live guilds from Discord REST API, fallback to cache
      let guildCount = client.guilds.cache.size;
      try {
        const fetchedGuilds = await client.guilds.fetch();
        guildCount = fetchedGuilds.size;
      } catch {
        guildCount = client.guilds.cache.size;
      }

      const activityName = `${guildCount} server${guildCount === 1 ? '' : 's'} | 🛡️ /help`;

      client.user.setPresence({
        status: PresenceUpdateStatus.Online,
        activities: [
          {
            name: activityName,
            type: ActivityType.Watching,
          },
        ],
      });

      if (this.lastCount !== guildCount) {
        LoggingService.logInfo(
          'PresenceService',
          `Server count updated: ${guildCount} servers (Watching: "${activityName}")`
        );
        this.lastCount = guildCount;
      } else {
        LoggingService.logInfo(
          'PresenceService',
          `Presence check verified: Watching ${activityName}`
        );
      }
    } catch (error) {
      LoggingService.logError('PresenceService', 'Failed to update presence', error);
    }
  }

  /**
   * Start repeated presence update loop
   * @param client Discord Client instance
   * @param intervalMs Check frequency in ms (default: 60,000ms / 60 seconds)
   */
  static startPresenceInterval(client: Client, intervalMs = 60000): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Run first check immediately
    void this.updatePresence(client);

    // Repeatedly check and refresh every intervalMs
    this.interval = setInterval(() => {
      void this.updatePresence(client);
    }, intervalMs);

    LoggingService.logInfo(
      'PresenceService',
      `Periodic presence check active (checking server count every ${Math.round(intervalMs / 1000)}s)`
    );
  }

  /**
   * Stop the periodic presence update loop
   */
  static stopPresenceInterval(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

