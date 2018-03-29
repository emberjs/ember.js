"use strict";
const child_process = require("child_process");

const yarnConfig = JSON.parse(JSON.parse(require('child_process').execSync('yarn --json config current', { encoding: 'utf8' })).data);
const linkedModules = yarnConfig.linkedModules.filter((m) => m.startsWith('@glimmer/'));

linkedModules.forEach(mod => {
  child_process.execSync(`yarn unlink "${mod}"`);
});

child_process.execSync(`yarn --check-files`);
