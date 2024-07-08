const { rm } = require('fs/promises');
const { join } = require('path');

rm(join(__dirname, '../dist'), {
  recursive: true,
  force: true,
})
  .then(() => console.log('Cleared Dist!'))
  .catch(() => console.log('No Dist to Clear!'));
