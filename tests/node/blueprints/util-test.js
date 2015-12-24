var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | util: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('util foo-bar', function() {
  return BlueprintHelper.generateAndDestroy(['util', 'foo-bar'], {
    files: [
      {
        file: 'app/utils/foo-bar.js',
        contains: 'export default function fooBar() {' + EOL +
                  '  return true;' + EOL +
                  '}'
      },
      {
        file: 'tests/unit/utils/foo-bar-test.js',
        contains: [
          "import fooBar from '../../../utils/foo-bar';"
        ]
      }
    ]
  });
});

QUnit.test('util foo-bar/baz', function() {
  return BlueprintHelper.generateAndDestroy(['util', 'foo/bar-baz'], {
    files: [
      {
        file: 'app/utils/foo/bar-baz.js',
        contains: 'export default function fooBarBaz() {' + EOL +
                  '  return true;' + EOL +
                  '}'
      },
      {
        file: 'tests/unit/utils/foo/bar-baz-test.js',
        contains: [
          "import fooBarBaz from '../../../utils/foo/bar-baz';"
        ]
      }
    ]
  });
});
