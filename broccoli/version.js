'use strict';

const getGitInfo = require('git-repo-info');
const path = require('path');

module.exports.VERSION = (() => {
  let info = getGitInfo(path.resolve(__dirname, '..'));
  if (info.tag) {
    return info.tag.replace(/^v/, '');
  }

  let packageVersion  = require('../package.json').version;
  let sha = info.sha || '';
  let suffix = process.env.BUILD_TYPE || info.branch;
  let metadata = sha.slice(0, 8);

  return `${packageVersion}${suffix ? '-' + suffix : ''}+${metadata}`;
})();
