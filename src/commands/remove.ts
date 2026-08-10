import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { ModerationService } from '../services/moderationService';
import { createRemoveSuccessEmbed, createErrorEmbed } from '../utils/embeds';
import { LoggingService } from '../services/loggingService';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Purge a user\'s messages sent in the last 20 minutes across all server channels')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The target user whose last 20-minute messages will be deleted')
      .setRequired(true)
  );

export function createExecute(moderationService: ModerationService) {
  return async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      await interaction.deferReply({ ephemeral: true });

      if (!interaction.guild) {
        await interaction.editReply('This command can only be used in a server.');
        return;
      }

      const targetUser = interaction.options.getUser('user', true);

      const deletedCount = await moderationService.deleteRecentMessages(
        interaction.guild,
        targetUser.id
      );

      LoggingService.logInfo(
        `Command /remove purged ${deletedCount} messages for user ${targetUser.tag} (${targetUser.id}) in guild ${interaction.guild.id}`
      );

      await interaction.editReply({
        embeds: [createRemoveSuccessEmbed(targetUser.tag, targetUser.id, deletedCount)],
      });
    } catch (error: any) {
      LoggingService.logError('RemoveCommand', 'Error executing remove command', error);
      try {
        const errorEmbed = createErrorEmbed('Failed to purge user messages. Please check bot permissions.');
        if (interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      } catch (e) {
        // Ignore fallback errors
      }
    }
  };
}
