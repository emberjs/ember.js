/* eslint-disable no-console */

'use strict';

const BaseVersionRegex = /(\d+\.\d+\.0).*/;
const AlphaCountRegex = /.*-alpha\.(\d+)/;

const PackageVersion = require('../package.json').version;
const LatestAlpha = process.argv.slice(2)[0];

const BaseVersionFromPackageJSON = baseVersionFrom(PackageVersion);
const BaseVersionFromLatestAlpha = baseVersionFrom(LatestAlpha);

if (BaseVersionFromPackageJSON === BaseVersionFromLatestAlpha) {
  const latestAlphaCount = Number(AlphaCountRegex.exec(LatestAlpha)[1]);
  console.log(`${BaseVersionFromLatestAlpha}-alpha.${latestAlphaCount + 1}`);
} else {
  console.log(`${BaseVersionFromPackageJSON}-alpha.1`);
}

function baseVersionFrom(version) {
  return BaseVersionRegex.exec(version)[1];
}
