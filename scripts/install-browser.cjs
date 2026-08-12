const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const browsersPath = path.resolve(__dirname, '../browsers');

console.log(`Downloading Playwright Chromium to ${browsersPath}...`);

try {
  execSync('npx playwright install chromium', {
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
    stdio: 'inherit'
  });
  console.log('Successfully installed Chromium to', browsersPath);
} catch (error) {
  console.error('Failed to install Chromium:', error);
  process.exit(1);
}
