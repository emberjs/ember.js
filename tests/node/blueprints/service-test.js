var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | service: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('service foo', function() {
  return BlueprintHelper.generateAndDestroy(['service', 'foo'], {
    files: [
      {
        file: 'app/services/foo.js',
        contains: [
          "import Ember from 'ember';",
          'export default Ember.Service.extend({' + EOL + '});'
        ]
      },
      {
        file: 'tests/unit/services/foo-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('service:foo'"
        ]
      }
    ]
  });
});

QUnit.test('service foo/bar', function() {
  return BlueprintHelper.generateAndDestroy(['service', 'foo/bar'], {
    files: [
      {
        file: 'app/services/foo/bar.js',
        contains: [
          "import Ember from 'ember';",
          'export default Ember.Service.extend({' + EOL + '});'
        ]
      },
      {
        file: 'tests/unit/services/foo/bar-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('service:foo/bar'"
        ]
      }
    ]
  });
});
