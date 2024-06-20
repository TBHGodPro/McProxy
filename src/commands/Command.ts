export default abstract class Command<C extends CommandConfig> {
  public readonly config: Required<C>;

  constructor(config: C) {
    if (typeof config.name !== 'string') throw new Error('Command Name should be a string!');
    if (config.aliases && config.aliases.find(i => typeof i !== 'string')) throw new Error('All Command Aliases should be strings!');

    config.name = config.name.toLowerCase().trim();
    config.aliases = config.aliases?.map(i => i.toLowerCase().trim()) ?? [];

    if (config.args) {
      let hasHadOptionalArg = false;
      for (const arg of config.args) {
        if (!arg || typeof arg.name !== 'string' || typeof arg.required !== 'boolean' || (arg.type && !['string', 'number', 'boolean'].includes(arg.type))) throw new Error('Invalid Comamnd Args!');

        arg.type ??= 'string';

        if (!arg.required && !hasHadOptionalArg) hasHadOptionalArg = true;
        if (arg.required && hasHadOptionalArg) throw new Error('Required arguments cannot come after optional arguments in commands!');
      }
    } else config.args = [];

    this.config = config as any;
  }

  public handleIncoming(command: RawCommandData): boolean {
    if (this.config.name === command.command || this.config.aliases!.includes(command.command)) {
      let finalArgs: CommandData['args'] = [];

      if (this.config.args?.length) {
        if (command.args.length < this.config.args.filter(i => i.required).length || command.args.length > this.config.args.length) {
          this.sendCommandTip(true);
          return true;
        }

        for (let i = 0; i < this.config.args.length; i++) {
          const confArg = this.config.args[i];
          const arg = command.args[i];

          if (!arg) break;
          if (typeof arg !== confArg.type) {
            this.sendCommandTip(true);
            return true;
          }

          if (confArg.type === 'boolean' && !['t', 'f', 'true', 'false', 'y', 'n', 'yes', 'no'].includes(arg.toLowerCase())) {
            this.sendCommandTip(true);
            return true;
          }
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
      } else if (command.args.length) {
        this.sendCommandTip(true);
        return true;
      }

      this.handle({
        command: command.command,
        args: finalArgs,
      });

      return true;
    } else return false;
  }

  public sendCommandTip(error: boolean) {
    // TODO
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
  name: string;
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
