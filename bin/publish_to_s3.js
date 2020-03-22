'use strict';

const buildInfo = require('../broccoli/build-info').buildInfo();

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

if (!buildInfo.isBuildForTag) {
  const S3Publisher = require('ember-publisher');
  const configPath = require('path').join(__dirname, '../config/s3ProjectConfig.js');

  let publisher = new S3Publisher({ projectConfigPath: configPath });

  publisher.currentBranch = function() {
    return buildInfo.channel;
  };

  publisher.publish();
}
