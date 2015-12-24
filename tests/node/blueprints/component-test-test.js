var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | component-test: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('component-test x-foo', function() {
  return BlueprintHelper.generateAndDestroy(['component-test', 'x-foo'], {
    files: [
      {
        file: 'tests/integration/components/x-foo-test.js',
        contains: [
          "import { moduleForComponent, test } from 'ember-qunit';",
          "import hbs from 'htmlbars-inline-precompile';",
          "moduleForComponent('x-foo'",
          "integration: true",
          "{{x-foo}}",
          "{{#x-foo}}"
        ]
      }
    ]
  });
});

QUnit.test('component-test x-foo --unit', function() {
  return BlueprintHelper.generateAndDestroy(['component-test', 'x-foo', '--unit'], {
    files: [
      {
        file: 'tests/unit/components/x-foo-test.js',
        contains: [
          "import { moduleForComponent, test } from 'ember-qunit';",
          "moduleForComponent('x-foo'",
          "unit: true"
        ]
      }
    ]
  });
});
