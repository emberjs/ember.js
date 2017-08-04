#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const chalk = require('chalk');
const readline = require('readline');
const semver = require('semver');

const Project = require('../build/utils/project');

const DIST_PATH = path.resolve(__dirname, '../dist/node_modules');
const PACKAGES_PATH = path.resolve(__dirname, '../packages');

const DRY_RUN = process.argv.indexOf('--dry-run') > -1;
if (DRY_RUN) {
  console.log(chalk.yellow("--dry-run"), "- side effects disabled");
}

// Fail fast if we haven't done a build first.
assertDistExists();
assertGitIsClean();

let cli = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load up the built packages in dist.
let packages = Project.from(DIST_PATH)
  .packages
  .filter(pkg => pkg.isPublishable);

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
    gitCommitAndTag();
    confirmPublish();
  });
}

function generateDefaultVersion() {
  let currentVersion = require('../package.json').version;
  return semver.inc(currentVersion, 'patch');
}

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

  // Update packages in the dist directory
  packages.forEach(package => {
    package.pkg.version = newVersion;
    package.updateDependencies(newVersion);

    if (!DRY_RUN) {
      package.savePackageJSON();
    }
  });

  // Update source packages
  Project.from(PACKAGES_PATH)
    .packages
    .forEach(package => {
      package.pkg.version = newVersion;
      package.updateDependencies(newVersion);

      if (!DRY_RUN) {
        package.savePackageJSON();
      }
      execWithSideEffects(`git add "${package.packageJSONPath}"`);
    });

  // Update root package.json
  let rootPkgPath = path.join(__dirname, '../package.json');
  let rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  rootPkg.version = newVersion;
  if (!DRY_RUN) {
    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));
      execWithSideEffects(`git add package.json`);
  }
}

function gitCommitAndTag() {
  execWithSideEffects(`git commit -m "Release v${newVersion}"`);
  execWithSideEffects(`git tag "v${newVersion}"`);
}

function confirmPublish() {
  distTag = semver.prerelease(newVersion) ? 'next' : 'latest';

  console.log(chalk.blue("Version"), newVersion);
  console.log(chalk.blue("Dist Tag"), distTag);

  cli.question(chalk.bgRed.white.bold("Are you sure? [Y/N]") + " ", answer => {
    if (answer !== 'y' && answer !== 'Y') {
      console.log(chalk.red("Aborting"));
      cli.close();
      return;
    }

    packages.filter(pkg => !pkg.private).forEach(package => {
      execWithSideEffects(`npm publish --tag ${distTag}`, {
        cwd: package.absolutePath
      });
    });

    execWithSideEffects(`git push origin master --tags`);

    console.log(chalk.green(`\nv${newVersion} deployed!`));
    console.log(chalk.green('Done.'));
    cli.close();
  });
}

function fatalError(message) {
  console.log(chalk.red(message));
  process.exit(1);
}

function throwNoPackagesErr() {
  console.log(chalk.red('No dist directory found. Did you do a build first? (npm run build)'))
  process.exit(1);
}

function assertDistExists() {
  try {
    let stat = fs.statSync(DIST_PATH);
    if (!stat.isDirectory()) {
      throwNoPackagesErr()
    }
  } catch (e) {
    throwNoPackagesErr();
  }
}

function assertGitIsClean() {
  let status = execSync('git status').toString();
  let force = process.argv.indexOf('--force') > -1;

  if (!status.match(/^nothing to commit/m)) {
    if (force) {
      console.log(chalk.yellow("--force"), "- ignoring unclean git working tree");
    } else {
      console.log(chalk.red("Git working tree isn't clean. Use --force to ignore this warning."));
      process.exit(1);
    }
  }
}

function execWithSideEffects(cmd, options) {
  let cwd = '';
  if (options && options.cwd) {
    cwd = chalk.gray.dim(` (cwd: ${options.cwd}`);
  }

  console.log(chalk.green('>') + ' ' + chalk.gray(cmd) + cwd);
  if (!DRY_RUN) {
    return execSync.apply(null, arguments);
  }
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
