import path from 'node:path';

import { execaSync } from 'execa';

const __dirname = new URL('.', import.meta.url).pathname;

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EMBER_BIN = 'ember';
const QUNIT_BIN = 'qunit';
const NODE_TEST_GLOB = '@glimmer/{node,bundle-compiler}/test/**/*node-test.js';

// With the TAP reporter, testem swallows any errors generated while running
// this script that are not in TAP format and does not treat non-zero exit codes
// as a test failure. This handler ensures that any non-zero exits emit a
// TAP-compatible bail out message.
process.on('exit', (code) => {
  if (code !== 0) {
    console.log('Bail out! Non-zero exit code ' + code);
  }
});

let outputDir = process.env['EMBER_CLI_TEST_OUTPUT'];

// When running inside `ember test`, we already have a build we can use.
if (outputDir) {
  process.chdir(outputDir);
  exec(QUNIT_BIN, [NODE_TEST_GLOB]);
} else {
  // When running script directly, we need to build first to ensure we have
  // tests to run.
  process.chdir(PROJECT_ROOT);
  exec(EMBER_BIN, ['build']);
  exec(QUNIT_BIN, [`dist/${NODE_TEST_GLOB}`]);
}

// Executes a command and pipes stdout back to the user.
/**
 * @param {string} command
 * @param {readonly string[] | undefined} args
 */
function exec(command, args) {
  execaSync(command, args, {
    stdio: 'inherit',
    preferLocal: true,
  });
}
