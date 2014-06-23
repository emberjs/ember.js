var fs = require('fs');
var path = require('path');
var packageJson = require('../package.json');

function getVersion() {
  return packageJson.version;
}

function getRevision() {
  var gitPath      = path.join(__dirname, '..','.git');
  var headFilePath = path.join(gitPath, 'HEAD');
  var headFile     = fs.readFileSync(headFilePath, {encoding: 'utf8'});
  var branchName   = headFile.split('/').slice(-1)[0].trim();
  var refPath      = headFile.split(' ')[1];

  if (refPath) { // if in detached head mode this will be null
    var branchPath = path.join(gitPath, refPath.trim());
    return fs.readFileSync(branchPath, {encoding: 'utf8'}).trim();
  } else {
    return branchName;
  }
}

module.exports = {
  version: getVersion(),
  revision: getRevision(),

  vendored: {
    "handlebars": true,
    "simple-html-tokenizer": true
  },

  dependencies: {
    "htmlbars-compiler": {
      lib: ["handlebars", "simple-html-tokenizer"],
      test: ["htmlbars-runtime"]
    },
    "htmlbars-runtime": {
      lib: ["morph", "handlebars"]
    },
    "morph": {
      test: ["handlebars"]
    }
  }
};
