const getGitInfo = require('git-repo-info');
const path = require('path');

let info = getGitInfo(path.resolve(__dirname, '..'));
if (info.tag) {
  return info.tag.replace(/^v/, '');
}

let packageVersion  = require('../package.json').version;
let sha = info.sha || '';
let prefix = packageVersion + '-' + (process.env.BUILD_TYPE || info.branch);

module.exports.VERSION = prefix + '+' + sha.slice(0, 8);