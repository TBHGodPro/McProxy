import './utils/globals';
import './utils/ErrorCatcher';
import { Client, ServerClient, ping } from 'minecraft-protocol';
import { InstantConnectProxy } from 'prismarine-proxy';
import { NIL } from 'uuid';
import Player from './player/Player';
import PlayerManager from './utils/PlayerManager';

if (process.version.split('.')[0] !== 'v18') throw new Error('Must use Node.JS v18! (Using ' + process.version + ')');

const version = JSONUtil.readFileSync<any>('../package.json')?.version;
if (!version) throw new Error('No package.json found!');

if (!/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(config.cached.apiKey)) {
  Logger.error('Invalid API Key! Make sure to put a valid API Key in the config.json(c) file');
  process.exit(1);
}

export const playerManager = new PlayerManager();

hypixel.init();

process.title = 'McProxy';

export let toClient: ServerClient | null = null;

const proxy = new InstantConnectProxy({
  loginHandler: client => {
    toClient = client as ServerClient;
    return {
      auth: 'microsoft',
      username: client.username,
    };
  },

  serverOptions: {
    version: '1.8.9',
    motd: '§6MC§fProxy',
    port: config.cached.proxy.port,
    maxPlayers: 1,
    beforePing: async (response, client, callback) => {
      response = await ping({
        host: config.cached.server.host,
        port: config.cached.server.port,
        version: client.version,
      }).catch(() => ({}));

      response.players = {
        max: 1,
        online: toClient ? 1 : 0,
        sample: [{ name: '§6MC§fProxy', id: NIL }],
      };

      callback?.(null, response);
    },
    validateChannelProtocol: false,
    errorHandler(client, error) {
      throw error;
    },
  },

  clientOptions: {
    version: '1.8.9',
    host: config.cached.server.host,
    port: config.cached.server.port,
    onMsaCode(data) {
      Logger.info(`Please login to Microsoft to continue! Go to "${data.verification_uri}" and enter the code ${data.user_code} to authenticate!`);
    },
    validateChannelProtocol: false,
  },
});

export const player = new Player(proxy);

Logger.info('Proxy started');

player.proxy.on('start', (client, server) => {
  if (!player.online) {
    Logger.info(`Player ${client.username} Connected!`);
    toClient = client;
    player.connect(client, server);
  } else if (client.username !== player.client?.username) client.end('A Player is Already Connected!');
});

player.proxy.on('end', (username, log) => {
  if (log && player.online) Logger.info(`Player ${chalk.italic.bold(username)} Disconnected!`);
  player.disconnect();
  toClient = null;
});

// TODO : modules STOP and END event on proxy close
