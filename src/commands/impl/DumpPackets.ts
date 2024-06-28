import { writeFile } from 'fs/promises';
import Command, { CommandData } from '../Command';

export default class DumpPackets extends Command {
  constructor() {
    super({
      name: 'dump-packets',
      aliases: ['dp', 'dumppackets', 'packet-dump', 'packetdump', 'packetsdump', 'packetsdump'],
      args: [
        {
          type: 'number',
          required: true,
        },
      ],
    });
  }

  public handle(data: CommandData): void {
    const ms = data.args[0].value as number;
    if (ms <= 0) return;
    const packets: {
      name: string;
      timestamp: string;
      packet: unknown;
      from: 'server' | 'client';
    }[] = [];

    const callback =
      (from: 'server' | 'client') =>
      ({ data, name }: any) => {
        packets.push({
          name: name,
          timestamp: Date.now().toString(),
          packet: data,
          from,
        });
      };

    this.player.proxy.on('fromServer', callback('server'));
    this.player.proxy.on('fromClient', callback('client'));
    this.player.apollo.showNotification('DUMPING', `Dumping packets for ${ms}ms...`, { durationMS: 2000 });

    setTimeout(async () => {
      this.player.proxy.off('fromServer', callback('server'));
      this.player.proxy.off('fromClient', callback('client'));
      await writeFile('packetDump.json', JSON.stringify(packets, null, 2));

      this.player.apollo.showNotification('DUMPED', `Dumped ${packets.length} packets to packetDump.json`, { durationMS: 2000 });
      this.player.sendMessage(`Dumped ${packets.length} packets to packetDump.json (${packets.length / (ms / 1000)} P/s)`);
    }, ms);
  }
}
