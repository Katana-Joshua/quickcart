const fs = require('fs');
const path = require('path');

const cachePath = path.join(__dirname, '..', 'dashboard', '.next');

try {
  fs.rmSync(cachePath, { recursive: true, force: true });
  console.log('Cleaned dashboard cache');
} catch (error) {
  console.warn(`Could not clean dashboard cache: ${error.message}`);
}

