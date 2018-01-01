'use strict';

const getGitInfo = require('git-repo-info');
const path = require('path');

module.exports.VERSION = (() => {
  let info = getGitInfo(path.resolve(__dirname, '..'));
  // if the current commit _is_ a tagged commit, use the tag as the version
  // number
  if (info.tag) {
    return info.tag.replace(/^v/, '');
  }

  let pkg = require('../package');
  // if `_versionPreviouslyCalculated` is set the `package.json` version string
  // _already_ includes the branch, sha, etc (from bin/build-for-publishing.js)
  // so just use it directly
  if (pkg._versionPreviouslyCalculated) {
    return pkg.version;
  }

  // otherwise build the version number up of:
  //
  // * actual package.json version string
  // * current "build type" or branch name (in CI this is generally not
  //   present, but it is very useful for local / testing builds)
  // * the sha for the commit
  let packageVersion  = pkg.version;
  let sha = info.sha || '';
  let suffix = process.env.BUILD_TYPE || info.branch;
  let metadata = sha.slice(0, 8);

  return `${packageVersion}${suffix ? '-' + suffix : ''}+${metadata}`;
})();
