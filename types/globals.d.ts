export {};

declare global {
  var chalk: typeof import('chalk');
  var Logger: typeof import('../src/utils/Logger').default;
  var stackTrace: import('../src/utils/StackTrace').default;
  var JSONUtil: import('../src/utils/JSONUtil').default;
  var config: import('../src/utils/Config').default;
  var hypixel: import('../src/utils/Hypixel').default;
  var colors: {
    BLACK: 0x000000;
    DARK_BLUE: 0x0000aa;
    DARK_GREEN: 0x008000;
    DARK_AQUA: 0x00aaaa;
    DARK_RED: 0xaa0000;
    DARK_PURPLE: 0xaa00aa;
    GOLD: 0xffaa00;
    GRAY: 0xaaaaaa;
    DARK_GRAY: 0x555555;
    BLUE: 0x5555ff;
    GREEN: 0x3ce63c;
    AQUA: 0x3ce6e6;
    RED: 0xff5555;
    LIGHT_PURPLE: 0xff55ff;
    YELLOW: 0xffff55;
    WHITE: 0xffffff;
  };
}
