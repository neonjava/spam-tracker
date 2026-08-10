import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { createHelpEmbed, createErrorEmbed } from '../utils/embeds';
import { LoggingService } from '../services/loggingService';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('View available commands');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    await interaction.reply({ embeds: [createHelpEmbed()], ephemeral: true });
  } catch (error: any) {
    LoggingService.logError('HelpCommand', 'Error executing help command', error);
    try {
      await interaction.reply({ embeds: [createErrorEmbed('An error occurred.')], ephemeral: true });
    } catch (e) {
      // Ignore
    }
  }
}
