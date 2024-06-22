import { ValueOf } from '../Types';
import Module, { ModuleSettings, ModuleSettingsSchema } from './Module';
import { ModuleReference } from './ModuleHandler';

export default class ModuleManager {
  public static verifySchema(schema: ModuleSettingsSchema, settings: ModuleSettings): boolean {
    if (!schema || typeof schema !== 'object') return false;
    if (!settings || typeof settings !== 'object') return false;

    for (const key in schema) {
      if (!schema[key] || ((typeof schema[key] !== 'object' || (typeof schema[key] === 'object' && !['string', 'number', 'boolean', 'range', 'page'].includes((schema[key] as any)?.type))) && !['string', 'number', 'boolean'].includes(schema[key] as string))) return false;

      let item: Exclude<ValueOf<ModuleSettingsSchema>, string> = schema[key] as any;
      if (typeof item === 'string') item = { type: item };
      const val = settings[key];
      switch (item.type) {
        case 'string': {
          if (!val || typeof val !== 'string') return false;
          break;
        }

        case 'boolean': {
          if (typeof val !== 'boolean') return false;
          break;
        }

        case 'number': {
          if (isNaN(val as number) || typeof val !== 'number') return false;
          break;
        }

        case 'range': {
          if (isNaN(item.min) || typeof item.min !== 'number' || item.min > item.max) return false;
          if (isNaN(item.max) || typeof item.max !== 'number' || item.max < item.min) return false;
          if (isNaN(val as number) || typeof val !== 'number' || val < item.min || val > item.max) return false;
          break;
        }

        case 'page': {
          if (!this.verifySchema(item.schema, val as ModuleSettings)) return false;
          break;
        }

        default: {
          return false;
        }
      }
    }

    return true;
  }

  public static async getModuleData<T extends ModuleSettings>(module: ModuleReference<T>, readAndWrite: boolean = true): Promise<{ enabled: boolean; settings: T }> {
    const conf = readAndWrite ? await config.read() : config.cached;

    conf.modules ??= {};

    conf.modules[module.info.id] ??= {} as any;

    conf.modules[module.info.id].enabled ??= false;
    conf.modules[module.info.id].settings ??= module.module.getDefaultSettings?.() ?? {};

    module.enabled = conf.modules[module.info.id].enabled;
    module.settings = conf.modules[module.info.id].settings as T;
    module.module.settings = module.settings;
    module.module.updateSettings?.(module.settings);

    if (module.module.enabled !== module.enabled) {
      module.module.enabled = module.enabled;
      module.module[module.enabled ? 'start' : 'stop']?.();
    }

    if (readAndWrite) await config.write();

    return conf.modules[module.info.id] as any;
  }

  public static getModuleDataSync<T extends ModuleSettings>(module: ModuleReference<T>, readAndWrite: boolean = true): { enabled: boolean; settings: T } {
    const conf = readAndWrite ? config.readSync() : config.cached;

    conf.modules ??= {};

    conf.modules[module.info.id] ??= {} as any;

    conf.modules[module.info.id].enabled ??= false;
    conf.modules[module.info.id].settings ??= module.module.getDefaultSettings?.() ?? {};

    module.enabled = conf.modules[module.info.id].enabled;
    module.settings = conf.modules[module.info.id].settings as T;
    module.module.settings = module.settings;
    module.module.updateSettings?.(module.settings);

    if (module.module.enabled !== module.enabled) {
      module.module.enabled = module.enabled;
      module.module[module.enabled ? 'start' : 'stop']?.();
    }

    if (readAndWrite) config.writeSync();

    return conf.modules[module.info.id] as any;
  }

  public static getMergedSettings<T extends ModuleSettings>(current: T, newSettings: Partial<T>): T {
    function write<V>(current: V, newValues: Partial<V>): V {
      for (const key in newValues) {
        if (newValues[key] != undefined) {
          if (typeof newValues[key] === 'object') current[key] = write(current[key], newValues[key]!);
          else current[key] = newValues[key]!;
        }
      }

      return current;
    }
    current = write<T>(current, newSettings);

    return current;
  }

  public static async saveModuleData<T extends ModuleSettings>(module: ModuleReference<T>, enabled: boolean, settings: T): Promise<void> {
    const conf = await config.read();

    conf.modules ??= {};

    conf.modules[module.info.id] ??= {} as any;

    conf.modules[module.info.id].enabled = enabled ?? module.enabled ?? false;
    conf.modules[module.info.id].settings = settings ?? module.settings ?? module.module.getDefaultSettings?.() ?? {};

    // conf.modules[module.info.id].settings = this.getMergedSettings<T>(conf.modules[module.info.id].settings as T, settings);

    module.enabled = conf.modules[module.info.id].enabled;
    module.settings = conf.modules[module.info.id].settings as T;
    module.module.settings = module.settings;
    module.module.updateSettings?.(module.settings);

    if (module.module.enabled !== module.enabled) {
      module.module.enabled = module.enabled;
      module.module[module.enabled ? 'start' : 'stop']?.();
    }

    await config.write();
  }

  public static saveModuleDataSync<T extends ModuleSettings>(module: ModuleReference<T>, enabled: boolean, settings: T): void {
    const conf = config.readSync();

    conf.modules ??= {};

    conf.modules[module.info.id] ??= {} as any;

    conf.modules[module.info.id].enabled = enabled ?? module.enabled ?? false;
    conf.modules[module.info.id].settings = settings ?? module.settings ?? module.module.getDefaultSettings?.() ?? {};

    // conf.modules[module.info.id].settings = this.getMergedSettings<T>(conf.modules[module.info.id].settings as T, settings);

    module.enabled = conf.modules[module.info.id].enabled;
    module.settings = conf.modules[module.info.id].settings as T;
    module.module.settings = module.settings;
    module.module.updateSettings?.(module.settings);

    if (module.module.enabled !== module.enabled) {
      module.module.enabled = module.enabled;
      module.module[module.enabled ? 'start' : 'stop']?.();
    }

    config.writeSync();
  }

  public static verifySettings<T extends ModuleSettings>(ref: ModuleReference<T>, settings: T): { success: true; ref: ModuleReference<T> } | { success: false; error: Error } {
    if (!ModuleManager.verifySchema(ref.settingsSchema, settings)) return { success: false, error: new Error('Settings did not match schema!') };
    if (ref.module.verifySettings && !ref.module.verifySettings(settings)) return { success: false, error: new Error('Settings did not fit custom verification!') };

    return { success: true, ref };
  }
}
