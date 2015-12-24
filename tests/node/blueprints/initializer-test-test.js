var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | initializer-test: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('initializer-test foo', function() {
  return BlueprintHelper.generateAndDestroy(['initializer-test', 'foo'], {
    files: [
      {
        file: 'tests/unit/initializers/foo-test.js',
        contains: [
          "import FooInitializer from '../../../initializers/foo';",
          "module('Unit | Initializer | foo'",
          "let application;",
          "FooInitializer.initialize(application);"
        ]
      }
    ]
  });
});
