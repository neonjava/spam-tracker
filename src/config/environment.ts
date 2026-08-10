import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  discordToken: string;
  clientId: string;
  databaseUrl: string;
  topggVoteUrl: string | undefined;
  discordbotlistVoteUrl: string | undefined;
  botservicesVoteUrl: string | undefined;
}

function loadConfig(): AppConfig {
  const discordToken = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const databaseUrl = process.env.DATABASE_URL;

  const missing: string[] = [];

  if (!discordToken) missing.push('DISCORD_TOKEN');
  if (!clientId) missing.push('CLIENT_ID');
  if (!databaseUrl) missing.push('DATABASE_URL');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Copy .env.example to .env and fill in the required values.'
    );
  }

  return {
    discordToken: discordToken!,
    clientId: clientId!,
    databaseUrl: databaseUrl!,
    topggVoteUrl: process.env.TOPGG_VOTE_URL || undefined,
    discordbotlistVoteUrl: process.env.DISCORDBOTLIST_VOTE_URL || undefined,
    botservicesVoteUrl: process.env.BOTSERVICES_VOTE_URL || undefined,
  };
}

export const config = loadConfig();
