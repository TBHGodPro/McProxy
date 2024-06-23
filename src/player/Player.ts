import EventEmitter from 'events';
import { Client, ServerClient } from 'minecraft-protocol';
import { InstantConnectProxy } from 'prismarine-proxy';
import TypedEventEmitter from 'typed-emitter';
import PlayerProxy from './PlayerProxy';
import { Client as ModAPIClient } from 'hypixel-mod-api-js';
import { Player as ApolloPlayer } from 'lc-apollo-js';
import PlayerListener from './PlayerListener';
import { Status } from 'hypixel-api-reborn';
import { Direction, IPlayer, Location, Party, Team } from '../Types';
import * as prismarineWindow from 'prismarine-windows';
import ModuleHandler from '../modules/ModuleHandler';
import CommandHandler from '../commands/CommandHandler';
import { setTimeout as wait } from 'timers/promises';

export default class Player extends (EventEmitter as new () => TypedEventEmitter<PlayerEvents>) {
  public readonly proxy: PlayerProxy;
  public readonly rawProxy: InstantConnectProxy;

  public readonly listener: PlayerListener;

  public readonly modules: ModuleHandler;
  public readonly commands: CommandHandler;

  public client: ServerClient | null = null;
  public server: Client | null = null;

  public readonly hypixel: ModAPIClient;
  public readonly apollo: ApolloPlayer;

  public lastGameMode: string | null = null;
  public isHypixel: boolean = false;
  public online: boolean | null = null;
  public status: Status | null = null;
  public teams: Team[] = [];
  public party: Party = { inParty: false, members: new Map() };
  public connectedPlayers: IPlayer[] = [];
  public uuid: string | null = null;
  public get username(): string | null {
    return this.client?.username ?? null;
  }
  public location: Location = { x: 0, y: 0, z: 0 };
  public lastLocation: Location = { x: 0, y: 0, z: 0 };
  public direction: Direction = { yaw: 0, pitch: 0 };
  public rawDirection: Direction = { yaw: 0, pitch: 0 };
  // NOT USED - Will add once inventory lib gets fixed
  public readonly inventory: prismarineWindow.Window = prismarineWindow.default('1.8.9').createWindow(0, 'minecraft:inventory', 'Inventory');

  public get isConnected(): boolean {
    return !!this.client;
  }

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
    this.commands = new CommandHandler();

    // APIs

    this.hypixel = new ModAPIClient({
      send: (channel, buf) => {
        this.server?.write('custom_payload', {
          channel,
          data: buf,
        });
      },
      debug: false,
      maxPingTimeout: 5_000,
    });
    this.hypixel.on('hello', async () => {
      await wait(500);
      Logger.info('Connected to Hypixel!');
      this.isHypixel = true;
      this.hypixel.register(['hyevent:location']);
      this.hypixel.ping(false).then(res => {
        Logger.debug('Ping to Hypixel is ' + res.displayPingMS + 'ms');
      });
    });
    this.hypixel.on('LOCATION', data => {
      this.status = new Status({
        online: true,
        gameType: data.serverType?.name,
        mode: data.mode ?? (data.lobbyName ? 'LOBBY' : null),
        map: data.map,
      });
    });
    this.hypixel.on('partyInfo', party => {
      this.party = party;
    });
    setInterval(() => {
      if (!this.isHypixel) return;
      this.hypixel.getPartyInfo(2000);
    }, 2000);

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

    this.proxy.on('fromServer', ({ data, name }) => {
      if (name === 'player_info' && data.action === 2 && data.data.find(i => i.UUID === this.uuid)) {
        setTimeout(() => this.hypixel.setConnected(true), 1000);
      }
      if (name !== 'custom_payload') return;

      if (data.channel.trim().toLowerCase().startsWith('hy')) this.hypixel.receivePacket(data.channel, data.data);
    });
    this.proxy.on('fromClient', ({ data, name }) => {
      if (name !== 'custom_payload') return;

      if (data.channel.trim().toLowerCase() === 'lunar:apollo') this.apollo.receivePacket(data.data);
    });

    // Listener Events

    this.listener.on('switch_server', async () => {
      this.hypixel.setConnected(false);
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

    // Load Features

    this.commands.loadAll([CommandHandler.implDIR]); // TODO: custom command paths
    this.modules.loadAll([ModuleHandler.implDIR]); // TODO: custom module paths

    this.commands.setup(this);
  }

  public connect(toClient: ServerClient, toServer: Client) {
    this.isHypixel = false;
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

    this.apollo.connect();
    this.apollo.configureSettings(
      {
        target: 'staff_mod',
        case: 'apolloModule',
        enabled: true,
      },
      {
        target: 'notification',
        case: 'apolloModule',
        enabled: true,
      },
      {
        target: 'team',
        case: 'apolloModule',
        enabled: true,
      },
      {
        target: 'glow',
        case: 'apolloModule',
        enabled: true,
      },
      {
        target: 'cooldown',
        case: 'apolloModule',
        enabled: true,
      }
    );
  }

  public disconnect() {
    this.isHypixel = false;
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

  public sendMessage(text: string): void {
    this.client?.write('chat', { message: JSON.stringify({ text }) });
  }

  public isInGameMode(gamemode: string): boolean {
    if (this.status) return (this.status.mode?.toUpperCase().includes(gamemode.toUpperCase()) || this.status.game?.name?.toUpperCase().includes(gamemode.toUpperCase())) ?? false;
    else return false;
  }
}

export type PlayerEvents = {};
