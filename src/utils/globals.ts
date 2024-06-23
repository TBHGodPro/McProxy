import rawJSONUtil from './JSONUtil';
import rawChalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Config from './Config';
import StackTrace from './StackTrace';
import rawLogger from './Logger';
import Hypixel from './Hypixel';

// global.__filename = fileURLToPath(import.meta.url);
// global.__dirname = dirname(__filename);

global.chalk = rawChalk;
global.Logger = rawLogger;
global.stackTrace = new StackTrace();
global.JSONUtil = new rawJSONUtil();
global.config = new Config();
global.hypixel = new Hypixel(config.cached.apiKey);
global.colors = {
  BLACK: 0x000000,
  DARK_BLUE: 0x0000aa,
  DARK_GREEN: 0x008000,
  DARK_AQUA: 0x00aaaa,
  DARK_RED: 0xaa0000,
  DARK_PURPLE: 0xaa00aa,
  GOLD: 0xffaa00,
  GRAY: 0xaaaaaa,
  DARK_GRAY: 0x555555,
  BLUE: 0x5555ff,
  GREEN: 0x3ce63c,
  AQUA: 0x3ce6e6,
  RED: 0xff5555,
  LIGHT_PURPLE: 0xff55ff,
  YELLOW: 0xffff55,
  WHITE: 0xffffff,
};
