import Command, { CommandData } from '../Command';

export default class APIKeyCommand extends Command {
  constructor() {
    super({
      commands: ['api-key', 'apikey', 'api', 'mcproxy:apikey', 'mcproxy:api'],
      description: 'View your active API Key for MCProxy',
      args: [
        {
          type: 'string',
          required: false,
        },
      ],
    });
  }

  public async handle(data: CommandData) {
    if (data.args[0]?.value) {
      await config.write({
        ...config.cached,
        apiKey: data.args[0].value.toString(),
      });
    }

    const { apiKey } = await config.read();

    const message = {
      text: `\n\n  §aYour ${data.args[0]?.value ? 'new' : ''} API Key is\n    §b${apiKey}\n\n`,
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
