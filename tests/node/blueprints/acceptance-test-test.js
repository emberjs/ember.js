var fs = require('fs');
var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | acceptance-test: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('acceptance-test foo', function() {
  return BlueprintHelper.generateAndDestroy(['acceptance-test', 'foo'], {
    files: [
      {
        file: 'tests/acceptance/foo-test.js',
        contains: fs.readFileSync('../../tests/node/blueprints/fixtures/acceptance-test-expected.js', 'utf8')
      }
    ]
  });
});
