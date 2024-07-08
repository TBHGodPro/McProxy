import Command, { CommandData } from '../Command';
import { version } from '../..';

export default class DebugCommand extends Command {
  constructor() {
    super({
      commands: ['debug', 'mcproxy:debug'],
      description: 'Get Debug Info from MCProxy',
    });
  }

  public async handle(data: CommandData) {
    await config.read();

    const infos = [
      `§aVersion: §r${version}`,
      `§aUUID: §r${this.player.uuid}`,
      `§aUsername: §r${this.player.username}`,
      `§aServer: §r${config.cached.server.host}:${config.cached.server.port}`,
      `§aAPI Key: §r${config.cached.apiKey}`,
      `§aGame Mode: §r${this.player.status?.mode || 'Unknown'}`,
      `§aLast Game Mode: §r${this.player.lastGameMode || 'Unknown'}`,
      `§aUptime: §r${Math.floor(process.uptime() / 60)} minutes`,
      `§aProxy Memory Usage: §r${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
      `§aProxy CPU Usage: §r${process.cpuUsage().system / 1000 / 1000}%`,
      `§aLoaded Modules (${this.player.modules.modules.size}): §r${Array.from(this.player.modules.modules.values())
        .map(m => m.info.name)
        .join(', ')}`,
    ];

    this.player.sendMessage(`\n§fHybr§cProxy §f- §6Debug info:\n\n§r${infos.join('\n')}`);
  }
}
