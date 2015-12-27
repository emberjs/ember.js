var QUnit = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | mixin: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('mixin foo', function() {
  return BlueprintHelper.generateAndDestroy(['mixin', 'foo'], {
    files: [
      {
        file: 'app/mixins/foo.js',
        contains: [
          "import Ember from 'ember';",
          'export default Ember.Mixin.create({' + EOL + '});'
        ]
      },
      {
        file: 'tests/unit/mixins/foo-test.js',
        contains: [
          "import FooMixin from '../../../mixins/foo';"
        ]
      }
    ]
  });
});

QUnit.test('mixin foo/bar', function() {
  return BlueprintHelper.generateAndDestroy(['mixin', 'foo/bar'], {
    files: [
      {
        file: 'app/mixins/foo/bar.js',
        contains: [
          "import Ember from 'ember';",
          'export default Ember.Mixin.create({' + EOL + '});'
        ]
      },
      {
        file: 'tests/unit/mixins/foo/bar-test.js',
        contains: [
          "import FooBarMixin from '../../../mixins/foo/bar';"
        ]
      }
    ]
  });
});

QUnit.test('mixin foo/bar/baz', function() {
  return BlueprintHelper.generateAndDestroy(['mixin', 'foo/bar/baz'], {
    files: [
      {
        file: 'tests/unit/mixins/foo/bar/baz-test.js',
        contains: [
          "import FooBarBazMixin from '../../../mixins/foo/bar/baz';"
        ]
      }
    ]
  });
});
