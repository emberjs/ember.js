const requireQUnit = require('qunit/src/cli/require-qunit');
const FindReporter = require('qunit/src/cli/find-reporter');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const execa = require('execa');
const qunitRun = require('qunit/src/cli/run');

const EMBER_BIN = 'ember';
exec(EMBER_BIN, ['build']);

require('./yarn-link-local');

global.QUnit = requireQUnit();

let cwd = path.resolve(__dirname, '..');

let tests = glob.sync('dist/@glimmer/**/*-node-test.js', { cwd });

let result = qunitRun(tests, {
  requires: [],
  reporter: FindReporter.findReporter('tap'),
});

console.log(result);

// Executes a command and pipes stdout back to the user.
function exec(command, args) {
  execa.sync(command, args, {
    stdio: 'inherit',
    preferLocal: true,
  });
}
