import { Direction, IPlayer, Location, Party } from '../../Types';
import { playerManager } from '../..';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { Position } from '../../PacketTypings';
import { parseUUID, UUID } from '@minecraft-js/uuid';
import Utils from 'src/utils/Utils';
import Physics from 'src/utils/Physics';

export default class AntiSwing extends Module<AntiSwingSettings> {
  public getModuleInfo(): ModuleInfo {
    return {
      id: 'antiSwing',
      name: 'Anti Swing',
      version: '1.0.0',
      description: 'Prevents swinging (so no hit delay)',
      author: 'TBHGodPro',
    };
  }

  public getSettingsSchema(): ModuleSettingsSchema {
    return {};
  }

  public getDefaultSettings(): AntiSwingSettings {
    return {};
  }

  public init(): void {
    const funcs: (() => void)[] = [];

    this.player.proxy.on('fromClient', ({ data, name }) => {
      if (!this.enabled) return;

      if (name === 'arm_animation') {
        let found = false;

        const func = () => {
          found = true;
          this.player.server?.write(name, data);
        };

        funcs.push(func);

        setTimeout(() => {
          if (found === false) funcs.shift();
        }, 100);

        return false;
      }

      if (name === 'use_entity' || (name === 'block_dig' && data.status === 0) || name === 'block_place') {
        funcs.shift()?.();
      }
    });
  }
}

export interface AntiSwingSettings extends ModuleSettings {}
