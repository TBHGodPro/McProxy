export default class Logger {
  private identifier?: string;
  private isModuleLogger: boolean;
  private bgColor: string;

  constructor(identifier?: string, isModuleLogger?: boolean, bgColor: string = 'bgBlueBright') {
    this.identifier = identifier;
    this.isModuleLogger = isModuleLogger ?? false;
    this.bgColor = bgColor;
  }

  public setIdentifier(identifier: string) {
    this.identifier = identifier;
  }

  private getPrefix() {
    return this.identifier ? [this.isModuleLogger ? chalk.bgGreen.black(` ${this.identifier} `) : (chalk as any)[this.bgColor].black(` ${this.identifier} `)] : [];
  }

  public info(...args: any[]): void {
    console.log(...(this?.getPrefix() ?? {}), chalk.bgBlue.white(' INFO '), ...args);
  }

  public warn(...args: any[]): void {
    console.warn(...(this?.getPrefix() ?? {}), chalk.bgYellow.black(' WARN '), ...args);
  }

  public error(...args: any[]): void {
    console.error(...(this?.getPrefix() ?? {}), chalk.bgRed.white(' ERROR '), ...args);
  }

  public debug(...args: any[]): void {
    console.debug(...(this?.getPrefix() ?? {}), chalk.bgGreen.white(' DEBUG '), ...args);
  }

  public static info(...args: any[]): void {
    console.log(chalk.bgBlue.white(' INFO '), ...args);
  }

  public static warn(...args: any[]): void {
    console.warn(chalk.bgYellow.black(' WARN '), ...args);
  }

  public static error(...args: any[]): void {
    console.error(chalk.bgRed.white(' ERROR '), ...args);
  }

  public static debug(...args: any[]): void {
    console.debug(chalk.bgGreen.white(' DEBUG '), ...args);
  }
}
