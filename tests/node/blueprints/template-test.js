var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | template: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('template foo', function() {
  return BlueprintHelper.generateAndDestroy(['template', 'foo'], {
    files: [
      {
        file: 'app/templates/foo.hbs',
        contains: []
      }
    ]
  });
});

QUnit.test('template foo/bar', function() {
  return BlueprintHelper.generateAndDestroy(['template', 'foo/bar'], {
    files: [
      {
        file: 'app/templates/foo/bar.hbs'
      }
    ]
  });
});
