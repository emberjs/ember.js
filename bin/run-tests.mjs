// @ts-check

import child from 'child_process';
import { resolve } from 'path';
import PCR from 'puppeteer-chromium-resolver';

// eslint-disable-next-line new-cap
const { puppeteer, executablePath } = await PCR({});

const __root = new URL('..', import.meta.url).pathname;

console.log('[ci] starting');

await new Promise((fulfill) => {
  const runvite = child.spawn(
    resolve(__root, 'node_modules', '.bin', 'vite'),
    ['--port', '60173', '--no-open'],
    {
      stdio: 'pipe',
    }
  );

  process.on('exit', () => runvite.kill());

  runvite.stderr.on('data', (data) => {
    console.log('stderr', String(data));
  });

  runvite.stdout.on('data', (data) => {
    const chunk = String(data);
    console.log('stdout', chunk);
    if (chunk.includes('Local') && chunk.includes('60173')) {
      fulfill();
    }
  });

  console.log('[ci] spawning');
});

console.log('[ci] spawned');

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

console.log('[ci] puppeteer launched');

// eslint-disable-next-line no-async-promise-executor
await new Promise(async (fulfill) => {
  const page = await browser.newPage();

  page.on('console', (msg) => {
    const location = msg.location();
    const text = msg.text();

    if (location.url.includes(`/qunit.js`)) {
      console.log(text);
    } else if (text === `[HARNESS] done`) {
      fulfill();
    }
  });

  await page.goto('http://localhost:60173?hidepassed&ci');
});

await browser.close();

process.exit(0);
