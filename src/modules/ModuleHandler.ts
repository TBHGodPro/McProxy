import { join, resolve } from 'path';
import Player from '../player/Player';
import { readdir } from 'fs/promises';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema, ModuleState } from './Module';
import ModuleManager from './ModuleManager';

export default class ModuleHandler {
  public static readonly implDIR = resolve(__dirname, './impl');

  public readonly player: Player;

  public readonly modules: Map<string, ModuleReference<any>> = new Map();

  private periodic: NodeJS.Timer | null = null;

  constructor(player: Player) {
    this.player = player;
  }

  public async loadAll(paths?: string[]) {
    paths ??= [ModuleHandler.implDIR];

    if (!paths.includes(ModuleHandler.implDIR)) paths.push(ModuleHandler.implDIR);

    await config.read();

    for (const path of paths) {
      const files = (await readdir(path).catch(i => [])).filter(i => i.endsWith('.js') || i.endsWith('.cjs'));

      await Promise.all(files.map(file => this.load(join(path, file))));
    }

    await config.write();
  }

  public async load(path: string) {
    try {
      const raw = require(path);

      let c: any;
      if (raw?.prototype instanceof Module) c = raw;
      if (raw?.default?.prototype instanceof Module) c = raw.default;
      if (raw?.module?.prototype instanceof Module) c = raw.module;
      if (raw && typeof raw === 'object' && Object.keys(raw)?.length) {
        for (const key of Object.keys(raw)) {
          if (raw[key]?.prototype instanceof Module) c = raw[key];
        }
      }
      if (!c) throw new Error('No Module Exported!');

      const module = new c(this.player) as Module<any>;

      try {
        module.init?.();

        const info = module.getModuleInfo();

        if (typeof info.id !== 'string' || this.modules.has(info.id)) throw new Error('Invalid Module ID or another Module with this ID Exists');

        const ref = {
          id: info.id,
          module,
          info,
          state: module.state,
          enabled: false,
          settingsSchema: module.getSettingsSchema?.() ?? {},
          settings: {},
        } as ModuleReference<any>;

        module.logger.setIdentifier('[MODULE] ' + ref.info.name.trim());

        if (!ModuleManager.verifySchema(ref.settingsSchema, module.getDefaultSettings?.() ?? {})) throw new Error('Invalid Module Settings Schema OR Default Settings!');

        if (module.verifySettings && module.getDefaultSettings && !module.verifySettings(module.getDefaultSettings())) throw new Error('Invalid Module Default Settings!');

        await ModuleManager.getModuleData(ref, false);

        if (!ModuleManager.verifySettings(ref, ref.settings).success) {
          // TODO: Fix dynamic saving of default settings
          await this.saveModuleData(ref, null, module.getDefaultSettings?.());
        }

        module.settings = ref.settings;
        module.updateSettings?.(ref.settings);

        this.modules.set(ref.id, ref);
      } catch (err: any) {
        Logger.error(`Module "${path.split('/')[path.split('/').length - 1].split('.').slice(0, -1).join('.')}" is invalid:`, err?.message ?? err);
      }
    } catch (err: any) {
      Logger.error(`Failed to load module "${path.split('/')[path.split('/').length - 1].split('.').slice(0, -1).join('.')}":`, err?.message ?? err);
    }
  }

  public start(event: boolean = true) {
    if (event)
      this.modules.forEach(module => {
        if (module.enabled) module.module.start?.();
      });

    this.periodic = setInterval(() => {
      this.modules.forEach(module => {
        if (module.enabled) module.module.periodic?.();
      });
    });
  }

  public stop(event: boolean = true) {
    if (event)
      this.modules.forEach(module => {
        if (module.enabled) module.module.stop?.();
      });

    clearInterval(this.periodic as any);
    this.periodic = null;
  }

  public connect() {
    this.modules.forEach(module => {
      if (module.enabled) module.module.connect?.();
    });
  }

  public disconnect() {
    this.modules.forEach(module => {
      if (module.enabled) module.module.disconnect?.();
    });
  }

  public async setModuleState(id: string, enabled: boolean) {
    return await this.saveModuleData(this.modules.get(id)!, enabled);
  }

  public setModuleStateSync(id: string, enabled: boolean) {
    return this.saveModuleDataSync(this.modules.get(id)!, enabled);
  }

  public async saveModuleData<T extends ModuleSettings>(ref: ModuleReference<T>, enabled?: boolean | null | undefined, changedSettings?: Partial<T> | {} | null | undefined): Promise<{ success: true; ref: ModuleReference<T> } | { success: false; error: Error }> {
    const hasChangedSettings = changedSettings && typeof changedSettings === 'object';

    const newSettings = hasChangedSettings ? ModuleManager.getMergedSettings<T>(ref.settings, changedSettings ?? {}) : ref.settings;

    if (hasChangedSettings) {
      const res = ModuleManager.verifySettings(ref, newSettings);

      if (!res.success) return res;
    }

    const err = await ModuleManager.saveModuleData(ref, typeof enabled === 'boolean' ? enabled : ref.enabled, newSettings)
      .then(() => null)
      .catch(err => err);

    if (err) return { success: false, error: err };

    return { success: true, ref };
  }

  public saveModuleDataSync<T extends ModuleSettings>(ref: ModuleReference<T>, enabled?: boolean | null | undefined, changedSettings?: Partial<T> | {} | null | undefined): { success: true; ref: ModuleReference<T> } | { success: false; error: Error } {
    const hasChangedSettings = changedSettings && typeof changedSettings === 'object';

    const newSettings = hasChangedSettings ? ModuleManager.getMergedSettings<T>(ref.settings, changedSettings ?? {}) : ref.settings;

    if (hasChangedSettings) {
      const res = ModuleManager.verifySettings(ref, newSettings);

      if (!res.success) return res;
    }

    try {
      ModuleManager.saveModuleDataSync(ref, typeof enabled === 'boolean' ? enabled : ref.enabled, newSettings);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err : new Error(err?.toString?.() ?? (err as any)) };
    }

    return { success: true, ref };
  }
}

export interface ModuleReference<S extends ModuleSettings> {
  id: string;
  module: Module<S>;
  info: ModuleInfo;
  state: ModuleState;
  enabled: boolean;
  settingsSchema: ModuleSettingsSchema;
  settings: S;
}
