/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');

const execa = require('execa');
/* eslint-disable-next-line node/no-extraneous-require */
const debug = require('debug')('test-external');
const rimraf = require('rimraf');
const chalk = require('chalk');
const cliArgs = require('command-line-args');
const root = path.resolve(__dirname, '../');

let cliOptionsDef = [{ name: 'projectName', defaultOption: true }];
let cliOptions = cliArgs(cliOptionsDef, { stopAtFirstUnknown: true });
const externalProjectName = cliOptions.projectName;

let argv = cliOptions._unknown || [];
cliOptionsDef = [{ name: 'gitUrl', defaultOption: true }];
cliOptions = cliArgs(cliOptionsDef, { stopAtFirstUnknown: true, argv });
const gitUrl = cliOptions.gitUrl;

const cachePath = '../__emberjs-test-cache';
const tempDir = path.join(root, cachePath);
const projectTempDir = path.join(tempDir, externalProjectName);

console.log(
  `Preparing to test external project ${externalProjectName} located at ${gitUrl} against this ember.js commit.`
);

function execWithLog(command, force) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));

  if (force) {
    return execa.sync(command, { stdio: [0, 1, 2], shell: true });
  }

  return execa.sync(command, { shell: true }).stdout;
}

function execCommand(command, force) {
  command = `cd ${projectTempDir} && ${command}`;
  return execWithLog(command, force);
}

if (!fs.existsSync(tempDir)) {
  debug(`Ensuring Cache Root at: ${tempDir}`);
  fs.mkdirSync(tempDir);
} else {
  debug(`Cache Root Exists at: ${tempDir}`);
}

if (fs.existsSync(projectTempDir)) {
  debug(`Cleaning Cache at: ${projectTempDir}`);
  rimraf.sync(projectTempDir);
} else {
  debug(`No cache present at: ${projectTempDir}`);
}

// install the project
try {
  execWithLog(`git clone --depth=1 ${gitUrl} ${projectTempDir}`);
} catch (e) {
  debug(e);
  throw new Error(
    `Install of ${gitUrl} in ${projectTempDir} for external project ${externalProjectName} testing failed.`
  );
}

const useYarn = fs.existsSync(path.join(projectTempDir, 'yarn.lock'));
const packageJsonLocation = path.join(projectTempDir, 'package.json');

let smokeTestPassed = true;
let commitTestPassed = true;

/**
 * -----------------
 * SMOKE TESTS FIRST
 * -----------------
 */
try {
  debug('Running Smoke Test');
  try {
    execCommand(`${useYarn ? 'yarn install' : 'npm install'}`);
  } catch (e) {
    debug(e);
    throw new Error(`Unable to complete install of dependencies for ${externalProjectName}`);
  }
  execCommand('./node_modules/.bin/ember test', true);
} catch (e) {
  console.log(e);
  smokeTestPassed = false;
}

/**
 * -----------------
 * INSTALL latest ember.js in external package
 * -----------------
 */
const currentSha = execWithLog(`git rev-parse HEAD`);
const cacheDir = path.join(root, `../__tarball-cache`);
const tarballDir = path.join(cacheDir, currentSha);

if (!fs.existsSync(cacheDir)) {
  debug(`Ensuring Cache Root at: ${cacheDir}`);
  fs.mkdirSync(cacheDir);
} else {
  debug(`Cache Root Exists at: ${cacheDir}`);
}

if (!fs.existsSync(tarballDir)) {
  debug(`Ensuring Tarball Cache for SHA ${currentSha} at: ${tarballDir}`);
  fs.mkdirSync(tarballDir);
} else {
  debug(`Tarball Cache Exists for SHA ${currentSha} at: ${tarballDir}`);
}

function generateTarball() {
  execWithLog(`cd ${tarballDir}; yarn build ${root}; npm pack ${root};`);

  debug(`npm pack successful at: ${tarballDir}`);
  const pkgPath = path.join(root, 'package.json');
  const pkg = require(pkgPath);

  return path.join(tarballDir, `${pkg.name}-${pkg.version}.tgz`);
}

function insertTarballsToPackageJson(fileLocation) {
  const location = require.resolve(fileLocation);
  const pkgInfo = JSON.parse(fs.readFileSync(location, 'utf8'));

  const thisPkgTarballPath = generateTarball();
  pkgInfo.devDependencies['ember-source'] = thisPkgTarballPath;

  fs.writeFileSync(location, JSON.stringify(pkgInfo, null, 2));
}

try {
  debug('Preparing Package To Run Tests Against Latest ember.js Commit');
  insertTarballsToPackageJson(packageJsonLocation);

  // clear node_modules installed for the smoke-test
  execCommand(`rm -rf node_modules`);

  execCommand(`${useYarn ? 'yarn install' : 'npm install'}`);
} catch (e) {
  console.log(`Unable to npm install tarballs for ${externalProjectName}. Original error below:`);

  throw e;
}

try {
  debug('Running tests against ember.js commit');
  execCommand('./node_modules/.bin/ember build');
  execCommand('./node_modules/.bin/ember test  --path="./dist"', true);
} catch (e) {
  console.error(e);
  commitTestPassed = false;
}

if (commitTestPassed && smokeTestPassed) {
  console.log(`${externalProjectName} tests passed`);
} else {
  throw new Error(`Tests failed. smoke: ${smokeTestPassed}, commit: ${commitTestPassed}`);
}
