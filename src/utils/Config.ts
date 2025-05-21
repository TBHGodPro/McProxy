import { validate } from 'jsonschema';
import { Config as ConfigType } from '../Types';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { player } from '..';

export default class Config {
  public readonly filePath: string;
  public cached: ConfigType;

  private lastModuleSave: number = 0;

  constructor() {
    const customConfigPath = process.argv.find(arg => arg.startsWith('--config='))?.split('=')[1];

    this.filePath = customConfigPath || JSONUtil.readFileSync('../../config.jsonc') ? '../../config.jsonc' : '../../config.json';

    this.cached = this.readSync();
  }

  public async read(): Promise<ConfigType> {
    const exists = existsSync(resolve(__dirname, this.filePath));

    if (!exists) {
      Logger.warn('Config does not exist! Creating a new one with default values...');

      await JSONUtil.writeFile(this.filePath, defaultConfig);

      this.cached = defaultConfig;

      return defaultConfig;
    }

    const data = await JSONUtil.readFile<ConfigType>(this.filePath);

    if (data && validate(data, configSchema).valid) {
      this.cached = data;

      if (Date.now() - this.lastModuleSave > 500 && player?.modules?.modules?.size) {
        this.lastModuleSave = Date.now();
        for (const id of Object.keys(data.modules)) {
          await player.modules.setModuleState(id, data.modules[id].enabled);
          await player.modules.setModuleSettings(id, data.modules[id].settings);
        }
      }

      return data;
    } else throw new Error("Can't validate config file!");
  }

  public readSync(): ConfigType {
    const exists = existsSync(resolve(__dirname, this.filePath));

    if (!exists) {
      Logger.warn('Config does not exist! Creating a new one with default values...');

      JSONUtil.writeFileSync(this.filePath, defaultConfig);

      this.cached = defaultConfig;

      return defaultConfig;
    }

    const data = JSONUtil.readFileSync<ConfigType>(this.filePath);

    if (data && validate(data, configSchema).valid) {
      this.cached = data;

      if (Date.now() - this.lastModuleSave > 500 && player?.modules?.modules?.size) {
        this.lastModuleSave = Date.now();
        for (const id of Object.keys(data.modules)) {
          player.modules.setModuleStateSync(id, data.modules[id].enabled);
          player.modules.setModuleSettingsSync(id, data.modules[id].settings);
        }
      }

      return data;
    } else throw new Error("Can't validate config file!");
  }

  public async write(data: ConfigType = this.cached) {
    this.cached = data;
    return await JSONUtil.writeFile<ConfigType>(this.filePath, data);
  }

  public writeSync(data: ConfigType = this.cached) {
    this.cached = data;
    return JSONUtil.writeFileSync<ConfigType>(this.filePath, data);
  }
}

// Automatically generated schema by `typescript-json-schema`
export const configSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  properties: {
    apiKey: {
      type: 'string',
    },
    server: {
      properties: {
        host: {
          type: 'string',
        },
        port: {
          type: 'number',
        },
      },
      type: 'object',
    },
    proxy: {
      properties: {
        port: {
          type: 'number',
        },
      },
      type: 'object',
    },
    modules: {
      additionalProperties: {
        properties: {
          enabled: {
            type: 'boolean',
          },
          settings: {
            additionalProperties: {},
            type: 'object',
          },
        },
        type: 'object',
      },
      type: 'object',
    },
  },
  type: 'object',
};

export const defaultConfig: ConfigType = {
  apiKey: "I can't provide a key, sorry!",
  server: {
    host: 'hypixel.net',
    port: 25565,
  },
  proxy: {
    port: 25556,
  },
  modules: {},
};
