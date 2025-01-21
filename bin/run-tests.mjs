/* eslint-disable n/no-process-exit */
// @ts-check

import child from 'child_process';
import { resolve } from 'path';
import PCR from 'puppeteer-chromium-resolver';
import { fileURLToPath } from 'url';

const { puppeteer, executablePath } = await PCR({});

const __root = fileURLToPath(new URL('..', import.meta.url));

console.log('[ci] starting');

await /** @type {Promise<void>} */ (
  new Promise((fulfill) => {
    const runvite = child.fork(
      resolve(__root, 'node_modules', 'vite', 'bin', 'vite.js'),
      ['--port', '60173', '--no-open'],
      {
        stdio: 'pipe',
      }
    );

    process.on('exit', () => runvite.kill());

    runvite.stderr?.on('data', (data) => {
      console.log('stderr', String(data));
    });

    runvite.stdout?.on('data', (data) => {
      const chunk = String(data);
      console.log('stdout', chunk);
      if (chunk.includes('Local') && chunk.includes('60173')) {
        fulfill();
      }
    });

    console.log('[ci] spawning');
  })
);

console.log('[ci] spawned');

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

console.log('[ci] puppeteer launched');

try {
  console.log('[ci] navigating to new page');
  const page = await browser.newPage();
  console.log('[ci] done navigating');

  console.log('[ci] waiting for console');
  const promise = /** @type {Promise<void>} */ (
    new Promise((fulfill, reject) => {
      page.on('console', (msg) => {
        console.error(msg.text());
        const location = msg.location();
        const text = msg.text();

        if (text.includes('# fail')) {
          if (!text.includes('# fail 0')) {
            console.error(text);
            process.exit(1);
          }
        }

        if (location.url?.includes(`/qunit.js`)) {
          console.log(text);
        } else if (text === `[HARNESS] done`) {
          fulfill();
        } else if (text === `[HARNESS] fail`) {
          // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
          reject();
        }
      });
    })
  );
  console.log('[ci] done waiting');

  console.log('[ci] navigating to test page');
  void page.goto('http://localhost:60173?hidepassed&ci');
  console.log('[ci] done navigating');

  await promise;
} catch {
  await browser.close();
  process.exit(1);
}

await browser.close();

process.exit(0);
