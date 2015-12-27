var Promise            = require('ember-cli/lib/ext/promise');
var fs                 = require('fs-extra');
var path               = require('path');
var remove             = Promise.denodeify(fs.remove);
var QUnit              = require('qunitjs');
var moduleForBlueprint = require('ember-cli-blueprint-test-helpers/lib/qunit').moduleForBlueprint;
var BlueprintHelper    = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var EOL                = require('os').EOL;

moduleForBlueprint(QUnit, 'Acceptance | Blueprints | route: generate and destroy', {
  afterEach: function(assert) {
    assert.ok(true, "Test completed successfully.");
  }
});

QUnit.test('route foo', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'foo'], {
    files: [
      {
        file: 'app/router.js',
        contains: 'this.route(\'foo\')'
      },
      {
        file: 'app/routes/foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({" + EOL + "});"
        ]
      },
      {
        file: 'app/templates/foo.hbs',
        contains: '{{outlet}}'
      },
      {
        file: 'tests/unit/routes/foo-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('route:foo'"
        ]
      }
    ]
  });
});

QUnit.test('route foo with --skip-router', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'foo', '--skip-router'], {
    files: [
      {
        file: 'app/router.js',
        doesNotContain: 'this.route(\'foo\')'
      },
      {
        file: 'app/routes/foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({" + EOL + "});"
        ]
      },
      {
        file: 'app/templates/foo.hbs',
        contains: '{{outlet}}'
      },
      {
        file: 'tests/unit/routes/foo-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('route:foo'"
        ]
      }
    ]
  });
});

QUnit.test('route foo with --path', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'foo', '--path=:foo_id/show'], {
    files: [
      {
        file: 'app/router.js',
        contains: [
          'this.route(\'foo\', {',
          'path: \':foo_id/show\'',
          '});'
        ]
      }
    ]
  });
});

QUnit.test('route foo with --reset-namespace', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'foo', '--reset-namespace'], {
    files: [
      {
        file: 'app/router.js',
        contains: [
          'this.route(\'foo\', {',
          'resetNamespace: true',
          '});'
        ]
      }
    ]
  });
});

QUnit.test('route foo with --reset-namespace=false', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'foo', '--reset-namespace=false'], {
    files: [
      {
        file: 'app/router.js',
        contains: [
          'this.route(\'foo\', {',
          'resetNamespace: false',
          '});'
        ]
      }
    ]
  });
});

QUnit.test('route index', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'index'], {
    files: [
      {
        file: 'app/router.js',
        doesNotContain: "this.route('index');"
      }
    ]
  });
});

QUnit.test('route basic isn\'t added to router', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'basic'], {
    files: [
      {
        file: 'app/router.js',
        doesNotContain: "this.route('basic');"
      },
      {
        file: 'app/routes/basic.js'
      }
    ]
  });
});

QUnit.test('route foo --dry-run does not change router.js', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'foo', '--dry-run'], {
    files: [
      {
        file: 'app/router.js',
        doesNotContain: "route('foo')"
      }
    ]
  });
});

QUnit.test('route application', function() {
  return BlueprintHelper.generateAndDestroy(['route', 'application'], {
    beforeGenerate: function() {
      return remove(path.join('app', 'templates', 'application.hbs'));
    },

    files: [
      {
        file: 'app/router.js',
        doesNotContain: "this.route('application');"
      }
    ]
  });
});
