#!/usr/bin/env node

const execSync = require('child_process').execSync;

function exec(command) {
  execSync(command, {
    stdio: 'inherit'
  });
}

exec("tsc -p build/tsconfig.commonjs.json");
exec("tsc -p build/tsconfig.modules.json");