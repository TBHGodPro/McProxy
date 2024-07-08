import { readdir } from 'fs/promises';
import { join, resolve } from 'path';
import Command from './Command';
import Player from '../player/Player';

export default class CommandHandler {
  public static readonly implDIR = resolve(__dirname, './impl');

  public readonly commands: Command[] = [];

  public async loadAll(paths?: string[]) {
    paths ??= [CommandHandler.implDIR];

    if (!paths.includes(CommandHandler.implDIR)) paths.push(CommandHandler.implDIR);

    for (const path of paths) {
      const files = (await readdir(path).catch(i => [])).filter(i => i.endsWith('.js') || i.endsWith('.cjs'));

      files.forEach(file => this.load(join(path, file)));
    }
  }

  public load(path: string) {
    try {
      const raw = require(path);

      let c: any;
      if (raw?.prototype instanceof Command) c = raw;
      if (raw?.default?.prototype instanceof Command) c = raw.default;
      if (raw?.command?.prototype instanceof Command) c = raw.command;
      if (raw?.cmd?.prototype instanceof Command) c = raw.cmd;
      if (raw?.cmnd?.prototype instanceof Command) c = raw.cmnd;
      if (raw && typeof raw === 'object' && Object.keys(raw)?.length) {
        for (const key of Object.keys(raw)) {
          if (raw[key]?.prototype instanceof Command) c = raw[key];
        }
      }
      if (!c) throw new Error('No Command Exported!');

      const command = new c() as Command;

      this.register(command);
    } catch (err: any) {
      Logger.error(`Failed to load command "${path.split('/')[path.split('/').length - 1].split('.').slice(0, -1).join('.')}":`, err?.message ?? err);
    }
  }

  public register(command: Command) {
    command.registered = true;

    this.commands.push(command);
  }

  public setup(player: Player) {
    player.proxy.on('fromClient', ({ data, name }) => {
      if (name === 'chat' && data.message.startsWith('/') && data.message !== '/locraw') {
        const parts = data.message
          .replace('/', '')
          .match(/(?:[^\s"]+|"[^"]*")+/g)
          ?.map(i => {
            i = i.trim();
            if (i.startsWith('"') && i.endsWith('"')) i = i.substring(1, i.length - 1);
            return i;
          });

        if (!parts) return true;

        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);

        const command = this.commands.find(i => i.config.commands.includes(commandName));

        if (!command) return true;

        command.handleIncoming({ command: commandName, args });

        return false;
      }
    });
  }
}
