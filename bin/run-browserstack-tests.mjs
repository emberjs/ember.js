// @ts-check

import chalk from 'chalk';
import { execa } from 'execa';

/**
 * @param {string} command
 * @param {string[]} args
 * @returns {Promise<import('execa').ExecaReturnValue<string>>}
 */
function run(command, args = []) {
  console.log(chalk.dim('$ ' + command + ' ' + args.join(' ')));

  return execa(command, args, {
    stdout: 'inherit',
    stderr: 'inherit',
  });
}

(async function () {
  await run('ember', ['browserstack:connect']);

  try {
    try {
      // Calling testem directly here instead of `ember test` so that
      // we do not have to do a double build (by the time this is run
      // we have already ran `ember build`).
      await run('testem', [
        'ci',
        '-f',
        'testem-browserstack.js',
        '--host',
        '127.0.0.1',
        '--port',
        '7774',
      ]);

      console.log('success');
      // eslint-disable-next-line n/no-process-exit
      process.exit(0);
    } finally {
      if (process.env['GITHUB_RUN_ID']) {
        await run('ember', ['browserstack:results']);
      }
      await run('ember', ['browserstack:disconnect']);
    }
  } catch (error) {
    console.log('error');
    console.log(error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
})();
