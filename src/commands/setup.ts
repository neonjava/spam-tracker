import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { checkBotPermissions, checkBotPermissionsAsync } from '../utils/permissions';
import { GuildConfigService } from '../services/guildConfigService';
import { PROTECTION_CHANNEL_NAME } from '../utils/constants';
import { createMissingPermissionsEmbed, createAlreadySetupEmbed, createProtectionEmbed, createSetupSuccessEmbed, createErrorEmbed, getSpamWarningAttachment } from '../utils/embeds';
import { LoggingService } from '../services/loggingService';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the protected anti-spam channel')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.guild) {
      await interaction.editReply('This command can only be used in a server.');
      return;
    }

    const permissionCheck = await checkBotPermissionsAsync(interaction.guild);
    if (!permissionCheck.hasAll) {
      await interaction.editReply({ embeds: [createMissingPermissionsEmbed(permissionCheck.missing)] });
      return;
    }

    const config = await GuildConfigService.getConfig(interaction.guild.id);
    if (config && config.protectedChannelId) {
      try {
        const existingChannel = await interaction.guild.channels.fetch(config.protectedChannelId);
        if (existingChannel) {
          await interaction.editReply({ embeds: [createAlreadySetupEmbed(existingChannel.id)] });
          return;
        }
      } catch (error) {
        // Channel might have been deleted, continue to create a new one
      }
    }

    const botMember = await interaction.guild.members.fetchMe();

    const channel = await interaction.guild.channels.create({
      name: PROTECTION_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: null,
      topic: '🚫 Protected channel - Do not send messages here',
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
          deny: [
            PermissionFlagsBits.AddReactions,
            PermissionFlagsBits.CreatePublicThreads,
            PermissionFlagsBits.CreatePrivateThreads,
          ],
        },
        {
          id: botMember.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
      reason: 'Spam Tracker protection channel',
    });

    const localImage = getSpamWarningAttachment();
    const files = localImage ? [localImage.attachment] : [];
    await channel.send({ embeds: [createProtectionEmbed()], files });

    await GuildConfigService.upsertConfig(interaction.guild.id, { protectedChannelId: channel.id });

    await interaction.editReply({ embeds: [createSetupSuccessEmbed(channel.id)] });
  } catch (error: any) {
    LoggingService.logError('SetupCommand', 'Error executing setup command', error);
    try {
      let errorMessage = 'An error occurred during setup.';
      if (error.code === 50013 || error.message?.includes('Missing Permissions')) {
        errorMessage = 'The bot lacks **Manage Channels** or **Manage Roles** permission in this server to create the protected channel. Please update the bot\'s role permissions in **Server Settings > Roles** and try again.';
      }
      const errorEmbed = createErrorEmbed(errorMessage);

      if (interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    } catch (e) {
       // Ignore fallback errors
    }
  }
}
