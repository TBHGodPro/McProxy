import Player from '../player/Player';
import { player } from '..';

export default abstract class Command {
  public readonly config: CommandConfig;
  public readonly player: Player;

  private _registered: boolean = false;
  public get registered(): boolean {
    return this._registered;
  }
  public set registered(value: boolean) {
    if (!this._registered && value) this._registered = true;
  }

  constructor(config: CommandConfig) {
    this.player = player;

    if (typeof config.name !== 'string') throw new Error('Command Name should be a string!');
    if (config.aliases && config.aliases.find(i => typeof i !== 'string')) throw new Error('All Command Aliases should be strings!');

    config.name = config.name.toLowerCase().trim();
    config.aliases = config.aliases?.map(i => i.toLowerCase().trim()) ?? [];

    if (config.args) {
      let hasHadOptionalArg = false;
      for (const arg of config.args) {
        if (!arg || typeof arg.required !== 'boolean' || (arg.type && !['string', 'number', 'boolean'].includes(arg.type.toLowerCase().trim()))) throw new Error('Invalid Comamnd Args!');

        arg.type ??= 'string';
        arg.type = arg.type.toLowerCase().trim() as any;

        if (!arg.required && !hasHadOptionalArg) hasHadOptionalArg = true;
        if (arg.required && hasHadOptionalArg) throw new Error('Required arguments cannot come after optional arguments in commands!');
      }
    } else config.args = [];

    this.config = config as any;
  }

  public register() {
    player.commands.register(this);
  }

  public handleIncoming(command: RawCommandData) {
    if (this.config.name === command.command || this.config.aliases!.includes(command.command)) {
      let finalArgs: CommandData['args'] = [];

      if (this.config.args?.length) {
        if (command.args.length < this.config.args.filter(i => i.required).length || command.args.length > this.config.args.length) return this.sendCommandTip(true);

        for (let i = 0; i < this.config.args.length; i++) {
          const confArg = this.config.args[i];
          const arg = command.args[i];

          if (!arg && !confArg.required) break;

          if (confArg.type === 'number' && isNaN(arg as any)) return this.sendCommandTip(true);

          if (confArg.type === 'boolean' && !['t', 'f', 'true', 'false', 'y', 'n', 'yes', 'no'].includes(arg.toLowerCase())) return this.sendCommandTip(true);
        }

        finalArgs = command.args.map((arg, i) => {
          switch (this.config.args![i].type) {
            case 'string': {
              return {
                value: arg,
                type: 'string',
              };
            }

            case 'number': {
              return {
                value: Number(arg),
                type: 'number',
              };
            }

            case 'boolean': {
              return {
                value: ['t', 'true', 'y', 'yes'].includes(arg.toLowerCase()),
                type: 'boolean',
              };
            }

            default: {
              return {
                value: arg,
                type: 'string',
              };
            }
          }
        });
      } else if (command.args.length) return this.sendCommandTip(true);

      this.handle({
        command: command.command,
        args: finalArgs,
      });
    }
  }

  public sendCommandTip(error: boolean) {
    // TODO : Command tip
  }

  public abstract handle(data: CommandData): void;
}

export interface CommandConfig {
  name: string;
  args?: CommandArg[];
  aliases?: string[];
}

export type CommandArgTypes = 'string' | 'number' | 'boolean';

export interface CommandArg {
  required: boolean;
  type?: CommandArgTypes;
}

export interface RawCommandData {
  command: string;
  args: string[];
}

export interface CommandData {
  command: string;
  args: (
    | {
        type: 'string';
        value: string;
      }
    | {
        type: 'number';
        value: number;
      }
    | {
        type: 'boolean';
        value: boolean;
      }
  )[];
}
