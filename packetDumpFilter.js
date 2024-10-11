const { readFileSync, writeFileSync } = require('fs');

const file = 'packetDump.json';
const removeKeys = ['map_chunk'];

removeKeys.push('entity_head_rotation', 'entity_move', 'entity_look', 'entity_move_look', 'rel_entity_move', 'position_look', 'transaction', 'keep_alive');

const data = JSON.parse(readFileSync(file, 'utf-8'));

for (let i = 0; i < data.length; i++) {
  if (removeKeys.includes(data[i].name)) {
    data.splice(i, 1);
  }
}

writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
