import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';

export default class TestModule extends Module<TestModuleSettings> {
  public getModuleInfo(): ModuleInfo {
    return {
      id: 'testModule',
      name: 'Test Module',
      version: '1.0.0',
      description: 'Testing Module',
    };
  }

  start(): void {
    this.logger.info('START');
  }

  stop(): void {
    this.logger.info('STOP');
  }

  connect(): void {
    this.logger.info('CONNECT');
  }

  disconnect(): void {
    this.logger.info('DISCONNECT');
  }

  periodic(): void {
    this.logger.debug('PERIODIC');
  }

  end(): void {
    this.logger.info('END');
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {
      stringTest: 'string',
      numberTest: 'number',
      boolTest: 'boolean',
      rangeTest: {
        type: 'range',
        min: 0,
        max: 10,
      },
      pageTest: {
        type: 'page',
        schema: {
          val1: 'string',
          val2: 'number',
          val3: 'boolean',
        },
      },
    };
  }

  getDefaultSettings(): TestModuleSettings {
    return {
      stringTest: 'hi',
      numberTest: 3,
      boolTest: false,
      rangeTest: 6,
      pageTest: {
        val1: 'hello',
        val2: 7,
        val3: true,
      },
    };
  }

  verifySettings(settings: ModuleSettings): boolean {
    this.logger.debug('Asked to verify');
    return true;
  }

  updateSettings(settings: ModuleSettings): void {
    this.logger.info('NEW SETTINGS', settings);
  }
}

interface TestModuleSettings extends ModuleSettings {
  stringTest: string;
  numberTest: number;
  boolTest: boolean;
  rangeTest: number;
  pageTest: {
    val1: string;
    val2: number;
    val3: boolean;
  };
}
