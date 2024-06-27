import { StaffMod } from 'lc-apollo-js';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class LCStaffModsModule extends Module<LCStaffModsSettings> {
  public getModuleInfo(): ModuleInfo {
    return {
      id: 'lcStaffMods',
      name: 'LC Staff Mods',
      version: '1.0.0',
      description: 'Manage Lunar Client Staff Mods',
      author: 'TBHGodPro',
    };
  }

  async start(): Promise<void> {
    await this.player.apollo.onceReady();

    const mods = [] as StaffMod[];

    if (this.settings.xray) mods.push(StaffMod.XRAY);

    this.player.apollo.setStaffModsState(true, mods);
  }

  async stop(): Promise<void> {
    await this.player.apollo.onceReady();

    this.player.apollo.setAllStaffModsState(false);
  }

  connect = this.start;
  disconnect = this.stop;

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      xray: 'boolean',
    };
  }

  getDefaultSettings(): LCStaffModsSettings {
    return {
      xray: false,
    };
  }
}

export interface LCStaffModsSettings extends ModuleSettings {
  xray: boolean;
}
