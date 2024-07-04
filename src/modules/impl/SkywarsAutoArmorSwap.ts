import { Slot, emptyItem } from '../../PacketTypings';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class SkywarsAutoArmorSwapModule extends Module<SkywarsAutoArmorSwapSettings> {
  public getModuleInfo(): ModuleInfo {
    return {
      id: 'skywarsAutoArmorSwap',
      name: 'Skywars Auto Armor Swap',
      description: 'Automatically swap armor in skywars and skywars duels',
      version: '1.0.0',
      author: 'TBHGodPro',
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      usePause: 'boolean',
      minProtForUpgrade: {
        type: 'range',
        min: 1,
        max: 4,
      },
    };
  }

  getDefaultSettings(): SkywarsAutoArmorSwapSettings {
    return {
      usePause: true,
      minProtForUpgrade: 2,
    };
  }

  private wasActive = false;
  private wearing = {
    helmet: null as (Piece & { raw: Slot }) | null,
    chestplate: null as (Piece & { raw: Slot }) | null,
    leggings: null as (Piece & { raw: Slot }) | null,
    boots: null as (Piece & { raw: Slot }) | null,
  };

  private lastAction = 0;

  private isSwitching = false;

  private readonly baseIDs: { [key in ArmorType]: number } = {
    leather: 298,
    gold: 314,
    chain: 302,
    iron: 306,
    diamond: 310,
  } as const;
  private readonly offsets = ['helmet', 'chestplate', 'leggings', 'boots'] as const;

  private getPiece(item: Slot): Piece | null {
    const id = item.blockId;

    if (id === -1) return null;

    for (const base in this.baseIDs) {
      if ([id, id - 1, id - 2, id - 3].includes((this.baseIDs as any)[base]))
        return {
          type: base as ArmorType,
          piece: this.offsets[id - (this.baseIDs as any)[base]],
          prot:
            // @ts-ignore
            item.nbtData?.value?.ench?.value?.value?.find(i => i?.id?.value === 0)?.lvl?.value ?? 0,
        };
    }

    return null;
  }

  private readonly priority = ['leather', 'gold', 'chain', 'iron', 'diamond'] as ArmorType[];

  private getBest(...items: Piece[]): Piece {
    let best = null;
    let bestVal = -1;

    for (const item of items) {
      if (!item) continue;

      let val = this.priority.indexOf(item.type);

      let protAdd = item.prot / this.settings.minProtForUpgrade;
      if (protAdd < 1) protAdd = 0;

      val += protAdd;

      if (val > bestVal) {
        bestVal = val;
        best = item;
      }
    }

    return best!;
  }

  init(): void {
    this.player.proxy.on('fromServer', ({ data: packet, name }, toClient, toServer) => {
      const isInSkywars = (this.player.status?.game?.code === 'SKYWARS' && this.player.status?.mode !== 'LOBBY') || this.player.isInGameMode('DUELS_SKYWARS_');
      if (!isInSkywars) {
        if (this.wasActive) {
          this.wasActive = false;
        }
        return true;
      }

      if (name === 'set_slot' && packet.windowId === 0) {
        // console.log(packet);
        if ([5, 6, 7, 8].includes(packet.slot)) {
          (this.wearing as any)[this.offsets[packet.slot - 5]] = {
            ...this.getPiece(packet.item),
            raw: packet.item,
          };
          // console.log(wearing);
        } else if (this.enabled) {
          const item = this.getPiece(packet.item);

          if (!item) return;

          const best = this.getBest(item, (this.wearing as any)[item.piece]);

          if (best !== this.wearing[item.piece]) {
            // console.log('REPLACE', wearing[item.piece], 'WITH', best);
            const hasItem = !!this.wearing[item.piece];

            if (this.settings.usePause) this.isSwitching = true;

            this.wearing[item.piece] = {
              ...item,
              raw: packet.item,
            };

            setTimeout(() => {
              toClient.write('set_slot', {
                windowId: 0,
                slot: 5 + this.offsets.indexOf(best.piece),
                item: packet.item,
              });
              toClient.write('set_slot', {
                windowId: 0,
                slot: packet.slot,
                item: hasItem ? (this.wearing as any)[item.piece].raw : emptyItem,
              });

              if (packet.slot >= 36 && packet.slot <= 44) {
                toServer.write('window_click', {
                  windowId: 0,
                  slot: 5 + this.offsets.indexOf(best.piece),
                  mouseButton: packet.slot - 36,
                  action: this.lastAction + 1,
                  mode: 2,
                  item: emptyItem,
                });
                this.lastAction += 1;
              } else {
                // toServer.write('window_click', {
                //   windowId: 0,
                //   slot: packet.slot,
                //   mouseButton: 4,
                //   action: lastAction + 1,
                //   mode: 2,
                //   item: Item.emptyItem,
                // });
                // toServer.write('window_click', {
                //   windowId: 0,
                //   slot: 5 + offsets.indexOf(best.piece),
                //   mouseButton: 4,
                //   action: lastAction + 2,
                //   mode: 2,
                //   item: Item.emptyItem,
                // });
                // lastAction += 2;

                toServer.write('window_click', {
                  windowId: 0,
                  slot: packet.slot,
                  mouseButton: 0,
                  action: this.lastAction + 1,
                  mode: 0,
                  item: packet.item,
                });
                toServer.write('window_click', {
                  windowId: 0,
                  slot: 5 + this.offsets.indexOf(best.piece),
                  mouseButton: 0,
                  action: this.lastAction + 2,
                  mode: 0,
                  item: hasItem ? (this.wearing as any)[item.piece].raw : emptyItem,
                });
                if (hasItem)
                  toServer.write('window_click', {
                    windowId: 0,
                    slot: packet.slot,
                    mouseButton: 0,
                    action: this.lastAction + 3,
                    mode: 0,
                    item: emptyItem,
                  });
                this.lastAction += 3;
              }

              setTimeout(() => {
                this.isSwitching = false;
              }, 500);
            }, 0);
            return false;
          }
        }
      }
    });

    this.player.proxy.on('fromClient', ({ data, name }, toClient) => {
      if (name === 'window_click' && data.action) this.lastAction = data.action;
      if (name === 'position' || name === 'position_look' || name === 'look') {
        if (this.isSwitching) return false;
      }
    });

    this.player.listener.on('client_move', location => {
      if (this.isSwitching)
        this.player.client?.write('position', {
          ...(this.player.lastLocation ?? location),
          yaw: this.player.direction.yaw,
          pitch: this.player.direction.pitch,
          flags: 0,
        });
    });
  }
}

interface SkywarsAutoArmorSwapSettings extends ModuleSettings {
  usePause: boolean;
  minProtForUpgrade: number;
}

type ArmorPiece = 'helmet' | 'chestplate' | 'leggings' | 'boots';
type ArmorType = 'leather' | 'gold' | 'chain' | 'iron' | 'diamond';
interface Piece {
  type: ArmorType;
  piece: ArmorPiece;
  prot: number;
}
