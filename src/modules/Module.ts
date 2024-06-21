import Logger from '../utils/Logger';
import Player from '../player/Player';

interface Module<S extends ModuleSettings> {
  /** Run on player join */
  connect?(): void;
  /** Run on player leave */
  disconnect?(): void;
  /** Run very often, essentially main loop */
  periodic?(): void;
  /** Run when module is started. Emitted on creation and whenever module is enabled */
  start?(): void;
  /** Run when module is being stopped, either because it was disabled, crashed, or the proxy was safe-exitted */
  stop?(): void;
  /** Like stop, but run only when the proxy is safe-exitted (runs after stop) */
  end?(): void;

  /** Optionally give the proxy your module's settings schema, for verifying settings */
  getSettingsSchema?(): ModuleSettingsSchema;
  /** Give the proxy your module's default settings, will be empty by default if not implemented (THIS METHOD MAY BE CALLED OFTEN) */
  getDefaultSettings?(): S;
  /** Ran to check that all settings values are valid, will assume true if not implemented */
  verifySettings?(settings: ModuleSettings): boolean;
  /** Ran after a verified settings change to allow the module to update itself (THIS METHOD MAY BE CALLED OFTEN) */
  updateSettings?(settings: ModuleSettings): void;
}

abstract class Module<S extends ModuleSettings> {
  public readonly player: Player;
  public readonly logger: Logger;

  private _active = true;
  public get active(): boolean {
    return this._active;
  }

  private crashed: boolean = false;
  private crashError?: string | Error;
  private readonly startTime = Date.now();
  private crashTime: number = 0;

  public enabled: boolean = false;
  public settings: S = this.getDefaultSettings?.() ?? ({} as S);

  public get state(): ModuleState {
    return this.crashed
      ? {
          crashed: true,
          error: this.crashError,
          start: this.startTime,
          uptime: this.crashTime - this.startTime,
          totalTime: Date.now() - this.startTime,
          timeSinceCrash: Date.now() - this.crashTime,
        }
      : {
          crashed: false,
          uptime: Date.now() - this.startTime,
          start: this.startTime,
        };
  }

  /**
   * Abstract Module Class
   * @param player Player object, stays as the same object when a player leaves and then joins
   */
  constructor(player: Player) {
    this.player = player;
    this.logger = new Logger('[MODULE] LOADING..', true);
  }

  /**
   * Module has crashed, disable it
   * @param error Optional error string or object
   */
  public crash(error?: string | Error): void {
    this._active = false;
    this.crashed = true;
    this.crashError = error;
  }

  /**
   * Return module info for the module
   *
   * NOTE: Will crash if not implemented
   */
  public abstract getModuleInfo(): ModuleInfo;
}

export interface ModuleInfo {
  id: string;
  name: string;
  version: `${number}.${number}.${number}`;
  description: string;
  author?: string;
  url?: string;
  socials?: ModuleSocial[];
}

export interface ModuleSocial {
  type: 'discord' | 'twitter' | 'facebook' | 'reddit' | 'instagram';
  value: string;
}

export type ModuleState =
  | {
      crashed: false;
      uptime: number;
      start: number;
    }
  | {
      crashed: true;
      error?: string | Error;
      uptime: number;
      start: number;
      totalTime: number;
      timeSinceCrash: number;
    };

export default Module;

export type ModuleSettings = {
  [key: string]: string | boolean | number | ModuleSettings;
};

export type ModuleSettingsSchema = {
  [key: string]:
    | 'string'
    | 'boolean'
    | 'number'
    | {
        type: 'string';
        default?: string;
      }
    | {
        type: 'boolean';
        default?: boolean;
      }
    | {
        type: 'number';
        default?: number;
      }
    | {
        type: 'range';
        min: number;
        max: number;
        default?: number;
      }
    | {
        type: 'page';
        schema: ModuleSettingsSchema;
      };
};
