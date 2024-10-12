import { IPlayer, Location } from '../Types';
import { PlayerState as PrismarinePlayerState } from 'prismarine-physics';
import { Vec3 } from 'vec3';

export default class Utils {
  public static isNear(pos1: Location, pos2: Location, tolerance: number): boolean {
    const distance = this.distance(pos1, pos2);

    return distance <= tolerance;
  }

  public static distance(pos1: Location, pos2: Location): number {
    return Math.abs(Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2) + Math.pow(pos2.z - pos1.z, 2)));
  }

  public static toRadians(degrees: number): number {
    let val = degrees * (Math.PI / 180);

    while (val <= -Math.PI) val += 2 * Math.PI;
    while (val > Math.PI) val -= 2 * Math.PI;

    return val;
  }

  public static toDegrees(radians: number): number {
    let val = radians * (180 / Math.PI);

    while (val <= -180) val += 360;
    while (val > 180) val -= 360;

    return val;
  }

  public static getPrismarinePlayerState(p: IPlayer) {
    if (!p.location || !p.rawDirection || !p.velocity || p.onGround === undefined) return null;
    return new PrismarinePlayerState(
      {
        entity: {
          position: p.location,
          velocity: new Vec3(p.velocity.x, p.velocity.y, p.velocity.z),
          onGround: p.onGround,
          isInWater: false,
          isInLava: false,
          isInWeb: false,
          isCollidedHorizontally: false,
          isCollidedVertically: false,
          elytraFlying: false,
          yaw: p.rawDirection?.yaw,
          pitch: p.rawDirection?.pitch,
        },
        jumpTicks: 0,
        jumpQueued: false,
        fireworkRocketDuration: 0,
      },
      {
        forward: false,
        back: false,
        left: false,
        right: false,
        jump: false,
        sprint: false,
        sneak: false,
      }
    );
  }
}
