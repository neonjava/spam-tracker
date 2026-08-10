import { REST, Routes } from 'discord.js';
import { config } from './config/environment';
import { data as setupData } from './commands/setup';
import { data as voteData } from './commands/vote';
import { data as helpData } from './commands/help';
import { LoggingService } from './services/loggingService';

const commands = [
  setupData.toJSON(),
  voteData.toJSON(),
  helpData.toJSON()
];

const rest = new REST({ version: '10' }).setToken(config.discordToken);

(async () => {
  try {
    LoggingService.logInfo('DeployCommands', `Started refreshing ${commands.length} application (/) commands.`);

    const data = await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    ) as any[];

    LoggingService.logInfo('DeployCommands', `Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    LoggingService.logError('DeployCommands', 'Failed to deploy commands', error);
  }
})();
