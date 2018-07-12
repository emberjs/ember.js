'use strict';
/* eslint-env node, es6 */

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const buildInfo = require('../broccoli/build-info').buildInfo();

function exec(command, args) {
  // eslint-disable-next-line
  console.log(`\n\tRunning: \`${command} ${args.join(' ')}\``);
  let stream = execa(command, args);
  stream.stdout.pipe(process.stdout);
  return stream;
}

/*
  Updates the `package.json`'s `version` string to be the same value that
  the built assets will have as `Ember.VERSION`.
*/
function updatePackageJSONVersion() {
  let packageJSONPath = path.join(__dirname, '..', 'package.json');

  let pkgContents = fs.readFileSync(packageJSONPath, { encoding: 'utf-8' });
  let pkg = JSON.parse(pkgContents);
  if (!pkg._originalVersion) {
    pkg._originalVersion = pkg.version;
  }
  pkg._versionPreviouslyCalculated = true;
  pkg.version = buildInfo.version;
  fs.writeFileSync(packageJSONPath, JSON.stringify(pkg, null, 2), {
    encoding: 'utf-8',
  });
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
  docs.project.version = buildInfo.version;
  fs.writeFileSync(docsPath, JSON.stringify(docs, null, 2), {
    encoding: 'utf-8',
  });
}

Promise.resolve()
  .then(() => {
    updatePackageJSONVersion();
    // ensures that we tag this correctly
    return exec('auto-dist-tag', ['--write']);
  })
  .then(() => {
    // do a production build
    return exec('yarn', ['build']);
  })
  .then(() => {
    // generate docs
    return exec('yarn', ['docs']).then(() => {
      updateDocumentationVersion();
    });
  })
  .then(() => {
    // generate build-metadata.json
    const metadata = {
      version: buildInfo.version,
      buildType: buildInfo.channel,
      SHA: buildInfo.sha,
      assetPath: `/${buildInfo.channel}/shas/${buildInfo.sha}.tgz`,
    };
    fs.writeFileSync('build-metadata.json', JSON.stringify(metadata, null, 2), {
      encoding: 'utf-8',
    });

    // using npm pack here because `yarn pack` does not honor the `package.json`'s `files`
    // property properly, and therefore the tarball generated is quite large (~7MB).
    return exec('npm', ['pack']);
  })
  .then(
    // eslint-disable-next-line
    () => console.log('build-for-publishing completed succesfully!'),
    error => {
      // eslint-disable-next-line
      console.error(error);
      // eslint-disable-next-line
      console.log('build-for-publishing failed');
      // failure, must manually exit non-zero
      process.exit(1);
    }
  );
