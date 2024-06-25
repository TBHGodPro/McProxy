import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class BedwarsUtilitiesModule extends Module<BedwarsUtilitiesSettings> {
  public readonly data: { [key in keyof BedwarsUtilitiesSettings]: any } = {
    playerHighlight: {},
  };

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'bedwarsUtils',
      name: 'Bedwars Utilities',
      version: '1.0.0',
      description: 'Assortment of utilities for bedwars',
      author: 'TBHGodPro',
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      playerHighlight: 'boolean',
    };
  }

  getDefaultSettings(): BedwarsUtilitiesSettings {
    return {
      playerHighlight: false,
    };
  }

  init(): void {
    this.player.proxy.on('fromClient', ({ data: packet, name }, toClient, toServer) => {
      if (!this.enabled) return;
    });

    this.player.proxy.on('fromServer', ({ data: packet, name }, toClient, toServer) => {
      if (!this.enabled) return;
    });

    this.player.listener.on('switch_server', () => {});
  }

  periodic(): void {}

  start(): void {}

  stop(): void {}
}

export interface BedwarsUtilitiesSettings extends ModuleSettings {
  playerHighlight: boolean;
}
