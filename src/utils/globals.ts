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