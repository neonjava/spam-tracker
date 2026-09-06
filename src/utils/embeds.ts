import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import path from 'path';
import fs from 'fs';
import { EMBED_COLORS, BOT_NAME, DEVELOPER_NAME, DEVELOPER_GITHUB, SPAM_EXAMPLES_IMAGE_URL } from './constants';
import { config } from '../config/environment';

export function getSpamWarningAttachment(): { attachment: AttachmentBuilder; attachmentName: string } | null {
  const candidates = [
    path.resolve(__dirname, '../../assets/image.png'),
    path.resolve(__dirname, '../assets/image.png'),
    path.resolve(process.cwd(), 'assets/image.png'),
    path.resolve(__dirname, '../../assets/image.gif'),
    path.resolve(__dirname, '../assets/image.gif'),
    path.resolve(process.cwd(), 'assets/image.gif'),
    path.resolve(__dirname, '../../assets/spam-examples.png'),
    path.resolve(__dirname, '../assets/spam-examples.png'),
    path.resolve(process.cwd(), 'assets/spam-examples.png'),
  ];
  const found = candidates.find(p => fs.existsSync(p));
  if (found) {
    return {
      attachment: new AttachmentBuilder(found, { name: 'warning.png' }),
      attachmentName: 'attachment://warning.png'
    };
  }
  return null;
}

export function createWelcomeEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`\u{1F44B} Thanks for adding ${BOT_NAME}!`)
    .setDescription(
      `I'm ready to help protect your server from spam and raid activity.\n\n` +
      `Get started with \`/setup\` to create a dedicated protected channel ` +
      `and configure the basic protection system.`
    )
    .setColor(EMBED_COLORS.info)
    .addFields(
      {
        name: '\u{26A1} Get Started',
        value: '`/setup` \u2014 Configure protection',
      },
      {
        name: '\u{1F4CB} Useful Commands',
        value: [
          '`/setup` \u2014 Configure protection',
          '`/help` \u2014 View commands',
        ].join('\n'),
      },
      {
        name: '\u{1F4E4} Important Role Hierarchy Tip',
        value: 'Please place the **Spam Tracker** bot role **above regular server members** and **below staff/admin roles** in **Server Settings > Roles** so it can successfully issue timeouts to spammers.',
      },
      {
        name: '\u{1F468}\u200D\u{1F4BB} Developer',
        value: `[${DEVELOPER_NAME}](${DEVELOPER_GITHUB})`,
      }
    )
    .setTimestamp()
    .setFooter({ text: BOT_NAME });
}

export function createProtectionEmbed(): EmbedBuilder {
  const description = [
    'This channel is monitored for automated spam bots and malicious accounts.',
    '',
    'Sending any message, image, GIF, or file will trigger automatic moderation, including a 2-hour timeout and deletion of recent messages.',
  ].join('\n');

  const embed = new EmbedBuilder()
    .setTitle('🚫 DO NOT MESSAGE OR UPLOAD HERE')
    .setDescription(description)
    .setColor(EMBED_COLORS.protection)
    .setFooter({ text: `Protected by ${BOT_NAME}` })
    .setTimestamp();

  const localImage = getSpamWarningAttachment();
  if (localImage) {
    embed.setImage(localImage.attachmentName);
  } else {
    embed.setImage(SPAM_EXAMPLES_IMAGE_URL);
  }

  return embed;
}

export function createSetupSuccessEmbed(channelId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('\u{1F6E1}\u{FE0F} Protection Enabled')
    .setDescription('Your server is now protected.')
    .setColor(EMBED_COLORS.success)
    .addFields(
      {
        name: '\u{1F4CC} Protected Channel',
        value: `<#${channelId}>`,
      },
      {
        name: '\u{26A0}\u{FE0F} What Happens',
        value: [
          'Members who attempt to send messages there will be:',
          '\u2022 Message deleted',
          '\u2022 Timed out for **2 hours**',
          '\u2022 Recent 20-min messages removed from the server',
        ].join('\n'),
      },
      {
        name: '\u{1F4E4} Important Role Setup Tip',
        value: 'Make sure to place the **Spam Tracker** bot role **above regular server members** and **below staff/admin roles** in **Server Settings > Roles** so the bot has authority to timeout spammers.',
      }
    )
    .setFooter({ text: BOT_NAME })
    .setTimestamp();
}

export function createAlreadySetupEmbed(channelId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('\u{1F6E1}\u{FE0F} Protection Already Configured')
    .setDescription(
      `This server already has protection configured.\n\n` +
      `Protected channel: <#${channelId}>\n\n` +
      `💡 **Role Setup Tip:** Keep the **Spam Tracker** bot role **above regular server members** and **below staff roles** in Server Settings > Roles.`
    )
    .setColor(EMBED_COLORS.info)
    .setTimestamp();
}

export function createMissingPermissionsEmbed(missing: string[]): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('\u{274C} Missing Permissions')
    .setDescription(
      `The bot is missing the following required permissions:\n\n` +
      `${missing.map(p => `\u2022 \`${p}\``).join('\n')}\n\n` +
      `Please update the bot's role permissions and try again.`
    )
    .setColor(EMBED_COLORS.error)
    .setTimestamp();
}

