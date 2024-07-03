export {};

declare global {
  var chalk: typeof import('chalk');
  var Logger: typeof import('../src/utils/Logger').default;
  var stackTrace: import('../src/utils/StackTrace').default;
  var JSONUtil: import('../src/utils/JSONUtil').default;
  var config: import('../src/utils/Config').default;
  var hypixel: import('../src/utils/Hypixel').default;
  var colors: {
    [key: string]: number;
  };
}
