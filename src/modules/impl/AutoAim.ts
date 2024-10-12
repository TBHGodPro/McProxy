import { Direction, IPlayer, Location, Party } from '../../Types';
import { playerManager } from '../../';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { Position } from '../../PacketTypings';
import { parseUUID, UUID } from '@minecraft-js/uuid';
import Utils from 'src/utils/Utils';
import Physics from 'src/utils/Physics';

export default class AutoAimModule extends Module<AutoAimSettings> {
  public static readonly SEARCH_INTERVAL = 0.5;
  public static readonly MAX_RANGE = 100;

  private color: number = 0xffffff;

  private focus: UUID | null = null;
  private lastFocus: UUID | null = null;
  private target: Location | null = null;

  private shotStart: number | null = null;

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'autoAim',
      name: 'Auto Aim',
      version: '1.0.0',
      description: 'Automatically aims the bow when shooting',
      author: 'TBHGodPro',
    };
  }

  public getSettingsSchema(): ModuleSettingsSchema {
    return {
      highlightTarget: 'boolean',
      highlightColor: 'string',
    };
  }

  public getDefaultSettings(): AutoAimSettings {
    return {
      highlightTarget: true,
      highlightColor: 'FFFFFF',
    };
  }

  public verifySettings(settings: AutoAimSettings): boolean {
    if (settings.highlightColor.length !== 6) return false;
    try {
      eval(`0x${settings.highlightColor}`);
      return true;
    } catch {
      return false;
    }
  }

  public updateSettings(settings: AutoAimSettings): void {
    this.color = eval(`0x${settings.highlightColor}`);
  }

  public init(): void {
    this.player.proxy.on('fromClient', ({ data, name }) => {
      if (name === 'block_place' && data.heldItem.blockId === 261) this.shotStart = Date.now();

      if (name === 'block_dig' && data.status === 5 && this.shotStart) {
        const loadTime = Date.now() - this.shotStart;
        this.shotStart = null;

        if (this.target) {
          const power = Math.min(loadTime, 1200) / 1200;

          const dir = Physics.getNeededArrowAngle(
            {
              x: this.player.location.x,
              y: this.player.location.y + 0.6,
              z: this.player.location.z,
            },
            {
              x: this.target.x,
              y: this.target.y,
              z: this.target.z,
            },
            power
          );
          dir.pitch *= -1;

          // this.player.client?.write('position', {
          //   flags: 0,
          //   ...this.player.location,
          //   ...dir,
          // });
          this.player.server?.write('position_look', {
            onGround: this.player.onGround,
            ...this.player.location,
            ...dir,
          });
          this.player.server?.write('block_dig', data);

          return false;
        }
      }
    });
    setInterval(() => {
      const dir = this.player.direction;
      let player: IPlayer | undefined;
      let pos: Location = this.player.location;
      let traveled = 0;

      while (!player && traveled < AutoAimModule.MAX_RANGE) {
        const dist = traveled == 0 ? AutoAimModule.SEARCH_INTERVAL * 10 : AutoAimModule.SEARCH_INTERVAL;

        traveled += dist;

        const newPos = {
          x: pos.x + dist * Math.sin(Utils.toRadians(dir.yaw)) * Math.cos(Utils.toRadians(dir.pitch)),
          y: pos.y + dist * Math.sin(Utils.toRadians(dir.pitch)),
          z: pos.z + dist * Math.cos(Utils.toRadians(dir.yaw)) * Math.cos(Utils.toRadians(dir.pitch)),
        };

        pos = newPos;

        player = this.player.connectedPlayers.find(i => i.location && i.uuid && i.name && Utils.isNear(i.location, pos, 5));
      }

      if (player) {
        const uuid = parseUUID(player.uuid);

        if (uuid.toString(true) != this.focus?.toString(true)) {
          this.lastFocus = this.focus;
          this.focus = uuid;

          if (this.settings.highlightTarget) {
            if (this.lastFocus) this.player.apollo.removeGlow(this.lastFocus);
            this.player.apollo.glowPlayer(this.focus, this.color);
          }
        }

        this.target = player.location!;
      }
    }, 1000 / 5);
  }
}

export interface AutoAimSettings extends ModuleSettings {
  highlightTarget: boolean;
  highlightColor: string;
}
