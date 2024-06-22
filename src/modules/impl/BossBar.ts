import { EntityMetadata } from '../../PacketTypings';
import { Direction, Location } from '../../Types';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { ServerPacket } from '../../player/PlayerProxy';

// Y: 33 blocks in the direction facing (negative pitch is up, positive is down)
// X and Z: 32 blocks in the direction facing

function calculateBlock(pos: Location, dir: Direction): Location {
  // Calculate X

  // -180 to 180
  // We want -90 to 90 (which is actually 90 to 270)
  let yaw = dir.yaw - 180;

  // -90 to 90
  if (yaw < -90) yaw += (Math.abs(yaw) - 90) * 2;
  if (yaw > 90) yaw -= (yaw - 90) * 2;

  const x = yaw / 2.8125;

  // Calculate Z

  // 0 to 360
  // We want 0 and 360 (as the same) to 180
  yaw = dir.yaw;

  // 0 to 180
  if (yaw > 180) yaw -= (yaw - 180) * 2;

  // -90 to 90
  yaw = yaw - 90;

  const z = yaw / 2.8125;

  return {
    x: (pos.x + x) * 32,
    y: (pos.y - dir.pitch / 2.7272727272) * 32,
    z: (pos.z - z) * 32,
  };
}

export default class BossBarModule extends Module<BossBarSettings> {
  private ID = -1244;
  private get text(): string {
    return this.settings.text + (this.settings.showStatus && this.player.isHypixel && this.player.status ? `§f | ${this.player.statusMessage}` : '');
  }
  private health: number = 300;
  private spawned: boolean = false;

  private realBossBar: any = null;
  private realLocation: Location | null = null;

  private get location(): Location {
    return (
      this.realLocation ??
      (this.player.location && this.player.direction
        ? calculateBlock(this.player.location, this.player.direction)
        : {
            x: 0,
            y: 0,
            z: 0,
          })
    );
  }

  private get metadata(): EntityMetadata {
    return [
      {
        type: 0,
        key: 3,
        value: 1,
      },
      {
        type: 0,
        key: 0,
        value: 32,
      },
      {
        type: 3,
        key: 6,
        value: this.health,
      },
      {
        type: 2,
        key: 19,
        value: 0,
      },
      {
        type: 2,
        key: 20,
        value: 1000,
      },
      {
        type: 4,
        key: 2,
        value: this.text,
      },
      {
        type: 2,
        key: 17,
        value: 0,
      },
      {
        type: 2,
        key: 18,
        value: 0,
      },
    ];
  }

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'bossBar',
      name: 'Boss Bar',
      version: '1.0.0',
      description: 'Customizable Boss Bar Module',
      author: 'TBHGodPro',
    };
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      text: 'string',
      showStatus: 'boolean',
    };
  }

  getDefaultSettings(): BossBarSettings {
    return {
      text: '§6MC§fProxy',
      showStatus: true,
    };
  }

  private onSwitchServer = () => {
    if (this.spawned) this.render();
  };
  private onPacket = ({ data, name }: ServerPacket) => {
    if (name === 'spawn_entity_living' && data.type === 64 && data.metadata?.find(m => m.type === 4 && m.key === 2 && typeof m.value === 'string') && data.metadata.find(m => m.type === 3 && m.key === 6 && typeof m.value === 'number')) {
      this.realLocation = {
        x: data.x,
        y: data.y,
        z: data.z,
      };
      this.realBossBar = data;
      if (this.spawned) this.spawn(true);
      return !this.spawned;
    } else if (name === 'entity_metadata' && this.realBossBar && data.entityId === this.realBossBar.entityId) {
      this.realBossBar.metadata = data.metadata;
      if (this.spawned) this.render();
      return !this.spawned;
    } else if (name === 'entity_destroy' && this.realBossBar && data.entityIds.includes(this.realBossBar.entityId)) {
      this.realBossBar = null;
      return !this.spawned;
    } else if (name === 'entity_teleport' && this.realBossBar && data.entityId === this.realBossBar.entityId) {
      this.realLocation = {
        x: data.x,
        y: data.y,
        z: data.z,
      };
      this.realBossBar = {
        ...this.realBossBar,
        ...this.realLocation,
      };
      if (this.spawned) this.render();
      return !this.spawned;
    }
  };
  private interval: NodeJS.Timer | null = null;

  start(): void {
    this.render();

    this.player.listener.on('switch_server', this.onSwitchServer);

    this.player.proxy.on('fromServer', this.onPacket);

    this.interval = setInterval(() => this.render(), 500);
  }

  stop(): void {
    clearInterval(this.interval as any);
    this.interval = null;

    this.despawn();

    this.player.listener.off('switch_server', this.onSwitchServer);

    this.player.proxy.off('fromServer', this.onPacket);
  }

  private render(skipSpawnedCheck = false): void {
    if (!skipSpawnedCheck && !this.spawned) return this.spawn(true);

    this.updatePosition(true);
    this.player.client?.write('entity_metadata', {
      entityId: this.ID,
      metadata: this.metadata,
    });
  }

  private updatePosition(skipSpawnedCheck = false): void {
    if (!skipSpawnedCheck && !this.spawned) return;

    this.player.client?.write('entity_teleport', {
      entityId: this.ID,
      ...this.location,
      yaw: 0,
      pitch: 0,
      onGround: false,
    });
  }

  private spawn(skipSpawnedCheck = false) {
    if (!skipSpawnedCheck && this.spawned) return this.render();
    this.spawned = true;

    if (this.realBossBar)
      this.player.client?.write('entity_destroy', {
        entityIds: [this.realBossBar.entityId],
      });

    this.player.client?.write('spawn_entity_living', {
      entityId: this.ID,
      type: 64,
      ...this.location,
      yaw: 0,
      pitch: 0,
      headPitch: 0,
      velocityX: 0,
      velocityY: 0,
      velocityZ: 0,
      metadata: this.metadata,
    });
  }

  private despawn(skipSpawnedCheck = false) {
    if (!skipSpawnedCheck && !this.spawned) return;
    this.spawned = false;

    this.player.client?.write('entity_destroy', {
      entityIds: [this.ID],
    });

    if (this.realBossBar) this.player.client?.write('spawn_entity_living', this.realBossBar);
  }

  private setHealth(health: number) {
    this.health = Math.min(Math.max(health, 0), 300);

    if (this.spawned) this.render();
  }
}

interface BossBarSettings extends ModuleSettings {
  text: string;
  showStatus: boolean;
}
