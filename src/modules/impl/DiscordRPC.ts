import Module, { ModuleInfo, ModuleSettings } from '../Module';
import { Client as DiscordClient } from 'discord-rpc';

export default class DiscordRPCModule extends Module<DiscordRPCSettings> {
  public readonly client = new DiscordClient({ transport: 'ipc' });

  public getModuleInfo(): ModuleInfo {
    return {
      id: 'discordRPC',
      name: 'Discord RPC',
      version: '1.0.0',
      description: 'Discord Rich Presence for MCProxy',
      author: 'TBHGodPro',
    };
  }
}

export interface DiscordRPCSettings extends ModuleSettings {}
