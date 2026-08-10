import { MESSAGE_RETENTION_WINDOW_MS, MESSAGE_CLEANUP_INTERVAL_MS } from '../utils/constants';

export interface TrackedMessage {
  guildId: string;
  channelId: string;
  messageId: string;
  authorId: string;
  createdTimestamp: number;
}

export class MessageTracker {
  private guildMessages: Map<string, TrackedMessage[]>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.guildMessages = new Map<string, TrackedMessage[]>();
  }

  public track(message: TrackedMessage): void {
    if (!this.guildMessages.has(message.guildId)) {
      this.guildMessages.set(message.guildId, []);
    }
    this.guildMessages.get(message.guildId)!.push(message);
  }

  public getUserMessages(guildId: string, authorId: string, since?: number): TrackedMessage[] {
    const cutoff = since !== undefined ? since : Date.now() - MESSAGE_RETENTION_WINDOW_MS;
    const messages = this.guildMessages.get(guildId) || [];
    
    return messages.filter(msg => 
      msg.authorId === authorId && msg.createdTimestamp >= cutoff
    );
  }

  public removeMessage(guildId: string, messageId: string): void {
    const messages = this.guildMessages.get(guildId);
    if (messages) {
      const index = messages.findIndex(msg => msg.messageId === messageId);
      if (index !== -1) {
        messages.splice(index, 1);
      }
    }
  }

  public cleanup(): void {
    const cutoff = Date.now() - (MESSAGE_RETENTION_WINDOW_MS + 5 * 60 * 1000); // 5 min buffer

    for (const [guildId, messages] of this.guildMessages.entries()) {
      const filtered = messages.filter(msg => msg.createdTimestamp >= cutoff);
      
      if (filtered.length === 0) {
        this.guildMessages.delete(guildId);
      } else {
        this.guildMessages.set(guildId, filtered);
      }
    }
  }

  public startCleanupInterval(): void {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => this.cleanup(), MESSAGE_CLEANUP_INTERVAL_MS);
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.guildMessages.clear();
  }

  public getGuildMessageCount(guildId: string): number {
    return this.guildMessages.get(guildId)?.length || 0;
  }
}
