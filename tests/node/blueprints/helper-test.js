var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | helper: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('helper foo-bar', function() {
  return BlueprintHelper.generateAndDestroy(['helper', 'foo-bar'], {
    files: [
      {
        file: 'app/helpers/foo-bar.js',
        contains: "import Ember from 'ember';" + EOL + EOL +
                  "export function fooBar(params/*, hash*/) {" + EOL +
                  "  return params;" + EOL +
                  "}" +  EOL + EOL +
                  "export default Ember.Helper.helper(fooBar);"
      },
      {
        file: 'tests/unit/helpers/foo-bar-test.js',
        contains: "import { fooBar } from '../../../helpers/foo-bar';"
      }
    ]
  });
});

QUnit.test('helper foo/bar-baz', function() {
  return BlueprintHelper.generateAndDestroy(['helper', 'foo/bar-baz'], {
    files: [
      {
        file: 'app/helpers/foo/bar-baz.js',
        contains: "import Ember from 'ember';" + EOL + EOL +
                  "export function fooBarBaz(params/*, hash*/) {" + EOL +
                  "  return params;" + EOL +
                  "}" + EOL + EOL +
                  "export default Ember.Helper.helper(fooBarBaz);"
      },
      {
        file: 'tests/unit/helpers/foo/bar-baz-test.js',
        contains: "import { fooBarBaz } from '../../../../helpers/foo/bar-baz';"
      }
    ]
  });
});
