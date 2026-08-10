import { Guild, GuildMember, PermissionFlagsBits, PermissionsBitField } from 'discord.js';

export const REQUIRED_BOT_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ModerateMembers
];

export const INVITE_PERMISSIONS = new PermissionsBitField(REQUIRED_BOT_PERMISSIONS);

export interface PermissionCheckResult {
  hasAll: boolean;
  missing: string[];
}

export function checkBotPermissions(guild: Guild): PermissionCheckResult {
  const botMember = guild.members.me;
  if (!botMember) {
    return { hasAll: false, missing: ['Unknown'] };
  }

  const missing: string[] = [];
  const botPermissions = botMember.permissions;

  for (const permission of REQUIRED_BOT_PERMISSIONS) {
    if (!botPermissions.has(permission)) {
      // Find the name of the missing permission
      const permName = Object.keys(PermissionFlagsBits).find(
        (key) => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] === permission
      ) || 'Unknown';
      missing.push(permName);
    }
  }

  return {
    hasAll: missing.length === 0,
    missing
  };
}

export interface ModerationEligibility {
  canModerate: boolean;
  reason?: string;
}

export function canModerate(guild: Guild, botMember: GuildMember, target: GuildMember): ModerationEligibility {
  if (target.id === botMember.id) {
    return { canModerate: false, reason: 'Target is the bot itself' };
  }
  
  if (target.user.bot) {
    return { canModerate: false, reason: 'Target is a bot' };
  }
  
  if (target.id === guild.ownerId) {
    return { canModerate: false, reason: 'Target is the guild owner' };
  }
  
  if (target.roles.highest.position >= botMember.roles.highest.position) {
    return { canModerate: false, reason: 'Target role is equal or higher than bot role' };
  }
  
  if (!botMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return { canModerate: false, reason: 'Bot lacks ModerateMembers permission' };
  }
  
  return { canModerate: true };
}
