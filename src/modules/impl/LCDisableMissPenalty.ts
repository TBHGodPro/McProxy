import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class LCDisableMissPenalty extends Module<LCDisableMissPenaltySettings> {
  public getModuleInfo(): ModuleInfo {
    return {
      id: 'lcDisableMissPenalty',
      name: 'LC Disable Miss Penalty',
      version: '1.0.0',
      description: 'Enable/Disable Lunar Client Hit-Miss Penalty',
      author: 'TBHGodPro',
    };
  }

  async start(): Promise<void> {
    await this.player.apollo.onceReady();

    this.player.apollo.disableMissPenalty();
  }

  async stop(): Promise<void> {
    await this.player.apollo.onceReady();

    this.player.apollo.enableMissPenalty();
  }

  connect = this.start;
  disconnect = this.stop;

  getSettingsSchema(): ModuleSettingsSchema {
    return {};
  }

  getDefaultSettings(): LCDisableMissPenaltySettings {
    return {};
  }
}

export interface LCDisableMissPenaltySettings extends ModuleSettings {}
