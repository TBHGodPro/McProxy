import Command, { CommandData } from 'src/commands/Command';
import Module, { ModuleInfo, ModuleSettings, ModuleSettingsSchema } from '../Module';
import { ChatPosition } from 'src/Types';
import Player from 'src/player/Player';

let run: (data: CommandData) => void;

class FreeCamCommand extends Command {
  constructor() {
    super({
      commands: ['freecam', 'fc'],
      description: 'Command for FreeCam Module',
    });
  }

  public handle(data: CommandData) {
    run?.(data);
  }
}

export default class FreeCam extends Module<FreeCamSettings> {
  public freecamActive = false;

  constructor(player: Player) {
    super(player);

    run = this.run.bind(this);
    new FreeCamCommand().register();
  }

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'freeCam',
      name: 'Free Cam',
      description: 'Allows you to see what is happening anywhere in your render distance, without moving your player',
      version: '1.0.0',
      author: 'TBHGodPro',
    };
  }

  getDefaultSettings(): FreeCamSettings {
    return {};
  }

  getSettingsSchema(): ModuleSettingsSchema {
    return {};
  }

  public run(data: CommandData) {
    if (!this.enabled) return this.player.sendMessage('§cThe FreeCam Module is Disabled!');

    this.freecamActive = !this.freecamActive;

    this.player.sendMessage(this.freecamActive ? '§aFreeCam Enabled!' : '§cFreeCam Disabled!', ChatPosition.HOTBAR);

    if (this.freecamActive) this.enable();
    else this.disable();
  }

  private realPosition: any;
  private gamemode: any;
  private hotbarMessage: any;
  private abilities: any;

  async enable() {
    this.freecamActive = true;

    this.realPosition = {
      ...this.player.location,
      ...this.player.rawDirection,
      flags: 0,
    };
    this.player.client?.write('position', {
      x: this.player.location.x,
      y: (this.player.location.y / 32 + 0.05) * 32,
      z: this.player.location.z,
      pitch: this.player.direction.pitch,
      yaw: this.player.direction.yaw,
      flags: 0,
    });

    this.player.client?.write('game_state_change', {
      reason: 3,
      gameMode: 3,
    });

    this.player.client?.write('player_info', {
      action: 0,
      data: [
        {
          UUID: this.player.uuid!,
          name: this.player.username!,
          properties: [],
          gamemode: 0,
          ping: 0,
        },
      ],
    });
    this.player.client?.write('named_entity_spawn', {
      entityId: -100,
      playerUUID: this.player.uuid!,
      x: this.player.location.x * 32,
      y: this.player.location.y * 32,
      z: this.player.location.z * 32,
      yaw: 0,
      pitch: this.player.rawDirection.pitch,
      currentItem: 345,
      metadata: [
        {
          type: 0,
          key: 3,
          value: 0,
        },
        {
          type: 0,
          key: 16,
          value: 0,
        },
        {
          type: 1,
          key: 1,
          value: 300,
        },
        {
          type: 0,
          key: 10,
          value: 127,
        },
        {
          type: 0,
          key: 8,
          value: 1,
        },
        {
          type: 3,
          key: 17,
          value: 0,
        },
        {
          type: 4,
          key: 2,
          value: '',
        },
        {
          type: 0,
          key: 4,
          value: 0,
        },
        {
          type: 2,
          key: 18,
          value: 0,
        },
        {
          type: 0,
          key: 9,
          value: 0,
        },
        {
          type: 3,
          key: 6,
          value: 20,
        },
        {
          type: 0,
          key: 0,
          value: 0,
        },
        {
          type: 2,
          key: 7,
          value: 8171462,
        },
      ],
    });
  }

  async disable() {
    this.freecamActive = false;

    this.player.client?.write('position', this.realPosition);
    if (this.hotbarMessage)
      this.player.client?.write('chat', {
        position: 2,
        message: this.hotbarMessage,
      });

    this.player.client?.write('entity_destroy', {
      entityIds: [-100],
    });
    this.player.client?.write('player_info', {
      action: 4,
      data: [
        {
          UUID: this.player.uuid!,
        },
      ],
    });

    this.player.client?.write('game_state_change', {
      reason: 3,
      gameMode: this.gamemode,
    });

    this.player.client?.write(
      'abilities',
      this.abilities ?? {
        flags: 0,
        flyingSpeed: 0.05000000074505806,
        walkingSpeed: 0.10000000149011612,
      }
    );
  }

  init(): void {
    const fromServerStops = ['position', 'game_state_change', 'abilities'];

    this.player.proxy.on('fromServer', ({ name, data }) => {
      if (name === 'position') this.realPosition = data;
      if (name === 'game_state_change') this.gamemode = data.gameMode;
      if (name === 'chat' && data.position === 2) {
        this.hotbarMessage = data.message;
        setTimeout(() => {
          if (this.hotbarMessage === data.message) this.hotbarMessage = null;
        }, 2000);
        if (this.freecamActive) return false;
      }
      if (name === 'abilities') this.abilities = data;
      if (!this.freecamActive) return true;
      if (fromServerStops.includes(name)) return false;
    });

    const fromClientAllowed = ['keep_alive', 'chat', 'transaction', 'set_creative_slot', 'tab_complete', 'settings', 'client_command', 'custom_payload', 'resource_pack_receive'];
    this.player.proxy.on('fromClient', ({ name, data }) => {
      if (name === 'abilities' && !this.freecamActive) this.abilities = data;
      if (!this.freecamActive) return true;
      if (!fromClientAllowed.includes(name)) return false;
    });

    this.player.listener.on('switch_server', () => {
      if (this.freecamActive) this.disable();
    });

    setInterval(() => {
      if (this.freecamActive)
        this.player.client?.write('chat', {
          position: 2,
          message: '{"text": "§cIn FreeCam"}',
        });
    }, 500);
  }
}

export interface FreeCamSettings extends ModuleSettings {}
