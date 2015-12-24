var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | initializer: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('initializer foo', function() {
  return BlueprintHelper.generateAndDestroy(['initializer', 'foo'], {
    files: [
      {
        file: 'app/initializers/foo.js',
        contains: "export function initialize(/* application */) {" + EOL +
                  "  // application.inject('route', 'foo', 'service:foo');" + EOL +
                  "}" + EOL +
                  "" + EOL+
                  "export default {" + EOL +
                  "  name: 'foo'," + EOL +
                  "  initialize" + EOL +
                  "};"
      },
      {
        file: 'tests/unit/initializers/foo-test.js',
        contains: "import FooInitializer from '../../../initializers/foo';"
      }
    ]
  });
});

QUnit.test('initializer foo/bar', function() {
  return BlueprintHelper.generateAndDestroy(['initializer', 'foo/bar'], {
    files: [
      {
        file: 'app/initializers/foo/bar.js',
        contains: "export function initialize(/* application */) {" + EOL +
                  "  // application.inject('route', 'foo', 'service:foo');" + EOL +
                  "}" + EOL +
                  "" + EOL+
                  "export default {" + EOL +
                  "  name: 'foo/bar'," + EOL +
                  "  initialize" + EOL +
                  "};"
      },
      {
        file: 'tests/unit/initializers/foo/bar-test.js',
        contains: "import FooBarInitializer from '../../../../initializers/foo/bar';"
      }
    ]
  });
});
