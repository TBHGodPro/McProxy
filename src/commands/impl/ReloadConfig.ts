import Command, { CommandData } from '../Command';

export default class ReloadConfigCommand extends Command {
  constructor() {
    super({
      commands: ['rc', 'reloadconfig', 'reload', 'configreload'],
      description: 'Reload the MCProxy Config',
    });
  }

  public async handle(data: CommandData) {
    await config.read();

    const message = {
      text: `§aConfig Reloaded!`,
    };

    this.player.client?.write('chat', { message: JSON.stringify(message) });
  }
}
