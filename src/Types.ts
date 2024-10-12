import { Client } from 'minecraft-protocol';
import { Slot } from './PacketTypings';
import { ModuleSettings } from './modules/Module';
import { ClientboundPartyInfo } from 'hypixel-mod-api-js/dist/packets/impl/clientbound/ClientboundPartyInfoPacket';

export interface Config {
  apiKey: string;
  server: {
    host: string;
    port: number;
  };
  proxy: {
    port: number;
  };
  modules: { [key: string]: { enabled: boolean; settings: ModuleSettings } };
}

export type ValueOf<T> = T[keyof T];

export type ListenerEvents = {
  switch_server: (toServer: Client) => void;
  server_full: (playerCount: number) => void;
  team_create: (name: string) => void;
  team_delete: (name: string) => void;
  team_edit: (data: unknown) => void;
  team_player_add: (name: string, players: string[]) => void;
  player_join: (uuid: string, username?: string) => void;
  player_spawn: (uuid: string, entityId: number, location: Location) => void;
  player_leave: (entityId: number) => void;
  entity_teleport: (entityId: number, location: Location, onGround: boolean) => void;
  entity_move: (entityId: number, difference: Location, onGround: boolean) => void;
  entity_look: (entityId: number, direction: Direction, raw: Direction, onGround?: boolean) => void;
  entity_velocity: (entityId: number, velocity: Location) => void;
  title: (action: number, text?: string, fadeIn?: number, stay?: number, fadeOut?: number) => void;
  action_bar: (message: object) => void;
  client_move: (location: Location, onGround?: boolean) => void;
  client_face: (direction: Direction, raw: Direction, onGround?: boolean) => void;
  inventory_slot: (slot: number, item: Slot) => void;
  player_state: (state: PlayerState) => void;
  health: (name: string, health: number) => void;
};

export interface Location {
  x: number;
  y: number;
  z: number;
}

export interface Direction {
  yaw: number;
  pitch: number;
}

export interface Team {
  name: string;
  players: string[];
}

export interface IPlayer {
  name?: string;
  uuid: string;
  entityId?: number;
  location?: Location;
  velocity?: Location;
  direction?: Direction;
  rawDirection?: Direction;
  health?: number;
  onGround?: boolean;
}

export interface Party extends ClientboundPartyInfo {}

export interface APIPlayer {
  uuid: string;
  username: string;
}

export interface PlayerState {
  health: number;
  food: number;
  saturation: number;
}
