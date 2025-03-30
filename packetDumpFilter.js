const { readFileSync, writeFileSync } = require('fs');

const file = 'packetDump.json';
const removeKeys = ['map_chunk'];

removeKeys.push('transaction', 'keep_alive', 'map_chunk', 'map');

const data = JSON.parse(readFileSync(file, 'utf-8'));

for (let i = 0; i < data.length; i++) {
  if (removeKeys.includes(data[i].name)) {
    data.splice(i, 1);
    i -= 1;
  }
}

writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
