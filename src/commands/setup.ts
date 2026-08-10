import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { checkBotPermissions } from '../utils/permissions';
import { GuildConfigService } from '../services/guildConfigService';
import { PROTECTION_CHANNEL_NAME } from '../utils/constants';
import { createMissingPermissionsEmbed, createAlreadySetupEmbed, createProtectionEmbed, createSetupSuccessEmbed, createErrorEmbed } from '../utils/embeds';
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

    const permissionCheck = checkBotPermissions(interaction.guild);
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

    const channel = await interaction.guild.channels.create({
      name: PROTECTION_CHANNEL_NAME,
      type: ChannelType.GuildText,
      parent: null,
      topic: '🚫 Protected channel - Do not send messages here',
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads],
        },
        {
          id: interaction.guild.members.me!.id,
          allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks],
        },
      ],
      reason: 'Spam Tracker protection channel',
    });

    await channel.send({ embeds: [createProtectionEmbed()] });

    await GuildConfigService.upsertConfig(interaction.guild.id, { protectedChannelId: channel.id });

    await interaction.editReply({ embeds: [createSetupSuccessEmbed(channel.id)] });
  } catch (error: any) {
    LoggingService.logError('SetupCommand', 'Error executing setup command', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [createErrorEmbed('An error occurred during setup.')] });
      } else {
        await interaction.reply({ embeds: [createErrorEmbed('An error occurred during setup.')], ephemeral: true });
      }
    } catch (e) {
       // Ignore fallback errors
    }
  }
}
