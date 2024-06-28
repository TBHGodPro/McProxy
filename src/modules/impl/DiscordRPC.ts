import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { Client as DiscordClient } from 'discord-rpc';

export default class DiscordRPCModule extends Module<DiscordRPCSettings> {
  public static readonly clientId = '1254163111577911346';

  public readonly client = new DiscordClient({ transport: 'ipc' });

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'discordRPC',
      name: 'Discord RPC',
      version: '1.0.0',
      description: 'Discord Rich Presence for MCProxy',
      author: 'TBHGodPro',
    };
  }

  public connected: boolean = false;

  public async init(): Promise<void> {
    const res = await this.client.login({ clientId: DiscordRPCModule.clientId }).catch(err => this.logger.error(err.message));

    this.connected = !!res;

    if (res) {
      this.logger.info('Logged In!');
      if (this.enabled) {
        this.logger.debug('Enabled');
        this.update(true);
      }
    } else this.logger.error('Failed to log in');

    setInterval(() => this.update(false), 2000);
  }

  public start(): void {
    if (this.connected) {
      this.logger.debug('Enabled');
      this.update(true);
    }
  }

  public stop(): void {
    this.client
      .clearActivity()
      .then(() => this.logger.debug('Disabled'))
      .catch(err => this.logger.error(err.message));
  }

  private last: string = '';

  public async update(force: boolean = false) {
    if (!this.enabled) return;

    const info = {
      state: this.settings.showStatus && this.player.isConnected && this.player.isHypixel ? 'Hypixel: ' + this.player.statusMessage : 'Running MCProxy',
      ...(this.settings.showServer && this.player.isConnected
        ? {
            details: `Connected to ${config.cached.server.host}${config.cached.server.port === 25565 ? '' : `:${config.cached.server.port}`}`,
          }
        : {}),
      largeImageKey: 'logo',
      largeImageText: 'MCProxy',
      ...(this.settings.showAvatar && this.player.isConnected
        ? {
            smallImageKey: `https://cravatar.eu/avatar/${this.player.uuid}.png`,
            smallImageText: this.player.username ?? 'PLAYER',
          }
        : {}),
      buttons: [
        {
          label: 'Download MCProxy',
          url: 'https://github.com/TBHGodPro/MCProxy',
        },
      ],
    };

    const string = JSON.stringify(info);
    if (!force && string === this.last) return;
    this.last = string;

    await this.client.setActivity(info).catch(err => this.logger.error(err.message));
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      showAvatar: 'boolean',
      showStatus: 'boolean',
      showServer: 'boolean',
    };
  }

  getDefaultSettings(): DiscordRPCSettings {
    return {
      showAvatar: true,
      showStatus: true,
      showServer: true,
    };
  }
}

export interface DiscordRPCSettings extends ModuleSettings {
  showAvatar: boolean;
  showStatus: boolean;
  showServer: boolean;
}
