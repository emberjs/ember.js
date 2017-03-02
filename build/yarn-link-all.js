#!/usr/bin/env node
"use strict";
const fs = require('fs');
const child_process = require('child_process');
const cwd = process.cwd();
fs.readdirSync('packages/@glimmer').forEach(name => {
  let dir = `packages/@glimmer/${name}`;
  try {
    let stat = fs.statSync(dir);
    if (stat.isDirectory()) {
      console.log('yarn link', dir);
      process.chdir(dir);
      child_process.execSync('yarn link');
    }
  } finally {
    process.chdir(cwd);
  }
});
