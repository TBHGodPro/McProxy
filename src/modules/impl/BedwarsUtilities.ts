import { playerManager } from '../..';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { UUID, parseUUID } from '@minecraft-js/uuid';

export default class BedwarsUtilitiesModule extends Module<BedwarsUtilitiesSettings> {
  public readonly data: { [key in keyof BedwarsUtilitiesSettings]: any } = {
    playerHighlight: {} as { [team: string]: UUID },
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
      if (this.player.status?.game?.code === 'BEDWARS' && this.player.status.mode !== 'LOBBY' && name === 'scoreboard_team') {
        const team = packet.team.replace(/[0-9]/g, '').toLowerCase();
        if (colors[team.toUpperCase()] === undefined) return;
        this.data.playerHighlight[team] ??= [];

        if (packet.mode === 3) {
          // Add Players

          Promise.all(packet.players.map(i => playerManager.fetchUsername(i).catch(() => null))).then(fetched => {
            for (const player of fetched) {
              if (!player) continue;
              const uuid = parseUUID(player.uuid);

              for (const otherTeam in this.data.playerHighlight) {
                while (this.data.playerHighlight[otherTeam].includes(uuid)) this.data.playerHighlight[otherTeam].splice(this.data.playerHighlight[otherTeam].indexOf(uuid), 1);
              }

              if (!this.data.playerHighlight[team].includes(uuid)) this.data.playerHighlight[team].push(uuid);
            }
          });
        } else if (packet.mode === 4) {
          // Remove Players

          Promise.all(packet.players.map(i => playerManager.fetchUsername(i).catch(() => null))).then(fetched => {
            for (const player of fetched) {
              if (!player) continue;
              const uuid = parseUUID(player.uuid);
              while (this.data.playerHighlight[team]?.includes(uuid)) this.data.playerHighlight[team].splice(this.data.playerHighlight[team].indexOf(uuid), 1);
            }
          });
        }
      }

      if (!this.enabled) return;
    });

    this.player.listener.on('switch_server', () => {});

    setInterval(() => {
      if (!this.enabled) return;

      if (this.settings.playerHighlight) {
        for (const team in this.data.playerHighlight) {
          const color = colors[team.toUpperCase()];

          for (const p of this.data.playerHighlight[team]) {
            this.player.apollo.glowPlayer(p, color);
          }
        }
      }
    }, 1000);
  }

  periodic(): void {}

  start(): void {}

  stop(): void {}
}

export interface BedwarsUtilitiesSettings extends ModuleSettings {
  playerHighlight: boolean;
}
