import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createVoteEmbed, createErrorEmbed } from '../utils/embeds';
import { LoggingService } from '../services/loggingService';

export const data = new SlashCommandBuilder()
  .setName('vote')
  .setDescription('Vote for Spam Tracker');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const voteData = createVoteEmbed();
    
    if (voteData.row) {
      await interaction.reply({ embeds: [voteData.embed], components: [voteData.row], ephemeral: false });
    } else {
      await interaction.reply({ embeds: [voteData.embed], ephemeral: false });
    }
  } catch (error: any) {
    LoggingService.logError('VoteCommand', 'Error executing vote command', error);
    try {
      await interaction.reply({ embeds: [createErrorEmbed('An error occurred while fetching voting links.')], ephemeral: true });
    } catch (e) {
      // Ignore
    }
  }
}
