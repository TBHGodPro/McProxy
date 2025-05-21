import { UUID, parseUUID } from '@minecraft-js/uuid';
import { playerManager } from '../../';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { Position } from 'src/PacketTypings';
import { parseLocation } from 'src/player/PlayerListener';

export default class MurderMysteryCheatsModule extends Module<MurderMysteryCheatsSettings> {
  private readonly roles: Map<string, Role> = new Map();
  private readonly possibleDeaths: Map<number, Position> = new Map();
  private readonly bowWapoints: Map<number, string> = new Map();
  private readonly possibleBows: Map<number, Position> = new Map();

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'murderMysteryCheats',
      name: 'Murder Mystery Cheats',
      description: 'Assortment of Cheats for Murder Mystery',
      version: '1.0.0',
      author: 'TBHGodPro',
    };
  }

  getDefaultSettings(): MurderMysteryCheatsSettings {
    return {
      showNametags: true,
      reveals: true,
      highlights: true,
      deathNotifs: true,
      bowFind: true,
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      showNametags: 'boolean',
      reveals: 'boolean',
      highlights: 'boolean',
      deathNotifs: 'boolean',
      bowFind: 'boolean',
    };
  }

  init(): void {
    this.player.proxy.on('fromServer', ({ data, name }) => {
      if (!this.enabled || !this.player.isInGameMode('MURDER_')) return this.roles.clear();

      if (this.settings.showNametags && name === 'scoreboard_team' && data.mode === 2 && data.nameTagVisibility === 'never') {
        this.player.client?.write(name, {
          ...data,
          nameTagVisibility: 'always',
        });
        return false;
      }

      if (this.settings.reveals && name === 'entity_equipment') {
        if (/*data.item.blockId === 261*/ (data.item?.nbtData?.value as any)?.display?.value?.Name?.value?.toUpperCase()?.includes('BOW') || (data.item?.nbtData?.value as any)?.ExtraAttributes?.value?.detectiveBow?.value == 1) {
          const target = this.player.connectedPlayers.find(i => i.entityId === data.entityId);
          if (!target) return;

          const uuid = parseUUID(target.uuid).toString(true);
          if (this.roles.get(uuid) !== Role.DETECTIVE && this.roles.get(uuid) !== Role.MURDERER) {
            if ((data.item?.nbtData?.value as any)?.ExtraAttributes?.value?.detectiveBow?.value == 1) {
              this.roles.set(uuid, Role.DETECTIVE);

              this.player.apollo.showNotification('DETECTIVE', target.name ? `${target.name} is a detective!` : 'A detective has been identified!', { durationMS: 3500 });
            } else if (this.roles.get(uuid) !== Role.BOW) {
              this.roles.set(uuid, Role.BOW);

              this.player.apollo.showNotification('BOW', target.name ? `${target.name} has a bow!` : 'A Player has a bow!', { durationMS: 2000 });
            }
          }
        }

        if (/*knives.includes(data.item.blockId)*/ (data.item?.nbtData?.value as any)?.ExtraAttributes?.value?.KNIFE?.value == 1) {
          const target = this.player.connectedPlayers.find(i => i.entityId === data.entityId);
          if (!target) return;

          const uuid = parseUUID(target.uuid).toString(true);
          if (this.roles.get(uuid) !== Role.DETECTIVE && this.roles.get(uuid) !== Role.MURDERER) {
            this.roles.set(uuid, Role.MURDERER);

            this.player.apollo.showNotification('MURDERER', target.name ? `${target.name} is the Murderer!` : 'The Murderer has been Identified!', { durationMS: 2000 });

            this.player.sendMessage(`\n§l§cMURDERER§l§7: ${target.name ? `§6${target.name} §r§fis the Murderer!` : '§r§fThe Murderer has been identified!'}\n`);
          }
        }
      }

      if (name === 'spawn_entity' && data.entityId > 1000) {
        this.possibleDeaths.set(
          data.entityId,
          parseLocation({
            x: data.x,
            y: data.y,
            z: data.z,
          })
        );
      }

      if (name === 'entity_teleport' && this.possibleDeaths.has(data.entityId)) {
        const d = parseLocation(data);
        this.possibleDeaths.get(data.entityId)!.x = d.x;
        this.possibleDeaths.get(data.entityId)!.y = d.y;
        this.possibleDeaths.get(data.entityId)!.z = d.z;
      }

      if ((name === 'rel_entity_move' || name === 'entity_move_look') && this.possibleDeaths.has(data.entityId)) {
        const d = parseLocation({
          x: data.dX,
          y: data.dY,
          z: data.dZ,
        });
        this.possibleDeaths.get(data.entityId)!.x += d.x;
        this.possibleDeaths.get(data.entityId)!.y += d.y;
        this.possibleDeaths.get(data.entityId)!.z += d.z;
      }

      if (this.settings.bowFind && name === 'entity_equipment' && this.possibleDeaths.has(data.entityId) && data.item.blockId === 261) {
        this.player.apollo.addWaypoint({
          color: this.getRoleColor(Role.DETECTIVE),
          hidden: false,
          location: {
            world: 'world',
            x: Math.floor(this.possibleDeaths.get(data.entityId)!.x),
            y: Math.floor(this.possibleDeaths.get(data.entityId)!.y),
            z: Math.floor(this.possibleDeaths.get(data.entityId)!.z),
          },
          name: `Bow (${data.entityId})`,
          preventRemoval: false,
        });
        this.bowWapoints.set(data.entityId, `Bow (${data.entityId})`);
      }

      if (this.settings.deathNotifs && name === 'entity_metadata' && data.metadata.find(i => i.type === 4 && i.key === 2 && i.value.toLowerCase().includes('last words'))) {
        const item = data.metadata.find(i => i.type === 4 && i.key === 2 && i.value.toLowerCase().includes('last words'));

        const reg = /(§.| )(.*)§e's/.exec(item!.value as string);
        const name = reg?.[2];

        if (name) {
          (async () => {
            const player = await playerManager.fetchUsername(name);

            if (!player || !this.roles.has(player.uuid) || this.roles.get(player.uuid) === Role.DEAD) return;

            if (this.roles.get(player.uuid) === Role.BOW) this.player.apollo.showNotification('BOW DEATH', `A person with a bow, ${player.username}, has died!`, { durationMS: 1500 });
            else if (this.roles.get(player.uuid) === Role.DETECTIVE) {
              this.player.apollo.showNotification('DETECTIVE DEATH', `A detective, ${player.username}, has died!`, { durationMS: 3000 });

              if (!this.possibleDeaths.has(data.entityId) && this.player.connectedPlayers.find(i => i.name == player.username)?.location) this.possibleDeaths.set(data.entityId, this.player.connectedPlayers.find(i => i.name == player.username)?.location!);
            } else if (this.roles.get(player.uuid) === Role.MURDERER) this.player.apollo.showNotification('MURDERER DEATH', `A murderer, ${player.username}, has died!`, { durationMS: 1500 });
            else this.player.apollo.showNotification('DEATH', `${player.username} has died!`, { durationMS: 1500 });

            this.roles.set(player.uuid, Role.DEAD);
          })();
        }
      }

      if (this.settings.bowFind && name === 'entity_destroy') {
        for (let i of data.entityIds) {
          if (this.bowWapoints.has(i)) {
            this.player.apollo.removeWaypoint(this.bowWapoints.get(i)!);
            this.bowWapoints.delete(i);
          }
        }
      }

      if (name === 'player_info' && data.action === 0) {
        for (const p of data.data) {
          const uuid = parseUUID(p.UUID).toString(true);
          if (!this.roles.has(uuid)) this.roles.set(uuid, Role.INNOCENT);
        }
      }
    });

    this.player.listener.on('switch_server', () => {
      if (this.enabled && this.settings.bowFind && this.roles.size) this.player.apollo.removeAllWaypoints();
      this.roles.clear();
      this.possibleDeaths.clear();
      this.bowWapoints.clear();
    });

    setInterval(() => {
      if (!this.enabled || !this.player.isInGameMode('MURDER_')) return this.roles.clear();
      if (!this.settings.highlights) return;

      this.roles.forEach((role, uuid) => {
        this.player.apollo.glowPlayer(parseUUID(uuid), this.getRoleColor(role));
      });
    }, 2000);
  }

  private getRoleColor(role: Role): number {
    switch (role) {
      case Role.NONE:
        return 0x000000;

      case Role.INNOCENT:
        return 0xffffff;

      case Role.DETECTIVE:
        return 0x1111dd;

      case Role.BOW:
        return 0x8888ff;

      case Role.MURDERER:
        return 0xff2222;

      case Role.DEAD:
        return 0x333333;
    }
  }
}

interface MurderMysteryCheatsSettings extends ModuleSettings {
  showNametags: boolean;
  reveals: boolean;
  highlights: boolean;
  deathNotifs: boolean;
  bowFind: boolean;
}

enum Role {
  NONE,
  INNOCENT,
  DETECTIVE,
  BOW,
  MURDERER,
  DEAD,
}

const knives = [
  267, 272, 256, 280, 271, 268, 32, 273, 369, 277, 406, 400, 285, 260, 421, 19, 398, 352, 391, 396, 357, 279, 175, 409, 364, 405, 366, 294, 351, 283, 276, 293, 359, 349, 351, 297, 333, 382, 340, 6, 286, 278, 284,

  // Disks
  2256, 2257, 2258, 2259, 2260, 2261, 2262, 2263, 2264, 2265, 2266, 2267,
];
