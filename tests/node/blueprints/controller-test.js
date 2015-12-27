var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | controller: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('controller foo', function() {
  return BlueprintHelper.generateAndDestroy(['controller', 'foo'], {
    files: [
      {
        file: 'app/controllers/foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Controller.extend({" + EOL + "});"
        ]
      },
      {
        file: 'tests/unit/controllers/foo-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('controller:foo'"
        ]
      }
    ]
  });
});

QUnit.test('controller foo/bar', function() {
  return BlueprintHelper.generateAndDestroy(['controller', 'foo/bar'], {
    files: [
      {
        file: 'app/controllers/foo/bar.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Controller.extend({" + EOL + "});"
        ]
      },
      {
        file: 'tests/unit/controllers/foo/bar-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('controller:foo/bar'"
        ]
      }
    ]
  });
});
