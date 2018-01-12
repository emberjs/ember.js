#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;
const VERSION = require('../broccoli/version').VERSION;

/*
  Updates the `package.json`'s `version` string to be the same value that
  the built assets will have as `Ember.VERSION`.
*/
function updatePackageJSONVersion() {
  let packageJSONPath = path.join(__dirname, '..', 'package.json');

  let pkgContents = fs.readFileSync(packageJSONPath, { encoding: 'utf-8' });
  let pkg = JSON.parse(pkgContents);
  pkg._versionPreviouslyCalculated = true;
  pkg._originalVersion = pkg.version;
  pkg.version = VERSION;
  fs.writeFileSync(packageJSONPath, JSON.stringify(pkg, null, 2), { encoding: 'utf-8' });
}

/*
  Updates the version number listed within the docs/data.json file to match
  `Ember.VERSION` and `package.json` version.

  This is needed because ember-cli-yuidoc automatically sets the version string
  property in the generated `docs/data.json` to
`${packageJsonVersion}.${gitSha}`.
*/
function updateDocumentationVersion() {
  let docsPath = path.join(__dirname, '..', 'docs', 'data.json');

  let contents = fs.readFileSync(docsPath, { encoding: 'utf-8' });
  let docs = JSON.parse(contents);
  docs.project.version = VERSION;
  fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), { encoding: 'utf-8' });
}

updatePackageJSONVersion();

// do a production build
execSync('yarn build');

// generate docs
execSync('yarn docs');
updateDocumentationVersion();

// generate build-metadata.json
const metadata = {
  version: VERSION,
  buildType: process.env.BUILD_TYPE,
  SHA: process.env.TRAVIS_COMMIT,
  assetPath: `/${process.env.BUILD_TYPE}/shas/${process.env.TRAVIS_COMMIT}.tgz`,
};
fs.writeFileSync('build-metadata.json', JSON.stringify(metadata, null, 2), { encoding: 'utf-8' });

// using npm pack here because `yarn pack` does not honor the `package.json`'s `files`
// property properly, and therefore the tarball generated is quite large (~7MB).
execSync('npm pack');
