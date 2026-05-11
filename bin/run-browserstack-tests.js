/* eslint-disable no-console */

const chalk = require('chalk');

async function run(command, args = []) {
  const { execa } = await import('execa');
  console.log(chalk.dim('$ ' + command + ' ' + args.join(' ')));

  return execa(command, args, { stdout: 'inherit', stderr: 'inherit' });
}

(async function () {
  await run('./node_modules/.bin/browserstack', ['connect']);

  try {
    try {
      // Calling testem directly here instead of `ember test` so that
      // we do not have to do a double build (by the time this is run
      // we have already ran `ember build`).
      await run('testem', [
        'ci',
        '-f',
        'testem.browserstack.js',
        '--host',
        '127.0.0.1',
        '--port',
        '7774',
      ]);

      console.log('success');
      process.exit(0); // eslint-disable-line n/no-process-exit
    } finally {
      if (process.env.GITHUB_RUN_ID) {
        await run('./node_modules/.bin/browserstack', ['results']);
      }
      await run('./node_modules/.bin/browserstack', ['disconnect']);
    }
  } catch (error) {
    console.log('error');
    console.log(error);
    process.exit(1); // eslint-disable-line n/no-process-exit
  }
})();
