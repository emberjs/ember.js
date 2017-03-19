#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const chalk = require('chalk');
const readline = require('readline');
const semver = require('semver');

// Fail fast if we haven't done a build first.
assertDistExists();

let cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load up the built packages in dist.
let packages = findPackages();
let packageNames = packages.map(package => package.name);
let newVersion;
let distTag;

// Begin interactive CLI
printExistingVersions();
promptForVersion();

function printExistingVersions() {
  let packageVersions = packages.map(package => [package.name, package.version]);
  printPadded(packageVersions);
}

function promptForVersion() {
  let defaultVersion = generateDefaultVersion();

  cli.question(chalk.green(`\nNew version to publish? [${defaultVersion}] `), version => {
    version = version.trim();
    if (version === '') {
      version = defaultVersion;
    }

    validateNewVersion(version);
    console.log(chalk.green(`Publishing v${version}...`));

    newVersion = version;
    applyNewVersion();
    confirmPublish();
  });
}

function generateDefaultVersion() {
  let currentVersion = require('../package.json').version;
  return semver.inc(currentVersion, 'pre', 'alpha');
}

// function datestamp() {
//   return new Date().toISOString().substring(0, 10).replace(/-/g, '');
// }

// function shastamp() {
//   return execSync('git rev-parse --short HEAD').toString().trim();
// }

function validateNewVersion(version) {
  if (version === '') { fatalError("Version must not be empty."); }
  if (!semver.valid(version)) { fatalError("Version must be a valid SemVer version."); }

  packages.forEach(package => {
    if (!semver.gt(version, package.version)) {
      fatalError(`Version must be greater than existing versions. ${package.name} has version ${package.version}, which is greater than or equal to ${version}.`);
    }
  });
}

function applyNewVersion() {
  console.log(`Apply ${newVersion}`);

  packages.forEach(package => {
    package.pkg.version = newVersion;
    package.updateDependencies();
    package.savePackageJSON();
  });
}

function confirmPublish() {
  distTag = semver.prerelease(newVersion) ? 'next' : 'latest';

  console.log(chalk.blue("Version"), newVersion);
  console.log(chalk.blue("Dist Tag"), distTag);

  cli.question(chalk.bgRed.white.bold("Are you sure? [Y/N]") + " ", answer => {
    if (answer !== 'y' && answer !== 'Y') {
      console.log(chalk.red("Aborting"));
    }

    packages.forEach(package => {
      let command = `npm publish --tag next`;
      console.log(chalk.grey(package.relativePath), "->", command)
      execSync(command, {
        cwd: package.absolutePath
      });
    });

    console.log(chalk.green.bold(`v${newVersion} deployed!`));
    console.log(chalk.green('\nDone.'));
    cli.close();
  });
}

function fatalError(message) {
  console.log(chalk.red(message));
  process.exit(1);
}

function throwNoPackagesErr() {
  console.log(chalk.red('No dist directory found. Did you do a build first?'))
  process.exit(1);
}

function assertDistExists() {
  try {
    let stat = fs.statSync('dist');
    if (!stat.isDirectory()) {
      throwNoPackagesErr()
    }
  } catch (e) {
    throwNoPackagesErr();
  }
}

function findPackages() {
  class Package {
    constructor(absolutePath) {
      this.absolutePath = absolutePath;
      this.pkg = require(absolutePath + '/package.json');
    }

    get name() {
      return this.pkg.name;
    }

    get version() {
      return this.pkg.version;
    }

    get relativePath() {
      return path.relative(process.cwd(), this.absolutePath);
    }

    updateDependencies() {
      this._updateDependencies(this.pkg.dependencies);
      this._updateDependencies(this.pkg.devDependencies);
    }

    _updateDependencies(deps) {
      if (!deps) { return; }

      Object.keys(deps).forEach(dep => {
        if (packageNames.indexOf(dep) >= 0) {
          deps[dep] = `^${newVersion}`;
        }
      });
    }

    savePackageJSON() {
      fs.writeFileSync(this.absolutePath + '/package.json', JSON.stringify(this.pkg, null, 2));
    }
  }

  let distPath = __dirname + '/../dist/@glimmer';
  let packages = fs.readdirSync(distPath);

  if (!packages.length) { throwNoPackagesErr(); }

  return packages
    .map(package => `${distPath}/${package}`)
    .map(package => new Package(package));
}

function printPadded(table) {
  let maxWidth = Math.max(...table.map(r => r[0].length));
  table.forEach(row => {
    console.log(chalk.blue(pad(row[0], maxWidth)) + "  " + row[1]);
  })
}

function pad(string, width) {
  return string + " ".repeat(width - string.length);
}