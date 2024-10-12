const { rmSync } = require('fs');
const { rm } = require('fs/promises');
const { join } = require('path');

try {
  rmSync(join(__dirname, '../dist'), {
    recursive: true,
    force: true,
  });
  console.log('Cleared Dist!');
} catch {
  console.log('No Dist to Clear!');
}
