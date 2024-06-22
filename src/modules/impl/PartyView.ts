import { playerManager } from '../../';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class PartyViewModule extends Module<PartyViewSettings> {
  private color: number = 0x0088dd;

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'partyView',
      name: 'Party View',
      version: '1.0.0',
      description: "Highlights party members with Lunar Clent's Party View Mod",
    };
  }

  public getSettingsSchema(): ModuleSettingsSchema {
    return {
      colorHex: 'string',
    };
  }

  public getDefaultSettings(): PartyViewSettings {
    return {
      colorHex: '0088DD',
    };
  }

  public verifySettings(settings: PartyViewSettings): boolean {
    if (settings.colorHex.length !== 6) return false;
    try {
      eval(`0x${settings.colorHex}`);
      return true;
    } catch {
      return false;
    }
  }

  public updateSettings(settings: PartyViewSettings): void {
    this.color = eval(`0x${settings.colorHex}`);
  }

  private interval: NodeJS.Timer | null = null;
  start(): void {
    this.interval = setInterval(async () => {
      if (!this.player.party.inParty) return;

      await Promise.all(
        Array.from(this.player.party.members.values()).map(async member => {
          const player = await playerManager.fetchUUID(member.uuid);
          this.player.apollo.addTeammate(
            {
              uuid: member.uuid,
              displayName: player.username,
              color: this.color,
            },
            false
          );
        })
      );

      this.player.apollo.sendTeammatesList();
    }, 2000);
  }
  stop(): void {
    clearInterval(this.interval as any);
    this.interval = null;
  }
}

export interface PartyViewSettings extends ModuleSettings {
  colorHex: string;
}
