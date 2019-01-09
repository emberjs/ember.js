'use strict';
const child_process = require('child_process');

const yarnConfig = JSON.parse(
  JSON.parse(
    require('child_process').execSync('yarn --json config current', {
      encoding: 'utf8',
    })
  ).data
);
const linkedModules = yarnConfig.linkedModules.filter(
  m => m.startsWith('@glimmer/') || m.startsWith('@glimmer\\')
);

console.log(`modules ${JSON.stringify(linkedModules)}`);

linkedModules.forEach(mod => {
  console.log(`linking ${mod}`);
  child_process.execSync(`yarn link "${mod}"`);
});
