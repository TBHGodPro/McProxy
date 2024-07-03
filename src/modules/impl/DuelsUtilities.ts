import { UUID, parseUUID } from '@minecraft-js/uuid';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { playerManager } from '../..';

export default class DuelsUtilitiesModule extends Module<DuelsUtilitiesSettings> {
  public readonly data: { [key in keyof DuelsUtilitiesSettings]: any } = {
    betterBridgeHeightLimit: null,
    bridgePlayerTracker: null as null | 'Pos' | 'Neg',
    duelsHighlight: { wasActive: false, players: [], teams: {} } as {
      wasActive: boolean;
      players: UUID[];
      teams: {
        [team: string]: {
          color: 'RED' | 'BLUE' | null;
          players: UUID[];
        };
      };
    },
  };

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'duelsUtils',
      name: 'Duels Utilities',
      version: '1.0.0',
      description: 'Assortment of utilities for all duels',
      author: 'TBHGodPro',
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      betterBridgeHeightLimit: 'boolean',
      bridgePlayerTracker: 'boolean',
      duelsHighlight: 'boolean',
    };
  }

  getDefaultSettings(): DuelsUtilitiesSettings {
    return {
      betterBridgeHeightLimit: true,
      duelsHighlight: false,
      bridgePlayerTracker: false,
    };
  }

  init(): void {
    this.player.proxy.on('fromClient', ({ data: packet, name }, toClient, toServer) => {
      if (!this.enabled) return;

      if (this.settings.betterBridgeHeightLimit && name === 'block_place' && this.player.isInGameMode('DUELS_BRIDGE_') && packet.heldItem.blockId === 159 && ((packet.direction === 1 && packet.location.y >= 99) || packet.location.y > 99)) {
        const realBlockLocation = {
          x: packet.location.x,
          y: packet.location.y,
          z: packet.location.z,
        };
        switch (packet.direction) {
          case 0:
            realBlockLocation.x = packet.location.x - 1;
            break;
          case 1:
            realBlockLocation.y = packet.location.y + 1;
            break;
          case 2:
            realBlockLocation.z = packet.location.z - 1;
            break;
          case 3:
            realBlockLocation.z = packet.location.z + 1;
            break;
          case 4:
            realBlockLocation.x = packet.location.x - 1;
            break;
          case 5:
            realBlockLocation.x = packet.location.x + 1;
            break;
          default:
            break;
        }
        toClient.write('block_change', {
          location: realBlockLocation,
          type: 0,
        });
        return false;
      }
    });

    this.player.proxy.on('fromServer', ({ data: packet, name }, toClient, toServer) => {
      if (name === 'set_slot' && packet.windowId === 0 && [5, 6, 7, 8].includes(packet.slot) && this.player.isInGameMode('DUELS_BRIDGE_')) {
        setTimeout(() => {
          this.data.bridgePlayerTracker = this.player.location.x > 0 ? 'Pos' : 'Neg';
        }, 250);
      }

      if (['DUELS', 'SKYWARS'].includes(this.player.status?.game?.code!) && this.player.status?.mode !== 'LOBBY') {
        if (this.player.isInGameMode('DUELS_BRIDGE_')) {
          this.data.duelsHighlight.players = [];
          if (name === 'scoreboard_team') {
            if (packet.team.includes('w_') && packet.team.includes('_team_')) {
              this.data.duelsHighlight.wasActive = true;

              this.data.duelsHighlight.teams[packet.team] ??= {
                color: null,
                players: [],
              };

              (async () => {
                switch (packet.mode) {
                  case 2:
                    if (packet.prefix?.length) {
                      if (packet.prefix === '§c') this.data.duelsHighlight.teams[packet.team].color = 'RED';
                      else if (packet.prefix === '§9') this.data.duelsHighlight.teams[packet.team].color = 'BLUE';
                    }
                    break;

                  case 3: {
                    const fetched = await Promise.all(packet.players.map(i => playerManager.fetchUsername(i).catch(() => null)));

                    for (const player of fetched) {
                      if (!player) continue;
                      const uuid = parseUUID(player.uuid);
                      if (!this.data.duelsHighlight.teams[packet.team].players.includes(uuid)) this.data.duelsHighlight.teams[packet.team].players.push(uuid);
                    }
                    break;
                  }

                  case 4: {
                    const fetched = await Promise.all(packet.players.map(i => playerManager.fetchUsername(i).catch(() => null)));

                    for (const player of fetched) {
                      if (!player) continue;
                      const uuid = parseUUID(player.uuid);
                      if (this.data.duelsHighlight.teams[packet.team].players.includes(uuid)) this.data.duelsHighlight.teams[packet.team].players.splice(this.data.duelsHighlight.teams[packet.team].players.indexOf(uuid), 1);
                    }
                    break;
                  }
                }
              })();
            }
          }
        } else {
          this.data.duelsHighlight.teams = {};
          if (name === 'player_info' && packet.action === 0 && this.enabled && this.settings.duelsHighlight) {
            this.data.duelsHighlight.wasActive = true;
            for (const p of packet.data) this.data.duelsHighlight.players.push(parseUUID(p.UUID));
          }
        }
      } else if (this.enabled && this.settings.duelsHighlight && this.data.duelsHighlight.wasActive) {
        this.player.apollo.removeAllGlow();
        this.data.duelsHighlight.teams = {};
        this.data.duelsHighlight.players = [];
        this.data.duelsHighlight.wasActive = false;
      }

      if (!this.enabled) return;
    });

    this.player.listener.on('switch_server', () => {
      this.data.bridgePlayerTracker = null;
    });

    setInterval(() => {
      if (!this.enabled) return;

      if (this.settings.bridgePlayerTracker && this.data.bridgePlayerTracker && this.player.connectedPlayers.length === 1 && this.player.isInGameMode('DUELS_BRIDGE_') && this.player.connectedPlayers[0].location?.x) {
        const meDist = this.data.bridgePlayerTracker === 'Pos' ? 0 - this.player.location.x : 0 + this.player.location.x;
        const oppDist = this.data.bridgePlayerTracker === 'Pos' ? 0 + this.player.connectedPlayers[0].location.x : 0 - this.player.connectedPlayers[0].location.x;
        this.player.client?.write('chat', {
          message: JSON.stringify({
            text: Math.round(meDist) == Math.round(oppDist) ? `§fYou and your opponent are §eequal §fdistances away from the goals` : Math.round(meDist * 10) / 10 > Math.round(oppDist * 10) / 10 ? `§fYou are §6${Math.round((meDist - oppDist) * 10) / 10} §fblocks §aahead §fof your opponent` : `§fYou are §6${Math.round((oppDist - meDist) * 10) / 10} blocks §cbehind §fyour opponent`,
          }),
          position: 2,
        });
      }
    }, 50);

    setInterval(() => {
      if (!this.enabled) return;

      if (this.settings.duelsHighlight) {
        if (this.player.isInGameMode('DUELS_BRIDGE_')) {
          for (const team in this.data.duelsHighlight.teams) {
            const color = (colors as any)[this.data.duelsHighlight.teams[team].color];

            for (const p of this.data.duelsHighlight.teams[team].players) {
              this.player.apollo.glowPlayer(p, color);
            }
          }
        } else {
          for (const uuid of this.data.duelsHighlight.players as UUID[]) {
            const p = this.player.connectedPlayers.find(i => uuid.toString(true) == i.uuid);
            if (!p) continue;
            let health: number | null = p.health ?? null;

            if (health) health = Math.min(Math.max(health, 0), 20);

            const colorHex = health !== null ? `${Math.min(255, 510 - Math.round(health * (510 / 20))).toString(16)}${Math.min(255, Math.round(health * (510 / 20))).toString(16)}00` : 'ffffff';
            const color = parseInt(colorHex, 16);
            
            this.player.apollo.glowPlayer(uuid, color);
          }
        }
      }
    }, 1000);
  }

  periodic(): void {}

  async start(): Promise<void> {
    await this.player.apollo.onceReady();

    if (this.settings.duelsHighlight) this.player.apollo.removeAllGlow();
  }

  async stop(): Promise<void> {
    await this.player.apollo.onceReady();

    if (this.settings.duelsHighlight) this.player.apollo.removeAllGlow();
  }
}

export interface DuelsUtilitiesSettings extends ModuleSettings {
  betterBridgeHeightLimit: boolean;
  bridgePlayerTracker: boolean;
  duelsHighlight: boolean;
}
