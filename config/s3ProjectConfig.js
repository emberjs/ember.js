'use strict';

function fileMap(revision, date) {
  let filesToPublish = {
    '../docs/data.json': fileObject('ember-docs', '.json', 'application/json', revision, date),
  };

  let version = require('../package').version;
  filesToPublish[`../ember-source-${version}.tgz`] = {
    contentType: 'application/x-gzip',
    destinations: {
      alpha: [`alpha/daily/${date}.tgz`, `alpha/shas/${revision}.tgz`],
      canary: [`canary/daily/${date}.tgz`, `canary/shas/${revision}.tgz`],
      beta: [`beta/daily/${date}.tgz`, `beta/shas/${revision}.tgz`],
      release: [`release/daily/${date}.tgz`, `release/shas/${revision}.tgz`],
    },
  };
  filesToPublish['../build-metadata.json'] = {
    contentType: 'application/json',
    destinations: {
      alpha: ['alpha.json'],
      canary: ['canary.json'],
      beta: ['beta.json'],
      release: ['release.json'],
    },
  };

  return filesToPublish;
}

function fileObject(baseName, extension, contentType, currentRevision, date) {
  let fullName = '/' + baseName + extension;
  let obj = {
    contentType: contentType,
    destinations: {
      alpha: [
        'alpha' + fullName,
        'alpha/daily/' + date + fullName,
        'alpha/shas/' + currentRevision + fullName,
      ],
      canary: [
        'latest' + fullName,
        'canary' + fullName,
        'canary/daily/' + date + fullName,
        'canary/shas/' + currentRevision + fullName,
      ],
      release: [
        'stable' + fullName,
        'release' + fullName,
        'release/daily/' + date + fullName,
        'release/shas/' + currentRevision + fullName,
      ],
      beta: [
        'beta' + fullName,
        'beta/daily/' + date + fullName,
        'beta/shas/' + currentRevision + fullName,
      ],
      wildcard: [],
    },
  };

  return obj;
}

module.exports = fileMap;
