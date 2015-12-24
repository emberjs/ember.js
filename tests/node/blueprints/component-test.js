var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | component: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('component x-foo', function() {
  debugger;

  return BlueprintHelper.generateAndDestroy(['component', 'x-foo'], {
    files: [
      {
        file: 'app/components/x-foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Component.extend({",
          "});"
        ]
      },
      {
        file: 'app/templates/components/x-foo.hbs',
        contains: "{{yield}}"
      },
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

QUnit.test('component foo/x-foo', function() {
  return BlueprintHelper.generateAndDestroy(['component', 'foo/x-foo'], {
    files: [
      {
        file: 'app/components/foo/x-foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Component.extend({",
          "});"
        ]
      },
      {
        file: 'app/templates/components/foo/x-foo.hbs',
        contains: "{{yield}}"
      },
      {
        file: 'tests/integration/components/foo/x-foo-test.js',
        contains: [
          "import { moduleForComponent, test } from 'ember-qunit';",
          "import hbs from 'htmlbars-inline-precompile';",
          "moduleForComponent('foo/x-foo'",
          "integration: true",
          "{{foo/x-foo}}",
          "{{#foo/x-foo}}"
        ]
      }
    ]
  });
});

QUnit.test('component x-foo ignores --path option', function() {
  return BlueprintHelper.generateAndDestroy(['component', 'x-foo', '--path', 'foo'], {
    files: [
      {
        file: 'app/components/x-foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Component.extend({",
          "});"
        ]
      },
      {
        file: 'app/templates/components/x-foo.hbs',
        contains: "{{yield}}"
      },
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
