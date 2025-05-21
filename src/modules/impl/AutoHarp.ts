import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class AutoHarpModule extends Module<AutoHarpSettings> {
  public getModuleInfo(): ModuleInfo {
    return {
      id: 'autoHarp',
      name: 'Auto Harp',
      author: 'TBHGodPro',
      version: '1.0.0',
      description: 'Automatic Skyblock Harp',
    };
  }

  getDefaultSettings(): AutoHarpSettings {
    return {
      pingSafeArea: 400,
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      pingSafeArea: 'number',
    };
  }

  init(): void {
    const isEnabled = () => this.enabled;

    const notifItem = {
      blockId: 399,
      itemCount: 1,
      itemDamage: 0,
      nbtData: {
        type: 'compound',
        name: '',
        value: {
          display: {
            type: 'compound',
            value: {
              Name: {
                type: 'string',
                value: '§6Handled by §6MC§fProxy!',
              },
            },
          },
          ench: {
            type: 'list',
            value: {
              type: 'end',
              value: [],
            },
          },
        },
      },
    };

    let windowId: null | number = null,
      lastAction: null | number = null;

    this.player.proxy.on('fromClient', ({ data, name }, toClient) => {
      if (name === 'window_click') lastAction = data.action;

      if (!isEnabled()) return true;

      if (name === 'window_click' && data.windowId === windowId) {
        if (data.slot === 22) {
          toClient.write('set_slot', {
            windowId: -1,
            slot: -1,
            item: {
              blockId: -1,
            },
          });
          toClient.write('set_slot', {
            windowId,
            slot: 22,
            item: notifItem as any,
          });
        }
        return false;
      }
      if (name === 'close_window' && data.windowId === windowId) windowId = null;
    });

    this.player.proxy.on('fromServer', ({ data, name }, toClient, toServer) => {
      if (!isEnabled()) return true;

      if (name === 'open_window' && data.windowTitle?.includes?.('Harp - ')) {
        windowId = data.windowId;
        lastAction = (data as any).action;
      }
      if (name === 'close_window' && data.windowId === windowId) windowId = null;

      if (name === 'window_items' && data.windowId === windowId) {
        toClient.write('window_items', {
          windowId,
          items: [
            ...[...Array(22)].map(i => ({
              blockId: -1,
              itemCount: undefined,
              itemDamage: undefined,
              nbtData: undefined,
            }) as any),
            notifItem,
          ],
        });
        return false;
      }

      if (name === 'set_slot' && data.windowId === windowId && data.slot > 36 && data.slot < 44 && data.item.blockId === 155) {
        toServer.write('window_click', {
          windowId,
          slot: data.slot,
          mouseButton: 2,
          action: lastAction! + 1,
          mode: 3,
          item: data.item,
        });
        lastAction!++;

        let next = true;
        const pingList = ({ data: dat, name: nam }: any) => {
          if (nam === 'set_slot' && dat.windowId === windowId && dat.slot === data.slot && dat.item.blockId !== 155) next = false;
        };
        this.player.proxy.on('fromServer', pingList);
        setTimeout(() => {
          if (next) {
            toServer.write('window_click', {
              windowId: windowId!,
              slot: data.slot,
              mouseButton: 2,
              action: lastAction! + 1,
              mode: 3,
              item: data.item,
            });
            lastAction!++;
          }
          this.player.proxy.off('fromServer', pingList);
        }, this.settings.pingSafeArea);
      }
      if (name === 'set_slot' && data.windowId === windowId) return false;
    });
  }
}

export interface AutoHarpSettings extends ModuleSettings {
  pingSafeArea: number;
}
