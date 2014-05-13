'use strict';

var fs   = require('fs');
var path = require('path');

function currentRevision() {
  var gitPath      = path.join(__dirname, '..','.git');
  var headFilePath = path.join(gitPath, 'HEAD');
  var headFile     = fs.readFileSync(headFilePath, {encoding: 'utf8'});
  var branchName   = headFile.split('/').slice(-1)[0].trim();
  var refPath      = headFile.split(' ')[1];
  var branchSHA;

  if (refPath) { // if in detached head mode this will be null
    var branchPath = path.join(gitPath, refPath.trim());
    branchSHA  = fs.readFileSync(branchPath);
  } else {
    branchSHA = branchName;
  }

  return branchSHA.slice(0,8);
}

module.exports = function calculateVersion() {
  var packageVersion  = require('../package.json').version;

  if (packageVersion.indexOf('+') > -1) {
    return packageVersion + '.' + currentRevision();
  } else {
    return packageVersion;
  }
};
