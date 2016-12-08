#!/usr/bin/env node

// To invoke this from the commandline you need the following to env vars to exist:
//
// S3_BUCKET_NAME
// TRAVIS_BRANCH
// TRAVIS_TAG
// TRAVIS_COMMIT
// S3_SECRET_ACCESS_KEY
// S3_ACCESS_KEY_ID
//
// Once you have those, you execute with the following:
//
// ```sh
// ./bin/publish_to_s3.js
// ```
var S3Publisher = require('ember-publisher');
var configPath = require('path').join(__dirname, '../config/s3ProjectConfig.js');

var publisher = new S3Publisher({ projectConfigPath: configPath });

publisher.currentBranch = function() {
  return process.env.BUILD_TYPE || {
    master: 'canary',
    beta: 'beta',
    release: 'release',
    'lts-2-4': 'lts-2-4',
    'release-1-13': 'release-1-13'
  }[this.CURRENT_BRANCH];
};

publisher.publish();