export function createHelpEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`\u{1F6E1}\u{FE0F} ${BOT_NAME}`)
    .setDescription('Protect your server from spam, raids, and malicious message flooding.')
    .setColor(EMBED_COLORS.info)
    .addFields(
      {
        name: '\u{1F527} Protection Setup',
        value: '`/setup` \u2014 Configure the protected anti-spam channel.',
      },
      {
        name: '\u{1F9FA} Message Purging',
        value: '`/remove user:@user` \u2014 Purge all messages from a target user sent in the last 20 minutes across all server channels.',
      },
      {
        name: '\u{2753} Help',
        value: '`/help` \u2014 Show available commands.',
      },
      {
        name: '\u{1F4E4} Setup Tip: Role Hierarchy',
        value: 'Place the **Spam Tracker** bot role **above regular server members** and **below staff/moderator roles** in **Server Settings > Roles** so it can successfully issue 2-hour timeouts to spammers.',
      }
    )
    .setFooter({ text: `Developed by ${DEVELOPER_NAME} \u2022 ${DEVELOPER_GITHUB}` })
    .setTimestamp();
}

export function createRemoveSuccessEmbed(targetUserTag: string, targetUserId: string, deletedCount: number): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('\u{1F9FA} Recent Messages Purged')
    .setDescription(`Successfully purged recent 20-minute messages for <@${targetUserId}> across all server channels.`)
    .setColor(EMBED_COLORS.success)
    .addFields(
      {
        name: '\u{1F464} Target User',
        value: `${targetUserTag} (\`${targetUserId}\`)`,
        inline: true,
      },
      {
        name: '\u{1F5D1}\u{FE0F} Messages Deleted',
        value: `**${deletedCount}** message${deletedCount === 1 ? '' : 's'}`,
        inline: true,
      },
      {
        name: '\u{23F1}\u{FE0F} Time Window',
        value: 'Last 20 minutes',
        inline: true,
      }
    )
    .setFooter({ text: BOT_NAME })
    .setTimestamp();
}

export function createVoteEmbed(): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> | null } {
  const embed = new EmbedBuilder()
    .setTitle(`\u{1F5F3}\u{FE0F} Vote for ${BOT_NAME}`)
    .setDescription(
      'Enjoying the protection? Voting helps support the bot and increase its visibility.'
    )
    .setColor(EMBED_COLORS.info)
    .setTimestamp();

  const buttons: ButtonBuilder[] = [];

  if (config.topggVoteUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('Vote on Top.gg')
        .setURL(config.topggVoteUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji('\u{2B50}')
    );
  }

  if (config.discordbotlistVoteUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('Vote on Discord Bot List')
        .setURL(config.discordbotlistVoteUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji('\u{1F4E2}')
    );
  }

  if (config.botservicesVoteUrl) {
    buttons.push(
      new ButtonBuilder()
        .setLabel('Vote on Bot Services')
        .setURL(config.botservicesVoteUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji('\u{1F31F}')
    );
  }

  let row: ActionRowBuilder<ButtonBuilder> | null = null;
  if (buttons.length > 0) {
    row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);
  }

  return { embed, row };
}

export function createTimeoutDMEmbed(guildName: string): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('\u{26A0}\u{FE0F} You have been timed out')
    .setDescription(
      `You have been timed out for **2 hours** in **${guildName}** because a message, image, GIF, or file was sent from your account in a protected anti-spam channel.\n\n` +
      `⚠️ **Your account might be compromised or hacked!**\n` +
      `Automated spam bots often compromise Discord accounts to flood servers with malicious links, crypto scams, or fake giveaway screenshots.\n\n` +
      `If you are sure your account is secure (you have updated your password & enabled 2FA), click the **Remove Timeout** button below to remove your timeout immediately.`
    )
    .setColor(EMBED_COLORS.warning)
    .setFooter({ text: BOT_NAME })
    .setTimestamp();

  const localImage = getSpamWarningAttachment();
  if (localImage) {
    embed.setImage(localImage.attachmentName);
  } else {
    embed.setImage(SPAM_EXAMPLES_IMAGE_URL);
  }

  return embed;
}

export function createTimeoutDMRow(guildId: string, userId: string): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId(`untimeout_${guildId}_${userId}`)
    .setLabel('\u{1F503} Remove Timeout')
    .setStyle(ButtonStyle.Success);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(button);
}

export function createTimeoutRemovedDMEmbed(guildName: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('\u{2705} Timeout Removed')
    .setDescription(
      `Your timeout in **${guildName}** has been successfully removed!\n\n` +
      `Please ensure your account security (password & 2FA enabled) remains up to date so your account is not compromised again.`
    )
    .setColor(EMBED_COLORS.success)
    .setFooter({ text: BOT_NAME })
    .setTimestamp();
}

export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('\u{274C} Error')
    .setDescription(message)
    .setColor(EMBED_COLORS.error)
    .setTimestamp();
}
