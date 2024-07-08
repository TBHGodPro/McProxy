import Command, { CommandData } from '../Command';

export default class APIKeyCommand extends Command {
  constructor() {
    super({
      commands: ['api-key', 'apikey', 'api', 'mcproxy:apikey', 'mcproxy:api'],
      description: 'View your active API Key for MCProxy',
    });
  }

  public async handle(data: CommandData) {
    const { apiKey } = await config.read();

    const message = {
      text: `\n\n  §aYour API Key is\n    §b${apiKey}\n\n`,
      clickEvent: {
        action: 'suggest_command',
        value: apiKey,
      },
      hoverEvent: {
        action: 'show_text',
        value: '§eClick to put key in chat so you can copy!',
      },
    };

    this.player.client?.write('chat', { message: JSON.stringify(message) });
  }
}
