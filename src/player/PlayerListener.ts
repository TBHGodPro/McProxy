import { EventEmitter } from 'node:events';
import TypedEmitter from 'typed-emitter';
import { Direction, ListenerEvents, Location } from '../Types';
import PlayerProxy from './PlayerProxy';
import Logger from '../utils/Logger';
import Player from './Player';
import { playerManager } from '..';
import { parseUUID } from '@minecraft-js/uuid';

export function parseLocation(data: Location) {
  return {
    ...data,
    x: data.x / 32,
    y: data.y / 32,
    z: data.z / 32,
  };
}
export function parseDirection(data: Direction) {
  data.pitch *= -1;

  while (data.pitch > 90) data.pitch -= 360;
  while (data.pitch < -90) data.pitch += 360;

  data.yaw *= -1;

  while (data.yaw >= 360) data.yaw -= 360;
  while (data.yaw < 0) data.yaw += 360;

  return {
    yaw: data.yaw,
    pitch: data.pitch,
  };
}

export default class PlayerListener extends (EventEmitter as new () => TypedEmitter<ListenerEvents>) {
  public constructor(proxyHandler: PlayerProxy, player: Player) {
    super();

    this.setMaxListeners(0);

    proxyHandler.on('start', (toClient, toServer) => this.emit('switch_server', toServer));

    proxyHandler.on('fromServer', ({ name, data }) => {
      (async () => {
        if (name === 'map_chunk') {
          // player.anvil.saveRaw(data.x, data.z, data.chunkData);
        }

        if (name === 'map_chunk_bulk') {
          // Logger.warn('MAP CHUNK BULK RECEIVED, NO HANDLING');
        }

        if (name === 'chat') {
          try {
            // Server Full
            // Triggered when a message like "has joined (X/X)!"
            if (data.message.startsWith('{"italic":false,"extra":[{"color":"yellow","text":""}') && data.message.endsWith('"},{"text":""},{"bold":false,"italic":false,"underlined":false,"obfuscated":false,"strikethrough":false,"text":""},{"color":"yellow","text":")!"},{"color":"yellow","text":""}],"text":""}')) {
              const message: string = JSON.parse(data.message)
                .extra.map((element: any) => element.text)
                .join('');
              if (message.match(/\(([0-99]*)\/\1\)/g)) {
                const string = message.match(/\(([0-99]*)\/\1\)/g)![0].replace(/\D/g, '');
                const maxPlayers = parseInt(string.substring(0, string.length / 2));
                await new Promise(resolve => setTimeout(resolve, 250));
                this.emit('server_full', maxPlayers);
              }
            }
          } catch (error) {
            Logger.error("Couldn't parse chat packet", error);
          }
        }

        if (name === 'named_entity_spawn') {
          this.emit('player_spawn', parseUUID(data.playerUUID).toString(true), data.entityId, parseLocation(data));
        }

        if (name === 'player_info' && data.action === 0) {
          for (const player of data.data.filter(i => i.UUID && i.name)) this.emit('player_join', parseUUID(player.UUID).toString(true), player.name ?? (await playerManager.fetchUUID(player.UUID))?.username);
        }

        if (name === 'scoreboard_team') {
          switch (data.mode) {
            case 0:
              this.emit('team_create', data.team);
              break;
            case 1:
              this.emit('team_delete', data.team);
              break;
            case 2:
              this.emit('team_edit', data);
              break;
            case 3:
              this.emit('team_player_add', data.team, data.players);
            default:
              break;
          }
        }

        if (name === 'chat' && data.position == 2) {
          this.emit('action_bar', JSON.parse(data.message));
        }

        if (name === 'title' && data.action === 2) {
          this.emit('title', data.action, data.text, data.fadeIn, data.stay, data.fadeOut);
        }

        if (name === 'entity_destroy') for (const id of data.entityIds) this.emit('player_leave', id);

        if (name === 'entity_teleport') {
          this.emit('entity_teleport', data.entityId, parseLocation(data), data.onGround);
          if (data.yaw && data.pitch) {
            this.emit('entity_look', data.entityId, parseDirection(data), { yaw: data.yaw, pitch: data.pitch });
          }
        }
        if (name === 'rel_entity_move' || name === 'entity_move_look') {
          this.emit(
            'entity_move',
            data.entityId,
            parseLocation({
              x: data.dX,
              y: data.dY,
              z: data.dZ,
            }),
            data.onGround
          );
        }
        if (name === 'entity_look' || name === 'entity_move_look') {
          this.emit('entity_look', data.entityId, parseDirection(data), { yaw: data.yaw, pitch: data.pitch }, data.onGround);
        }

        if (name === 'entity_velocity') {
          this.emit(
            'entity_velocity',
            data.entityId,
            parseLocation({
              x: data.velocityX,
              y: data.velocityY,
              z: data.velocityZ,
            })
          );
        }

        if (name === 'position') {
          this.emit('client_move', {
            x: data.flags & 0x01 ? player.location.x + data.x : data.x,
            y: data.flags & 0x02 ? player.location.y + data.y : data.y,
            z: data.flags & 0x04 ? player.location.z + data.z : data.z,
          });
          if (data.yaw && data.pitch) {
            const yaw = data.flags & 0x08 ? player.rawDirection.yaw + data.yaw : data.yaw;
            const pitch = data.flags & 0x10 ? player.rawDirection.pitch + data.pitch : data.pitch;

            this.emit('client_face', parseDirection({ yaw, pitch }), { yaw, pitch });
          }
        }

        if (name === 'update_health') {
          this.emit('player_state', {
            health: data.health,
            food: data.food,
            saturation: data.foodSaturation,
          });
        }

        if (name === 'scoreboard_score' && data.action === 0 && ['health', 'health_tab'].includes(data.scoreName) && data.itemName !== player.username) {
          this.emit('health', data.itemName, data.value);
        }

        // if (name === 'set_slot' && data.windowId === 0) {
        //   player.inventory.updateSlot(
        //     data.slot,
        //     // @ts-ignore
        //     new (Item('1.8.9'))(data.item.blockId, data.item.itemCount, data.item.itemDamage, data.item.nbtData, null, true)
        //   );
        // }
      })();
    });

    proxyHandler.on('fromClient', ({ name, data }) => {
      if (name === 'position' || name === 'position_look') {
        this.emit(
          'client_move',
          {
            x: data.x,
            y: data.y,
            z: data.z,
          },
          data.onGround
        );
      }
      if (name === 'look' || name === 'position_look') {
        this.emit(
          'client_face',
          parseDirection(data),
          {
            yaw: data.yaw,
            pitch: data.pitch,
          },
          data.onGround
        );
      }

      if (name === 'entity_action' && [0, 1].includes(data.actionId)) this.emit('client_crouch', data.actionId === 0);

      // if (name === 'window_click') {
      //   player.inventory.acceptClick(
      //     {
      //       mode: data.mode,
      //       mouseButton: data.mouseButton,
      //       slot: data.slot,
      //     },
      //     0
      //   );
      // }
    });
  }
}
