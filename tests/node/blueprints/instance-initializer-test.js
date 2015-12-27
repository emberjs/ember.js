var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | instance-initializer: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('instance-initializer foo', function() {
  return BlueprintHelper.generateAndDestroy(['instance-initializer', 'foo'], {
    files: [
      {
        file: 'app/instance-initializers/foo.js',
        contains: "export function initialize(/* appInstance */) {" + EOL +
                  "  // appInstance.registry.injection('route', 'foo', 'service:foo');" + EOL +
                  "}" + EOL +
                  "" + EOL+
                  "export default {" + EOL +
                  "  name: 'foo'," + EOL +
                  "  initialize: initialize" + EOL +
                  "};"
      },
      {
        file: 'tests/unit/instance-initializers/foo-test.js',
        contains: "import { initialize } from '../../../instance-initializers/foo';"
      }
    ]
  });
});

QUnit.test('instance-initializer foo/bar', function() {
  return BlueprintHelper.generateAndDestroy(['instance-initializer', 'foo/bar'], {
    files: [
      {
        file: 'app/instance-initializers/foo/bar.js',
        contains: "export function initialize(/* appInstance */) {" + EOL +
                  "  // appInstance.registry.injection('route', 'foo', 'service:foo');" + EOL +
                  "}" + EOL +
                  "" + EOL+
                  "export default {" + EOL +
                  "  name: 'foo/bar'," + EOL +
                  "  initialize: initialize" + EOL +
                  "};"
      },
      {
        file: 'tests/unit/instance-initializers/foo/bar-test.js',
        contains: "import { initialize } from '../../../../instance-initializers/foo/bar';"
      }
    ]
  });
});
