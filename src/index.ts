import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './config/environment';
import { connectDatabase, disconnectDatabase } from './database/prisma';
import { MessageTracker } from './services/messageTracker';
import { ModerationService } from './services/moderationService';
import { ProtectionService } from './services/protectionService';
import { LoggingService } from './services/loggingService';
import { PresenceService } from './services/presenceService';
import { createErrorEmbed, createTimeoutRemovedDMEmbed } from './utils/embeds';

import { startDashboardServer } from './dashboard/dashboardServer';

import * as setupCommand from './commands/setup';
import * as removeCommand from './commands/remove';
import * as helpCommand from './commands/help';

import * as readyEvent from './events/ready';
import * as guildCreateEvent from './events/guildCreate';
import * as guildDeleteEvent from './events/guildDelete';
import * as messageCreateEvent from './events/messageCreate';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ]
  });

  const messageTracker = new MessageTracker();
  messageTracker.startCleanupInterval();

  // Start Web Admin Control Panel & Console
  startDashboardServer(client, messageTracker);

  const moderationService = new ModerationService(messageTracker);
  const protectionService = new ProtectionService(messageTracker, moderationService);

  client.commands = new Collection();
  client.commands.set(setupCommand.data.name, setupCommand);
  client.commands.set(removeCommand.data.name, {
    data: removeCommand.data,
    execute: removeCommand.createExecute(moderationService)
  });
  client.commands.set(helpCommand.data.name, helpCommand);

  client.once(readyEvent.name, (...args) => readyEvent.execute(...args));
  client.on(guildCreateEvent.name, (...args) => guildCreateEvent.execute(...args));
  client.on(guildDeleteEvent.name, (...args) => guildDeleteEvent.execute(...args));
  
  const messageCreateHandler = messageCreateEvent.createHandler(messageTracker, protectionService);
  client.on(messageCreateEvent.name, messageCreateHandler);

  client.on('interactionCreate', async interaction => {
    // Handle Untimeout Self-Appeal Button Interactions
    if (interaction.isButton() && interaction.customId.startsWith('untimeout_')) {
      try {
        const parts = interaction.customId.split('_');
        const guildId = parts[1];
        const targetUserId = parts[2];

        const targetGuild = client.guilds.cache.get(guildId);
        if (!targetGuild) {
          await interaction.reply({ content: '❌ The server associated with this timeout is no longer accessible.', ephemeral: true });
          return;
        }

        const member = await targetGuild.members.fetch(targetUserId).catch(() => null);
        if (!member) {
          await interaction.reply({ content: '❌ Could not find your member profile in the server.', ephemeral: true });
          return;
        }

        if (!member.isCommunicationDisabled()) {
          const removedEmbed = createTimeoutRemovedDMEmbed(targetGuild.name);
          await interaction.update({ embeds: [removedEmbed], components: [] });
          return;
        }

        // Remove timeout
        await member.timeout(null, 'User self-appeal: un-timed out via security confirmation button');
        LoggingService.logInfo(`Removed timeout for ${member.user.tag} in ${targetGuild.name} via DM appeal button`);

        const removedEmbed = createTimeoutRemovedDMEmbed(targetGuild.name);
        await interaction.update({ embeds: [removedEmbed], components: [] });
      } catch (err: any) {
        LoggingService.logError('UntimeoutButton', 'Failed to process untimeout appeal button', err);
        try {
          await interaction.reply({ content: '❌ An error occurred while removing your timeout. Please contact server moderators.', ephemeral: true });
        } catch (e) {}
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      LoggingService.logError('InteractionCreate', `Error executing command ${interaction.commandName}`, error);
      try {
        const embed = createErrorEmbed('There was an error while executing this command!');
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [embed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (e) {
        LoggingService.logError('InteractionCreate', 'Failed to send error reply', e);
      }
    }
  });

  try {
    await connectDatabase();
    await client.login(config.discordToken);
  } catch (error) {
    LoggingService.logError('Main', 'Failed to start bot', error);
    process.exit(1);
  }

  const shutdown = async () => {
    LoggingService.logInfo('Main', 'Shutting down...');
    PresenceService.stopPresenceInterval();
    messageTracker.destroy();
    await disconnectDatabase();
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(error => {
  LoggingService.logError('Main', 'Unhandled error', error);
  process.exit(1);
});
