import { UUID, parseUUID } from '@minecraft-js/uuid';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class MurderMysteryCheatsModule extends Module<MurderMysteryCheatsSettings> {
  private readonly roles: Map<string, Role> = new Map();

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
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      showNametags: 'boolean',
      reveals: 'boolean',
      highlights: 'boolean',
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
        if (data.item.blockId === 261) {
          const target = this.player.connectedPlayers.find(i => i.entityId === data.entityId);
          if (!target) return;

          this.player.apollo.showNotification('Bow User', target.name ? `${target.name} has a bow!` : 'A Player has a bow!', { durationMS: 2000 });

          this.roles.set(parseUUID(target.uuid).toString(true), Role.BOW);
        }

        if (knives.includes(data.item.blockId)) {
          const target = this.player.connectedPlayers.find(i => i.entityId === data.entityId);
          if (!target) return;

          this.player.apollo.showNotification('Murderer', target.name ? `${target.name} is the Murderer!` : 'The Murderer has been Identified!', { durationMS: 2000 });

          this.roles.set(parseUUID(target.uuid).toString(true), Role.MURDERER);
        }
      }

      if (name === 'player_info' && data.action === 0) {
        for (const p of data.data) {
          const uuid = parseUUID(p.UUID).toString(true);
          if (!this.roles.has(uuid)) this.roles.set(uuid, Role.INNOCENT);
        }
      }
    });

    this.player.listener.on('switch_server', () => this.roles.clear());

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

      case Role.BOW:
        return 0x3333ff;

      case Role.MURDERER:
        return 0xff2222;
    }
  }
}

interface MurderMysteryCheatsSettings extends ModuleSettings {
  showNametags: boolean;
  reveals: boolean;
  highlights: boolean;
}

enum Role {
  NONE,
  INNOCENT,
  BOW,
  MURDERER,
}

const knives = [
  267, 272, 256, 280, 271, 268, 32, 273, 369, 277, 406, 400, 285, 260, 421, 19, 398, 352, 391, 396, 357, 279, 175, 409, 364, 405, 366, 283, 276, 293, 359, 349, 351, 333, 382, 340,

  // Disks
  2256, 2257, 2258, 2259, 2260, 2261, 2262, 2263, 2264, 2265, 2266, 2267,
];
