export interface ProtectionLogData {
  guildName: string;
  guildId: string;
  userName?: string;
  userId: string;
  userTag?: string;
  channelName?: string;
  action: string;
  details?: string;
  deletedMessages?: number;
}

export class LoggingService {
  static logProtection(data: ProtectionLogData): void {
    const timestamp = new Date().toISOString();
    const userName = data.userName || data.userTag || 'Unknown';
    console.log(`\n[PROTECTION] ${timestamp}`);
    console.log(`  Guild: ${data.guildName} (${data.guildId})`);
    console.log(`  User: ${userName} (${data.userId})`);
    if (data.channelName) {
      console.log(`  Channel: ${data.channelName}`);
    }
    console.log(`  Action: ${data.action}`);
    if (data.deletedMessages !== undefined) {
      console.log(`  Recent Messages Deleted: ${data.deletedMessages}`);
    }
    if (data.details) {
      console.log(`  Details: ${data.details}`);
    }
  }

  static logError(context: string, errorOrMessage: unknown, error?: unknown): void {
    const timestamp = new Date().toISOString();
    console.error(`\n[ERROR] ${timestamp}`);
    console.error(`  Context: ${context}`);

    if (error !== undefined) {
      // Called as logError(context, message, error)
      console.error(`  Message: ${String(errorOrMessage)}`);
      const errMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(`  Error: ${errMessage}`);
      if (stack) {
        console.error(`  Stack: ${stack}`);
      }
    } else {
      // Called as logError(context, error)
      const message = errorOrMessage instanceof Error ? errorOrMessage.message : String(errorOrMessage);
      const stack = errorOrMessage instanceof Error ? (errorOrMessage as Error).stack : undefined;
      console.error(`  Message: ${message}`);
      if (stack) {
        console.error(`  Stack: ${stack}`);
      }
    }
  }

  static logInfo(contextOrMessage: string, message?: string): void {
    const timestamp = new Date().toISOString();
    if (message !== undefined) {
      console.log(`[INFO] ${timestamp} | ${contextOrMessage} | ${message}`);
    } else {
      console.log(`[INFO] ${timestamp} | ${contextOrMessage}`);
    }
  }

  static logWarning(contextOrMessage: string, message?: string): void {
    const timestamp = new Date().toISOString();
    if (message !== undefined) {
      console.warn(`[WARNING] ${timestamp} | ${contextOrMessage} | ${message}`);
    } else {
      console.warn(`[WARNING] ${timestamp} | ${contextOrMessage}`);
    }
  }
}

