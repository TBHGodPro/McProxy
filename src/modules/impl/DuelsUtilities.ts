import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class DuelsUtilitiesModule extends Module<DuelsUtilitiesSettings> {
  public readonly data: { [key in keyof DuelsUtilitiesSettings]: any } = {
    betterBridgeHeightLimit: null,
    bridgePlayerTracker: null as null | 'Pos' | 'Neg',
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
    };
  }

  getDefaultSettings(): DuelsUtilitiesSettings {
    return {
      betterBridgeHeightLimit: true,
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
  }

  periodic(): void {}
}

export interface DuelsUtilitiesSettings extends ModuleSettings {
  betterBridgeHeightLimit: boolean;
  bridgePlayerTracker: boolean;
}
