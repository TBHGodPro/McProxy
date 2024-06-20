import Command, { CommandData } from '../Command';

export default class TestCommand extends Command {
  constructor() {
    super({
      name: 'test',
      args: [
        {
          required: true,
          type: 'string',
        },
        {
          required: true,
          type: 'number',
        },
        {
          required: false,
          type: 'boolean',
        },
      ],
      aliases: ['test-command', 'testCommand'],
    });
  }

  public handle(data: CommandData): void {
    console.log(data);
  }
}
