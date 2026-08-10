import { Client, ActivityType, PresenceUpdateStatus } from 'discord.js';
import { LoggingService } from './loggingService';

export class PresenceService {
  static updatePresence(client: Client): void {
    try {
      if (!client.user) return;
      
      client.user.setPresence({
        status: PresenceUpdateStatus.DoNotDisturb,
        activities: [
          {
            name: `Managing ${client.guilds.cache.size} servers`,
            type: ActivityType.Watching
          }
        ]
      });
    } catch (error) {
      LoggingService.logError('Failed to update presence', error as Error);
    }
  }
}
