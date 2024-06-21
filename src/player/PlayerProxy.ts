import EventEmitter from 'events';
import { Client, ServerClient } from 'minecraft-protocol';
import TypedEventEmitter from 'typed-emitter';
import Player from './Player';
import { ValueOf } from '../Types';
import { PacketsPlayToClient, PacketsPlayToServer } from '../PacketTypings';
import { InstantConnectProxy } from 'prismarine-proxy';
// @ts-ignore
import { clone as structuredClone } from 'structured-clone';

export default class PlayerProxy extends (EventEmitter as new () => TypedEventEmitter<PlayerProxyEvents>) {
  public readonly player: Player;

  public get client(): ServerClient | null {
    return this.player.client;
  }

  public get server(): Client | null {
    return this.player.server;
  }

  public get raw(): InstantConnectProxy {
    return this.player.rawProxy;
  }

  constructor(player: Player) {
    super();

    this.player = player;
  }

  public setup() {
    this.raw.removeAllListeners();

    this.raw.on('incoming', async (data, meta, toClient, toServer) => {
      let send = true;

      const msg = structuredClone(data);

      const listeners = this.listeners('fromServer');

      // TODO: Fix async support, caused lag spikes even on empty async functions
      for (const func of listeners) {
        const result = func(
          {
            data,
            name: meta.name as any,
          },
          toClient,
          toServer
        );
        if (result === false) send = false;
      }

      if (send) toClient.write(meta.name as any, msg);
    });

    this.raw.on('outgoing', async (data, meta, toClient, toServer) => {
      // Custom inventories
      if (meta.name === 'window_click' && data.windowId === 255) return;

      let send = true;

      const msg = structuredClone(data);

      const listeners = this.listeners('fromClient');

      // TODO: Fix async support, caused lag spikes even on empty async functions
      for (const func of listeners) {
        const result = func(
          {
            data,
            name: meta.name as any,
          },
          toClient,
          toServer
        );
        if (result === false) send = false;
      }

      if (send) toServer.write(meta.name as any, msg);
    });

    this.raw.on('start', (...args) => this.emit('start', ...args));
    this.raw.on('end', username => this.emit('end', username, true));
  }
}

export type PlayerProxyEvents = {
  start: (toClient: ServerClient, toServer: Client) => void;
  end: (username: string, log: boolean) => void;

  fromServer: (packet: ServerPacket, toClient: ServerClient, toServer: Client) => void | Promise<void> | boolean;
  fromClient: (packet: ClientPacket, toClient: ServerClient, toServer: Client) => void | Promise<void> | boolean;
};

export type ServerPacket = ValueOf<{
  [T in keyof PacketsPlayToClient]: {
    name: T;
    data: PacketsPlayToClient[T];
  };
}>;

export type ClientPacket = ValueOf<{
  [T in keyof PacketsPlayToServer]: {
    name: T;
    data: PacketsPlayToServer[T];
  };
}>;
