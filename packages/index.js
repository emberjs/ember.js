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

  vendored: {},

  // dependencies are not walked. You must specify all
  // deps including their own dependencies.
  dependencies: {
    "htmlbars": {
      node: true,
      lib: ["syntax-handlebars-inliner", "htmlbars-util", "simple-html-tokenizer", "htmlbars-syntax", "htmlbars-compiler", "htmlbars-runtime", "morph"]
    },
    "htmlbars-syntax": {
      node: true,
      lib: ["syntax-handlebars-inliner", "htmlbars-util", "simple-html-tokenizer"]
    },
    "htmlbars-compiler": {
      node: true,
      lib: ["syntax-handlebars-inliner", "htmlbars-util", "simple-html-tokenizer", "htmlbars-syntax"],
      test: ["htmlbars-runtime", "morph", "htmlbars-test-helpers"]
    },
    "htmlbars-runtime": {
      lib: ["htmlbars-util", "morph"]
    },
    "morph": {
      node: true,
      test: ["util-handlebars-inliner", "htmlbars-util", "htmlbars-test-helpers"]
    },
    "htmlbars-util": {
      lib: ["util-handlebars-inliner"]
    },
    "htmlbars-test-helpers": { }
  }
};
