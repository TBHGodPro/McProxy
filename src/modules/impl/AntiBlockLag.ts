import { Direction, IPlayer, Location, Party } from '../../Types';
import { playerManager } from '../..';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { Position } from '../../PacketTypings';
import { parseUUID, UUID } from '@minecraft-js/uuid';
import Utils from 'src/utils/Utils';
import Physics from 'src/utils/Physics';

export default class AntiBlockLagModule extends Module<AntiBlockLagSettings> {
  public readonly items: Map<string, { id: number; tries: number; packet: any }> = new Map();

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'antiBlockLag',
      name: 'Anti Block Lag',
      version: '1.0.0',
      description: 'Automatically replace deleted blocks',
      author: 'TBHGodPro',
    };
  }

  public getSettingsSchema(): ModuleSettingsSchema {
    return {
      maxRetries: 'number',
      maxTimeout: 'number',
    };
  }

  public getDefaultSettings(): AntiBlockLagSettings {
    return {
      maxRetries: 2,
      maxTimeout: 1000,
    };
  }

  public init(): void {
    this.player.proxy.on('fromClient', ({ data, name }) => {
      if (!this.enabled || this.player.status?.mode === 'LOBBY') return;

      if (name === 'block_place') {
        const realBlockLocation = {
          x: data.location.x,
          y: data.location.y,
          z: data.location.z,
        };

        switch (data.direction) {
          case 0:
            realBlockLocation.x = data.location.x - 1;
            break;
          case 1:
            realBlockLocation.y = data.location.y + 1;
            break;
          case 2:
            realBlockLocation.z = data.location.z - 1;
            break;
          case 3:
            realBlockLocation.z = data.location.z + 1;
            break;
          case 4:
            realBlockLocation.x = data.location.x - 1;
            break;
          case 5:
            realBlockLocation.x = data.location.x + 1;
            break;
          default:
            break;
        }

        if (realBlockLocation.x === -1 && realBlockLocation.y === -1 && realBlockLocation.z === -1) return;

        const key = realBlockLocation.x + ',' + realBlockLocation.y + ',' + realBlockLocation.z;
        if (!this.items.has(key)) {
          this.items.set(key, { id: (data.heldItem.blockId << 4) | ((data.heldItem.itemDamage ?? 0) & 15), tries: 0, packet: data });
          setTimeout(() => this.items.delete(key), this.settings.maxTimeout);
        }
      }
    });

    this.player.proxy.on('fromServer', ({ data, name }) => {
      if (!this.enabled || this.player.status?.mode === 'LOBBY') return;

      if (name === 'block_change') {
        const key = data.location.x + ',' + data.location.y + ',' + data.location.z;
        if (this.items.has(key) && data.type === 0) {
          const item = this.items.get(key)!;

          if (item.tries < this.settings.maxRetries) {
            this.player.server?.write('block_place', item.packet);
            item.tries += 1;
            return false;
          } else this.items.delete(key);
        }
      }
    });
  }
}

export interface AntiBlockLagSettings extends ModuleSettings {
  maxRetries: number;
  maxTimeout: number;
}
