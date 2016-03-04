'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy instance-initializer', function() {
  setupTestHooks(this);

  it('instance-initializer foo', function() {
    return generateAndDestroy(['instance-initializer', 'foo'], {
      files: [
        {
          file:'app/instance-initializers/foo.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file:'tests/unit/instance-initializers/foo-test.js',
          contains: "import { initialize } from 'my-app/instance-initializers/foo';"
        }
      ]
    });
  });

  it('instance-initializer foo/bar', function() {
    return generateAndDestroy(['instance-initializer', 'foo/bar'], {
      files: [
        {
          file:'app/instance-initializers/foo/bar.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file:'tests/unit/instance-initializers/foo/bar-test.js',
          contains: "import { initialize } from 'my-app/instance-initializers/foo/bar';"
        }
      ]
    });
  });

  it('in-addon instance-initializer foo', function() {
    return generateAndDestroy(['instance-initializer', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'addon/instance-initializers/foo.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/instance-initializers/foo.js',
          contains: [
            "export { default, initialize } from 'my-addon/instance-initializers/foo';"
          ]
        },
        {
          file: 'tests/unit/instance-initializers/foo-test.js'
        }
      ]
    });
  });

  it('in-addon instance-initializer foo/bar', function() {
    return generateAndDestroy(['instance-initializer', 'foo/bar'], {
      target: 'addon',
      files: [
        {
          file: 'addon/instance-initializers/foo/bar.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/instance-initializers/foo/bar.js',
          contains: [
            "export { default, initialize } from 'my-addon/instance-initializers/foo/bar';"
          ]
        },
        {
          file: 'tests/unit/instance-initializers/foo/bar-test.js'
        }
      ]
    });
  });

  it('dummy instance-initializer foo', function() {
    return generateAndDestroy(['instance-initializer', 'foo', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/instance-initializers/foo.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/instance-initializers/foo.js',
          exists: false
        },
        {
          file: 'tests/unit/instance-initializers/foo-test.js',
          exists: false
        }
      ]
    });
  });

  it('dummy instance-initializer foo/bar', function() {
    return generateAndDestroy(['instance-initializer', 'foo/bar', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/instance-initializers/foo/bar.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'app/instance-initializers/foo/bar.js',
          exists: false
        },
        {
          file: 'tests/unit/instance-initializers/foo/bar-test.js',
          exists: false
        }
      ]
    });
  });

  it('in-repo-addon instance-initializer foo', function() {
    return generateAndDestroy(['instance-initializer', 'foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/instance-initializers/foo.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'lib/my-addon/app/instance-initializers/foo.js',
          contains: [
            "export { default, initialize } from 'my-addon/instance-initializers/foo';"
          ]
        },
        {
          file: 'tests/unit/instance-initializers/foo-test.js'
        }
      ]
    });
  });

  it('in-repo-addon instance-initializer foo/bar', function() {
    return generateAndDestroy(['instance-initializer', 'foo/bar', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/instance-initializers/foo/bar.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
                    "}\n" +
                    "\n"+
                    "export default {\n" +
                    "  name: 'foo/bar',\n" +
                    "  initialize\n" +
                    "};"
        },
        {
          file: 'lib/my-addon/app/instance-initializers/foo/bar.js',
          contains: [
            "export { default, initialize } from 'my-addon/instance-initializers/foo/bar';"
          ]
        },
        {
          file: 'tests/unit/instance-initializers/foo/bar-test.js'
        }
      ]
    });
  });

  /* Pod tests */

  it('instance-initializer foo --pod', function() {
    return generateAndDestroy(['instance-initializer', 'foo', '--pod'], {
      files: [
        {
          file: 'app/instance-initializers/foo.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
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

  it('instance-initializer foo --pod podModulePrefix', function() {
    return generateAndDestroy(['instance-initializer', 'foo', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/instance-initializers/foo.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
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

  it('instance-initializer foo/bar --pod', function() {
    return generateAndDestroy(['instance-initializer', 'foo/bar', '--pod'], {
      files: [
        {
          file: 'app/instance-initializers/foo/bar.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
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


  it('instance-initializer foo/bar --pod podModulePrefix', function() {
    return generateAndDestroy(['instance-initializer', 'foo/bar', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/instance-initializers/foo/bar.js',
          contains: "export function initialize(/* appInstance */) {\n" +
                    "  // appInstance.inject('route', 'foo', 'service:foo');\n" +
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


  it('instance-initializer-test foo', function() {
    return generateAndDestroy(['instance-initializer-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/instance-initializers/foo-test.js',
          contains: [
            "import { initialize } from 'my-app/instance-initializers/foo';",
            "module('Unit | Instance Initializer | foo'",
            "application = Ember.Application.create();",
            "this.appInstance = this.application.buildInstance();",
            "initialize(this.appInstance);"
          ]
        }
      ]
    });
  });

  it('in-addon instance-initializer-test foo', function() {
    return generateAndDestroy(['instance-initializer-test', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/instance-initializers/foo-test.js',
          contains: [
            "import { initialize } from 'dummy/instance-initializers/foo';",
            "module('Unit | Instance Initializer | foo'",
            "application = Ember.Application.create();",
            "this.appInstance = this.application.buildInstance();",
            "initialize(this.appInstance);"
          ]
        }
      ]
    });
  });

});
