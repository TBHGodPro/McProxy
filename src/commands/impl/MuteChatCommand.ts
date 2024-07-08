import Command, { CommandData } from '../Command';

export default class MuteChatCommand extends Command {
  constructor() {
    super({
      commands: ['mute-chat', 'mutechat'],
      description: 'Mute chat messages from other players, except ones that you might be interested in',
      args: [
        {
          type: 'boolean',
          required: false,
        },
      ],
    });

    this.player.proxy.on('fromServer', ({ data, name }) => {
      if (name === 'chat' && this.muted && data.position === 0) {
        const message = JSON.parse(data.message);
        const text = [message.text, ...(message.extra?.map((i: any) => i.text) ?? [])].join('').toLowerCase();

        // excludes messages that start with a color or rank/level, have a message colon, and dont contain players username, and isn't from party or guild (guild is debatable but kept for now)
        if ((text.startsWith('§') || text.startsWith('[')) && (text.includes('§f: ') || text.includes('§7: ')) && !text.includes(this.player.username!.toLowerCase()) && !text.split(':')[0].includes('party') && !text.split(':')[0].includes('guild')) return false;
      }
    });
  }

  private muted: boolean = false;

  public handle(data: CommandData) {
    this.muted = (data.args[0]?.value as boolean) ?? !this.muted;

    this.player.sendMessage(`\n    ${this.muted ? '§cMuted' : '§aUnmuted'} the chat!\n`);
  }
}
