import { parseUUID, UUID } from '@minecraft-js/uuid';
import axios from 'axios';
import { APIPlayer } from '../Types';

export default class PlayerManager {
  public cache: Map<string, APIPlayer>;

  constructor() {
    this.cache = new Map();
  }

  public parseUUID(uuid: UUID | string, dashes: boolean = true): string | null {
    try {
      return parseUUID(uuid.toString()).toString(dashes);
    } catch {
      return null;
    }
  }

  public async fetchUUID(uuid: UUID | string, force: boolean = false): Promise<APIPlayer> {
    uuid = this.parseUUID(uuid)!;

    if (!force) {
      if (this.cache.has(uuid)) return this.cache.get(uuid)!;
    }

    const data = (await axios
      .get(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`)
      .then(res => {
        if (res.status === 200) {
          return {
            username: res.data.name,
            uuid: this.parseUUID(res.data.id),
          };
        } else return null;
      })
      .catch(() => null)) as APIPlayer;

    if (!data) throw new Error(`Player with UUID "${uuid}" does not exist!`);

    this.cache.set(data.uuid, data);

    return data;
  }

  public async fetchUsername(username: string, force = false): Promise<APIPlayer> {
    if (!force) {
      let user: APIPlayer | null = null;
      this.cache.forEach(i => {
        if (i.username.toLowerCase() === username.toLowerCase()) user = i;
      });
      if (user) return user;
    }

    const data = (await axios
      .get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
      .then(res => {
        if (res.status === 200) {
          return {
            username: res.data.name,
            uuid: this.parseUUID(res.data.id),
          };
        } else return null;
      })
      .catch(() => null)) as APIPlayer;

    if (!data) throw new Error(`Player with Username "${username}" does not exist!`);

    this.cache.set(data.uuid, data);

    return data;
  }
}
