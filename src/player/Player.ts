import EventEmitter from 'events';
import { Client, ServerClient } from 'minecraft-protocol';
import { InstantConnectProxy } from 'prismarine-proxy';
import TypedEventEmitter from 'typed-emitter';
import PlayerProxy from './PlayerProxy';
import { Client as ModAPIClient } from 'hypixel-mod-api-js';
import { Player as ApolloPlayer } from 'lc-apollo-js';
import PlayerListener from './PlayerListener';
import { Status } from 'hypixel-api-reborn';
import { Direction, IPlayer, Location, Team } from '../Types';
import * as prismarineWindow from 'prismarine-windows';
import ModuleHandler from '../modules/ModuleHandler';

export default class Player extends (EventEmitter as new () => TypedEventEmitter<PlayerEvents>) {
  public readonly proxy: PlayerProxy;
  public readonly rawProxy: InstantConnectProxy;

  public readonly listener: PlayerListener;

  public readonly modules: ModuleHandler;

  public client: ServerClient | null = null;
  public server: Client | null = null;

  public readonly hypixel: ModAPIClient;
  public readonly apollo: ApolloPlayer;

  public lastGameMode: string | null = null;
  public online: boolean | null = null;
  public status: Status | null = null;
  public teams: Team[] = [];
  public connectedPlayers: IPlayer[] = [];
  public uuid: string | null = null;
  public location: Location | null = null;
  public lastLocation: Location | null = null;
  public direction: Direction | null = null;
  public rawDirection: Direction | null = null;
  // NOT USED - Will add once inventory lib gets fixed
  public readonly inventory: prismarineWindow.Window = prismarineWindow.default('1.8.9').createWindow(0, 'minecraft:inventory', 'Inventory');

  public get statusMessage(): string {
    return this.status?.online && this.status?.mode && this.status.game?.name
      ? `${
          this.status.mode.includes(this.status.game.name.toUpperCase())
            ? ''
            : `${
                // @ts-ignore
                this.status.game.name === 'Not Found' ? 'Main' : this.status.game.name
              } `
        }${
          this.status.mode
            ? `${hypixel.parseGameMode(
                this.status.game,
                this.status.mode
                  .split('_')
                  .filter(i => this.status?.game?.name.toUpperCase() != i)
                  .join('_')
              )}`
            : ''
        }${this.status.map ? ` on ${this.status.map}` : ''}`
      : 'Offline';
  }

  constructor(proxy: InstantConnectProxy) {
    super();

    // Classes

    this.rawProxy = proxy;
    this.proxy = new PlayerProxy(this);
    this.proxy.setup();

    this.listener = new PlayerListener(this.proxy);

    this.modules = new ModuleHandler(this);

    // APIs

    this.hypixel = new ModAPIClient((channel, buf) => {
      this.client?.write('custom_payload', {
        channel,
        data: Buffer.from(buf),
      });
    });
    // TODO : hypixel mod api integration

    this.apollo = new ApolloPlayer({
      handling: {
        registerPluginChannel: channel => {
          this.client?.write('custom_payload', {
            channel: 'REGISTER',
            data: Buffer.from(`${channel}\0`),
          });
        },
        sendPacket: (channel, buffer) => {
          if (!this.client) return false;
          this.client?.write('custom_payload', {
            channel: channel,
            data: buffer,
          });
          return true;
        },
      },
    });

    // Listener Events

    this.listener.on('switch_server', async () => {
      this.teams = [];
      this.connectedPlayers = [];
      this.inventory.clear();
      await this.refreshPlayerLocation();
    });

    this.listener.on('player_join', (uuid, name) => {
      if (uuid === this.uuid || this.connectedPlayers.find(i => i.uuid === uuid || i.name === name)) return;
      this.connectedPlayers.push({
        uuid,
        name,
      });
    });

    this.listener.on('player_spawn', (uuid, entityId, location) => {
      const p = this.connectedPlayers.find(v => v.uuid === uuid);
      if (p) {
        p.entityId = entityId;
        p.location = location;
      }
    });

    this.listener.on('entity_teleport', (entityId, location) => {
      const p = this.connectedPlayers.find(v => v.entityId === entityId);
      if (p) {
        p.location = location;
      }
    });
    this.listener.on('entity_move', (entityId, difference) => {
      const p = this.connectedPlayers.find(v => v.entityId === entityId);
      if (p) {
        p.location ??= {
          x: 0,
          y: 0,
          z: 0,
        };
        p.location.x += difference.x;
        p.location.y += difference.y;
        p.location.z += difference.z;
      }
    });

    this.listener.on('player_leave', entityId => {
      const p = this.connectedPlayers.findIndex(v => v.entityId === entityId);
      if (p !== -1) this.connectedPlayers.splice(p, 1);
    });

    this.listener.on('client_move', location => {
      this.lastLocation = this.location;
      this.location = location;
    });
    this.listener.on('client_face', (direction, raw) => {
      this.direction = direction;
      this.rawDirection = raw;
    });

    this.listener.on('team_create', name => {
      if (!this.teams.find(team => team.name === name))
        this.teams.push({
          name,
          players: [],
        });
    });
    this.listener.on('team_delete', name => {
      const team = this.teams.find(team => team.name === name);
      if (team) this.teams.splice(this.teams.indexOf(team), 1);
    });
    this.listener.on('team_player_add', (name, players) => {
      const team = this.teams.find(team => team.name === name);
      if (team) team.players.push(...players);
      else this.teams.push({ name, players });
    });

    // Load Modules

    this.modules.loadAll([ModuleHandler.implDIR]); // TODO: custom module paths
  }

  public connect(toClient: ServerClient, toServer: Client) {
    this.client = toClient;
    this.server = toServer;
    this.uuid = this.client.uuid;
    this.lastGameMode = null;
    this.online = true;
    this.status = null;
    this.teams = [];

    this.refreshPlayerLocation();

    this.proxy.setup();

    this.modules.connect();
  }

  public disconnect() {
    this.client = null;
    this.server = null;
    this.uuid = null;
    this.lastGameMode = null;
    this.online = false;
    this.status = null;
    this.teams = [];

    this.modules.disconnect();
  }

  public async refreshPlayerLocation(): Promise<void> {
    if (!this.uuid) return;
    await hypixel
      .fetchPlayerLocation(this.uuid)
      .then(status => {
        this.status = status;
        if (this.status.mode !== 'LOBBY') this.lastGameMode = this.status.mode ?? null;
      })
      .catch(() => {
        this.status = null;
      });
  }
}

export type PlayerEvents = {};
