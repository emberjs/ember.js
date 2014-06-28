var S3Publisher = require('../lib/s3_publisher.js');
var assert = require("assert");

describe('S3Publisher.publish', function(){
  var defaultOptions = {
    S3_BUCKET_NAME:"myBucket",
    TRAVIS_BRANCH: "master",
    TRAVIS_TAG: "foo-tag",
    TRAVIS_COMMIT: "foo-commit",
    S3_SECRET_ACCESS_KEY: "s3-secret-access-key",
    S3_ACCESS_KEY_ID: "s3-access-key"
  }

  it('publishes to the appropriate locations for master', function(){
    var publisher = new S3Publisher(defaultOptions);
    publisher.uploadFile = function(){
      uploadFileLocations.push(arguments[2]);
    };

    var uploadFileLocations = [];
    var date =  new Date().toISOString().replace(/-/g, '').replace(/T.+/, '');


    expectedLocations = [
      'ember-latest.js',
      'latest/ember.js',
      'canary/ember.js',
      'canary/daily/' + date + '/ember.js',
      'canary/shas/foo-commit/ember.js',
      'tags/foo-tag/ember.js',
      'ember-test-latest.js',
      'latest/ember-test.js',
      'canary/ember-test.js',
      'canary/daily/' + date + '/ember-test.js',
      'canary/shas/foo-commit/ember-test.js',
      'tags/foo-tag/ember-test.js',
      'ember-template-compiler-latest.js',
      'latest/ember-template-compiler.js',
      'canary/ember-template-compiler.js',
      'canary/daily/' + date + '/ember-template-compiler.js',
      'canary/shas/foo-commit/ember-template-compiler.js',
      'tags/foo-tag/ember-template-compiler.js',
      'ember-runtime-latest.js',
      'latest/ember-runtime.js',
      'canary/ember-runtime.js',
      'canary/daily/' + date + '/ember-runtime.js',
      'canary/shas/foo-commit/ember-runtime.js',
      'tags/foo-tag/ember-runtime.js',
      'ember.min-latest.js',
      'latest/ember.min.js',
      'canary/ember.min.js',
      'canary/daily/' + date + '/ember.min.js',
      'canary/shas/foo-commit/ember.min.js',
      'tags/foo-tag/ember.min.js',
      'ember.prod-latest.js',
      'latest/ember.prod.js',
      'canary/ember.prod.js',
      'canary/daily/' + date +  '/ember.prod.js',
      'canary/shas/foo-commit/ember.prod.js',
      'tags/foo-tag/ember.prod.js' ]

    publisher.publish();
    assert.deepEqual(expectedLocations, uploadFileLocations, "Destinations were not correct.");
  });

  it("errors when file doesn't exist in dist", function(){
    var publisher = new S3Publisher(defaultOptions);
    publisher.fileMap = function(){
      return { "non-existent-file.js": {destinations: {canary: ["foo/bar"]}} }
    };
    assert.throws(publisher.publish.bind(publisher), /doesn't exist!/, "unexpected error");
  });
})
