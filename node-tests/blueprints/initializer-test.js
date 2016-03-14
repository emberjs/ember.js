'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy initializer', function() {
  setupTestHooks(this);

  it('initializer foo', function() {
    return generateAndDestroy(['initializer', 'foo'], {
      files: [
        {
          file:'app/initializers/foo.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file:'tests/unit/initializers/foo-test.js',
          contains: "import FooInitializer from 'my-app/initializers/foo';"
        }
      ]
    });
  });

  it('initializer foo/bar', function() {
    return generateAndDestroy(['initializer', 'foo/bar'], {
      files: [
        {
          file:'app/initializers/foo/bar.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file:'tests/unit/initializers/foo/bar-test.js',
          contains: "import FooBarInitializer from 'my-app/initializers/foo/bar';"
        }
      ]
    });
  });

  it('in-addon initializer foo', function() {
    return generateAndDestroy(['initializer', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'addon/initializers/foo.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/initializers/foo.js',
          contains: [
            "export { default, initialize } from 'my-addon/initializers/foo';"
          ]
        },
        {
          file: 'tests/unit/initializers/foo-test.js'
        }
      ]
    });
  });

  it('in-addon initializer foo/bar', function() {
    return generateAndDestroy(['initializer', 'foo/bar'], {
      target: 'addon',
      files: [
        {
          file: 'addon/initializers/foo/bar.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/initializers/foo/bar.js',
          contains: [
            "export { default, initialize } from 'my-addon/initializers/foo/bar';"
          ]
        },
        {
          file: 'tests/unit/initializers/foo/bar-test.js'
        }
      ]
    });
  });

  it('dummy initializer foo', function() {
    return generateAndDestroy(['initializer', 'foo', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/initializers/foo.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/initializers/foo.js',
          exists: false
        },
        {
          file: 'tests/unit/initializers/foo-test.js',
          exists: false
        }
      ]
    });
  });

  it('dummy initializer foo/bar', function() {
    return generateAndDestroy(['initializer', 'foo/bar', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/initializers/foo/bar.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/initializers/foo/bar.js',
          exists: false
        },
        {
          file: 'tests/unit/initializers/foo/bar-test.js',
          exists: false
        }
      ]
    });
  });

  it('in-repo-addon initializer foo', function() {
    return generateAndDestroy(['initializer', 'foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/initializers/foo.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'lib/my-addon/app/initializers/foo.js',
          contains: [
            "export { default, initialize } from 'my-addon/initializers/foo';"
          ]
        },
        {
          file: 'tests/unit/initializers/foo-test.js'
        }
      ]
    });
  });

  it('in-repo-addon initializer foo/bar', function() {
    return generateAndDestroy(['initializer', 'foo/bar', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/initializers/foo/bar.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'lib/my-addon/app/initializers/foo/bar.js',
          contains: [
            "export { default, initialize } from 'my-addon/initializers/foo/bar';"
          ]
        },
        {
          file: 'tests/unit/initializers/foo/bar-test.js'
        }
      ]
    });
  });

  /* Pod tests */

  it('initializer foo --pod', function() {
    return generateAndDestroy(['initializer', 'foo', '--pod'], {
      files: [
        {
          file: 'app/initializers/foo.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        }
      ]
    });
  });

  it('initializer foo --pod podModulePrefix', function() {
    return generateAndDestroy(['initializer', 'foo', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/initializers/foo.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        }
      ]
    });
  });

  it('initializer foo/bar --pod', function() {
    return generateAndDestroy(['initializer', 'foo/bar', '--pod'], {
      files: [
        {
          file: 'app/initializers/foo/bar.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        }
      ]
    });
  });


  it('initializer foo/bar --pod podModulePrefix', function() {
    return generateAndDestroy(['initializer', 'foo/bar', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/initializers/foo/bar.js',
          contains: "export function initialize(/* application */) {\n" +
                    "  // application.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        }
      ]
    });
  });


  it('initializer-test foo', function() {
    return generateAndDestroy(['initializer-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/initializers/foo-test.js',
          contains: [
            "import FooInitializer from 'my-app/initializers/foo';",
            "module('Unit | Initializer | foo'",
            "application = Ember.Application.create();",
            "FooInitializer.initialize(application);"
          ]
        }
      ]
    });
  });

  it('in-addon initializer-test foo', function() {
    return generateAndDestroy(['initializer-test', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/initializers/foo-test.js',
          contains: [
            "import FooInitializer from 'dummy/initializers/foo';",
            "module('Unit | Initializer | foo'",
            "application = Ember.Application.create();",
            "FooInitializer.initialize(application);"
          ]
        }
      ]
    });
  });

  it('initializer-test foo for mocha', function() {
    return generateAndDestroy(['initializer-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/initializers/foo-test.js',
          contains: [
            "import FooInitializer from 'my-app/initializers/foo';",
            "describe('FooInitializer', function() {",
            "application = Ember.Application.create();",
            "FooInitializer.initialize(application);"
          ]
        }
      ]
    });
  });
});
