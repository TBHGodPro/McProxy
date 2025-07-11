import { writeFile } from 'fs/promises';
import Command, { CommandData } from '../Command';

export default class DumpPackets extends Command {
  constructor() {
    super({
      commands: ['dp', 'dump-packets', 'dumppackets', 'packet-dump', 'packetdump', 'packets-dump', 'packetsdump', 'mcproxy:dp', 'mcproxy:dump', 'mcproxy:dump-packets', 'mcproxy:dumppackets', 'mcproxy:packet-dump', 'mcproxy:packetdump', 'mcproxy:packets-dump', 'mcproxy:packetsdump'],
      description: 'Dump incoming and outgoing packets into a packetDump.json file',
      args: [
        {
          type: 'number',
          required: true,
        },
        {
          type: 'string',
          required: false,
        },
      ],
    });
  }

  public handle(data: CommandData) {
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
      ({ data: d, name }: any) => {
        if (data.args[1]?.value?.toString()?.trim()?.length ? name.toLowerCase().includes(data.args[1].value.toString().toLowerCase().trim()) : true)
          packets.push({
            name: name,
            timestamp: Date.now().toString(),
            packet: d,
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
