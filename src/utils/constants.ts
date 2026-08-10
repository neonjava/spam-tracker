/** Name of the protected honeypot channel */
export const PROTECTION_CHANNEL_NAME = 'dont-msg-or-upload-here';

/** Timeout duration: 2 hours in milliseconds */
export const TIMEOUT_DURATION_MS = 2 * 60 * 60 * 1000;

/** How far back to search for messages to delete: 20 minutes */
export const MESSAGE_RETENTION_WINDOW_MS = 20 * 60 * 1000;

/** How often to clean expired entries from the message cache: 5 minutes */
export const MESSAGE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Delay between batch deletions to respect rate limits */
export const BATCH_DELETE_DELAY_MS = 1000;

/** Maximum messages to fetch per Discord API call */
export const MAX_FETCH_MESSAGES = 100;

/** Discord embed colors */
export const EMBED_COLORS = {
  error: 0xED4245,
  success: 0x57F287,
  info: 0x5865F2,
  warning: 0xFEE75C,
  protection: 0xFF0000,
} as const;

/** Bot branding */
export const BOT_NAME = 'Spam Tracker';
export const DEVELOPER_NAME = 'NeonJava';
export const DEVELOPER_GITHUB = 'https://github.com/neonjava';
