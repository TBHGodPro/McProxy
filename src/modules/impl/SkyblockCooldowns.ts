import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class SkyblockCooldownsModule extends Module<SkyblockCooldownsSettings> {
  public readonly cooldowns: { [key: string]: number } = {
    auroraStaff: 1_000,
  };

  private store: any = {};
  private activeCooldowns: any = {
    auroraStaff: false,
  };

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'skyblockCooldowns',
      name: 'Skyblock Cooldowns',
      description: 'Built-In Cooldowns for Skyblock',
      author: 'TBHGodPro',
      version: '1.0.0',
    };
  }

  getDefaultSettings(): SkyblockCooldownsSettings {
    return {
      auroraStaff: true,
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      auroraStaff: 'boolean',
    };
  }

  init(): void {
    let heldItemSlot: number = 36;
    this.player.proxy.on('fromClient', ({ name, data }) => {
      if (name == 'held_item_slot') heldItemSlot = data.slotId;
    });
    this.player.proxy.on('fromServer', ({ name, data }) => {
      if (name == 'held_item_slot') heldItemSlot = data.slot;
    });

    this.player.proxy.on('fromClient', ({ name, data }) => {
      if (!this.enabled) return true;

      if (name === 'block_place') {
        if (this.settings.auroraStaff && data.location.x == -1 && data.location.y == -1 && data.location.z == -1 && data.direction == -1 && data.heldItem.blockId == 369 && data?.heldItem?.nbtData?.value?.display?.value?.Name?.value?.includes?.('Aurora Staff')) {
          if (this.activeCooldowns.auroraStaff) {
            this.player.sendMessage('§cThis ability is on cooldown for 1s');
            return false;
          } else {
            this.activeCooldowns.auroraStaff = true;

            this.player.apollo.addCooldown({
              name: 'skyblock_arcane_zap',
              durationMS: this.cooldowns.auroraStaff,
              icon: {
                case: 'itemStack',
                value: {
                  case: 'itemId',
                  value: 369,
                },
              },
            });

            const started = Date.now();
            this.player.bossBar.setHealth(0);
            const interval = setInterval(() => {
              this.player.bossBar.setHealth(Math.min((Date.now() - started) / (this.cooldowns.auroraStaff / 300), 300));
            }, 25);
            setTimeout(() => {
              clearInterval(interval);

              this.player.bossBar.setHealth(300);

              this.activeCooldowns.auroraStaff = false;
            }, this.cooldowns.auroraStaff);
          }
        }
      }
    });
  }
}

export interface SkyblockCooldownsSettings extends ModuleSettings {
  auroraStaff: boolean;
}
