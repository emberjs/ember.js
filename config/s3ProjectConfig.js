'use strict';

const semver = require('semver');

function fileMap(revision, tag, date) {
  let filesToPublish = {
    "ember.debug.js":             fileObject("ember.debug",             ".js",   "text/javascript",  revision, tag, date),
    "ember-testing.js":           fileObject("ember-testing",           ".js",   "text/javascript",  revision, tag, date),
    "ember-tests.js":             fileObject("ember-tests",             ".js",   "text/javascript",  revision, tag, date),
    "ember-runtime.js":           fileObject("ember-runtime",           ".js",   "text/javascript",  revision, tag, date),
    "ember-template-compiler.js": fileObject("ember-template-compiler", ".js",   "text/javascript",  revision, tag, date),
    "ember.min.js":               fileObject("ember.min",               ".js",   "text/javascript",  revision, tag, date),
    "ember.prod.js":              fileObject("ember.prod",              ".js",   "text/javascript",  revision, tag, date),
    "../docs/data.json":          fileObject("ember-docs",              ".json", "application/json", revision, tag, date),
    "tests/index.html":           fileObject("ember-tests-index",       ".json", "application/json", revision, tag, date),
    "bower.json":                 fileObject("bower",                   ".json", "application/json", revision, tag, date),
    "component.json":             fileObject("component",               ".json", "application/json", revision, tag, date),
    "composer.json":              fileObject("composer",                ".json", "application/json", revision, tag, date),
    "package.json":               fileObject("package",                 ".json", "application/json", revision, tag, date),
  };

  let version = require('../package').version;
  // semver.parse(...).version drops the `+build-info-metadata` stuff
  let sanitizedVersion = semver.parse(version).version;
  filesToPublish[`../ember-source-${sanitizedVersion}.tgz`] = {
    contentType: 'application/x-gzip',
    destinations: {
      'alpha': [
        `alpha/daily/${date}.tgz`,
        `alpha/shas/${revision}.tgz`,
      ],
      'canary': [
        `canary/daily/${date}.tgz`,
        `canary/shas/${revision}.tgz`,
      ],
      'beta': [
        `beta/daily/${date}.tgz`,
        `beta/shas/${revision}.tgz`,
      ],
      'release': [
        `release/daily/${date}.tgz`,
        `release/shas/${revision}.tgz`,
      ],
    }
  };
  filesToPublish['../build-metadata.json'] = {
    contentType: 'application/json',
    destinations: {
      'alpha': [
        'alpha.json',
      ],
      'canary': [
        'canary.json',
      ],
      'beta': [
        'beta.json',
      ],
      'release': [
        'release.json',
      ],
    }
  };

  return filesToPublish;
}

function fileObject(baseName, extension, contentType, currentRevision, tag, date) {
  var fullName = "/" + baseName + extension;
  var obj =  {
    contentType: contentType,
    destinations: {
      alpha: [
        "alpha" + fullName,
        "alpha/daily/" + date + fullName,
        "alpha/shas/" + currentRevision + fullName
      ],
      canary: [
        "latest" + fullName,
        "canary" + fullName,
        "canary/daily/" + date + fullName,
        "canary/shas/" + currentRevision + fullName
      ],
      release: [
        "stable" + fullName,
        "release" + fullName,
        "release/daily/" + date + fullName,
        "release/shas/" + currentRevision + fullName
      ],
      beta: [
        "beta" + fullName,
        "beta/daily/" + date + fullName,
        "beta/shas/" + currentRevision + fullName
      ],
      wildcard: []
    }
  };

  if (tag) {
    for (var key in obj.destinations) {
      obj.destinations[key].push("tags/" + tag + fullName);
    }
  }

  return obj;
}

module.exports = fileMap;
