import { Client, Game, Status } from 'hypixel-api-reborn';

// From "https://api.connorlinfoot.com/v2/games/hypixel/"
const SkyblockGameModes = [
  { key: 'dynamic', name: 'Private Island' },
  { key: 'hub', name: 'Hub' },
  { key: 'farming_1', name: 'The Farming Islands' },
  { key: 'mining_1', name: 'Gold Mine' },
  { key: 'mining_2', name: 'Deep Caverns' },
  { key: 'mining_3', name: 'Dwarven Mines' },
  { key: 'combat_1', name: "Spider's Den" },
  { key: 'combat_2', name: 'Blazing Fortress' },
  { key: 'combat_3', name: 'The End' },
  { key: 'foraging_1', name: 'Floating Islands' },
  { key: 'dark_auction', name: 'Dark Auction' },
  { key: 'dungeon', name: 'Dungeons' },
  { key: 'crystal_hollows', name: 'Crystal Hollows' },
  { key: 'crimson_isle', name: 'Crimson Isle' },
  { key: 'instanced', name: "Kuudra's Hollow" },
  { key: 'garden', name: 'The Garden' },
];

export default class Hypixel {
  public readonly client: Client;

  constructor(apiKey: string) {
    this.client = new Client(apiKey, {
      cache: true,
      silent: true,
      headers: {},
    });
  }

  public async init() {
    await this.client.getPlayer('069a79f4-44e9-4726-a5be-fca90e38aaf5', { noCacheCheck: true, noCaching: true });
  }

  public async fetchPlayerLocation(uuid: string): Promise<Status> {
    return new Promise<Status>((resolve, reject) => {
      this.client
        .getStatus(uuid, { noCacheCheck: true, noCaching: true })
        .then(status => {
          if (status?.mode) status.mode = status.mode.replace(/BED WARS/g, 'BEDWARS');
          resolve(status);
        })
        .catch(reason => {
          reject(reason);
        });
    });
  }

  public parseGameMode(game: Game, mode: string): string {
    if (game.code === 'SKYBLOCK') {
      const realMode = SkyblockGameModes.find(i => i.key == mode);
      if (realMode) return `(${realMode.name})`;
    }

    return mode
      .split('_')
      .map(i => i[0].toUpperCase() + i.substring(1).toLowerCase())
      .join(' ');
  }
}
