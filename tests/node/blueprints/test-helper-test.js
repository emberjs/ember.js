var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | test-helper: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('test-helper foo', function() {
  return BlueprintHelper.generateAndDestroy(['test-helper', 'foo'], {
    files: [
      {
        file: 'tests/helpers/foo.js',
        contains: "import Ember from 'ember';" + EOL +
                  EOL +
                  "export default Ember.Test.registerAsyncHelper('foo', function(app) {" + EOL +
                  EOL +
                  "});"
      }
    ]
  });
});
