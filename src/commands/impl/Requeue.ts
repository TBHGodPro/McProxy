import Command, { CommandData } from '../Command';

export default class RequeueCommand extends Command {
  constructor() {
    super({
      commands: ['requeue', 'rq'],
      description: 'Requeue for the current game',
    });
  }

  public async handle(data: CommandData) {
    if (!this.player.lastGameMode) return this.player.sendMessage('§cYou have not played a game since you connected!');

    this.player.executeCommand(`/play ${this.player.lastGameMode.toLowerCase()}`);
  }
}
