#!/usr/bin/env node
"use strict";

const fs = require('fs');
const globSync = require('glob').sync;
const execSync = require('child_process').execSync;
const cwd = process.cwd();

const LINK_COMMAND = 'yarn link';

globSync('dist/**/@glimmer/*/', { cwd })
  .forEach(dir => {
    try {
      let stat = fs.statSync(dir);

      if (stat.isDirectory()) {
        console.log('\n', LINK_COMMAND, '->', dir);
        process.chdir(dir);
        execSync(LINK_COMMAND);
      }
    } finally {
      process.chdir(cwd);
    }
});
