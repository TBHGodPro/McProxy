import { Direction, Location } from 'src/Types';
import Utils from './Utils';

export default class Physics {
  public static getNeededArrowPitch(tx: number, ty: number, v: number, d: number, g: number): number | null {
    // If it's near the asymptotes, just return a vertical angle
    if (tx < ty * 0.001) {
      return ty > 0 ? Math.PI / 2.0 : -Math.PI / 2.0;
    }

    const md = 1.0 - d;
    const log_md = Math.log(md);
    const g_d = g / d; // This is terminal velocity
    let theta = Math.atan2(ty, tx);
    let prev_abs_ydif = Infinity;

    // 20 iterations max, although it usually converges in 3 iterations
    for (let i = 0; i < 20; i++) {
      const cost = Math.cos(theta);
      const sint = Math.sin(theta);
      const tant = sint / cost;
      const vx = v * cost;
      const vy = v * sint;
      const y = (tx * (g_d + vy)) / vx - (g_d * Math.log(1 - (d * tx) / vx)) / log_md;
      const ydif = y - ty;
      const abs_ydif = Math.abs(ydif);

      // If it's getting farther away, there's probably no solution
      if (abs_ydif > prev_abs_ydif) {
        return null;
      } else if (abs_ydif < 0.0001) {
        return theta;
      }

      const dy_dtheta = tx + (g * tx * tant) / ((-d * tx + v * cost) * log_md) + (g * tx * tant) / (d * v * cost) + tx * tant * tant;
      theta -= ydif / dy_dtheta;
      prev_abs_ydif = abs_ydif;
    }

    // If exceeded max iterations, return null
    return null;
  }

  public static getNeededArrowAngle(start: Location, end: Location, power: number): Direction {
    const dX = end.x - start.x;
    const dY = end.y - start.y;
    const dZ = end.z - start.z;

    const h = Math.sqrt(Math.pow(dX, 2) + Math.pow(dZ, 2));

    const yaw = (360 - Utils.toDegrees(Math.atan2(dX, dZ))) % 360;
    const pitch = Utils.toDegrees(this.getNeededArrowPitch(h, dY, 3 * power, 0.01, 0.05)!);

    return { yaw, pitch };
  }
}
