#!/usr/bin/env node

// This script is used to check that there are no syntax or type errors in the
// entire repo. VS Code uses this information in the Problems window to display
// global problems in the project.

const spawn = require('child_process').spawn;

spawn(__dirname + '/../node_modules/.bin/tsc', ['--noEmit'], {
  stdio: 'inherit'
});