import { Party } from '../../Types';
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
      author: 'TBHGodPro',
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

  private readonly listener = async (party: Party) => {
    if (!party.inParty) return this.player.apollo.removeAllTeammates(true);

    await Promise.all(
      Array.from(party.members.values()).map(async member => {
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
  };

  start(): void {
    if (this.player.apollo.teamMembers.size) this.player.apollo.removeAllTeammates(true);
    this.player.hypixel.on('partyInfo', this.listener);
  }
  stop(): void {
    this.player.hypixel.off('partyInfo', this.listener);
    this.player.apollo.removeAllTeammates(true);
  }
}

export interface PartyViewSettings extends ModuleSettings {
  colorHex: string;
}
