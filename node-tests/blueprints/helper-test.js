'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy helper', function() {
  setupTestHooks(this);

  it('helper foo/bar-baz', function() {
    return generateAndDestroy(['helper', 'foo/bar-baz'], {
      files: [
        {
          file: 'app/helpers/foo/bar-baz.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBarBaz(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBarBaz);"
        },
        {
          file: 'tests/unit/helpers/foo/bar-baz-test.js',
          contains: "import { fooBarBaz } from 'my-app/helpers/foo/bar-baz';"
        }
      ]
    });
  });

  it('in-addon helper foo-bar', function() {
    return generateAndDestroy(['helper', 'foo-bar'], {
      target: 'addon',
      files: [
        {
          file: 'addon/helpers/foo-bar.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBar(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBar);"
        },
        {
          file: 'app/helpers/foo-bar.js',
          contains: [
            "export { default, fooBar } from 'my-addon/helpers/foo-bar';"
          ]
        },
        {
          file: 'tests/unit/helpers/foo-bar-test.js',
          contains: "import { fooBar } from 'dummy/helpers/foo-bar';"
        }
      ]
    });
  });

  it('in-addon helper foo/bar-baz', function() {
    return generateAndDestroy(['helper', 'foo/bar-baz'], {
      target: 'addon',
      files: [
        {
          file: 'addon/helpers/foo/bar-baz.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBarBaz(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBarBaz);"
        },
        {
          file: 'app/helpers/foo/bar-baz.js',
          contains: [
            "export { default, fooBarBaz } from 'my-addon/helpers/foo/bar-baz';"
          ]
        },
        {
          file: 'tests/unit/helpers/foo/bar-baz-test.js',
          contains: "import { fooBarBaz } from 'dummy/helpers/foo/bar-baz';"
        }
      ]
    });
  });

  it('dummy helper foo-bar', function() {
    return generateAndDestroy(['helper', 'foo-bar', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/helpers/foo-bar.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBar(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBar);"
        },
        {
          file: 'app/helpers/foo-bar.js',
          exists: false
        },
        {
          file: 'tests/unit/helpers/foo-bar-test.js',
          exists: false
        }
      ]
    });
  });

  it('dummy helper foo/bar-baz', function() {
    return generateAndDestroy(['helper', 'foo/bar-baz', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/helpers/foo/bar-baz.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBarBaz(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBarBaz);"
        },
        {
          file: 'app/helpers/foo/bar-baz.js',
          exists: false
        },
        {
          file: 'tests/unit/helpers/foo/bar-baz-test.js',
          exists: false
        }
      ]
    });
  });

  it('in-repo-addon helper foo-bar', function() {
    return generateAndDestroy(['helper', 'foo-bar', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/helpers/foo-bar.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBar(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBar);"
        },
        {
          file: 'lib/my-addon/app/helpers/foo-bar.js',
          contains: [
            "export { default, fooBar } from 'my-addon/helpers/foo-bar';"
          ]
        },
        {
          file: 'tests/unit/helpers/foo-bar-test.js',
          contains: "import { fooBar } from 'my-app/helpers/foo-bar';"
        }
      ]
    });
  });

  it('in-repo-addon helper foo/bar-baz', function() {
    return generateAndDestroy(['helper', 'foo/bar-baz', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/helpers/foo/bar-baz.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBarBaz(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBarBaz);"
        },
        {
          file: 'lib/my-addon/app/helpers/foo/bar-baz.js',
          contains: [
            "export { default, fooBarBaz } from 'my-addon/helpers/foo/bar-baz';"
          ]
        },
        {
          file: 'tests/unit/helpers/foo/bar-baz-test.js',
          contains: "import { fooBarBaz } from 'my-app/helpers/foo/bar-baz';"
        }
      ]
    });
  });

/**
* Pod tests
*
*/
  it('helper foo-bar --pod', function() {
    return generateAndDestroy(['helper', 'foo-bar', '--pod'], {
      files: [
        {
          file: 'app/helpers/foo-bar.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBar(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBar);"
        },
        {
          file: 'tests/unit/helpers/foo-bar-test.js',
          contains: "import { fooBar } from 'my-app/helpers/foo-bar';"
        }
      ]
    });
  });

  it('helper foo-bar --pod podModulePrefix', function() {
    return generateAndDestroy(['helper', 'foo-bar', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/helpers/foo-bar.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBar(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBar);"
        },
        {
          file: 'tests/unit/helpers/foo-bar-test.js',
          contains: "import { fooBar } from 'my-app/helpers/foo-bar';"
        }
      ]
    });
  });

  it('helper foo/bar-baz --pod', function() {
    return generateAndDestroy(['helper', 'foo/bar-baz', '--pod'], {
      files: [
        {
          file: 'app/helpers/foo/bar-baz.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBarBaz(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBarBaz);"
        },
        {
          file: 'tests/unit/helpers/foo/bar-baz-test.js',
          contains: "import { fooBarBaz } from 'my-app/helpers/foo/bar-baz';"
        }
      ]
    });
  });

  it('helper foo/bar-baz --pod podModulePrefix', function() {
    return generateAndDestroy(['helper', 'foo/bar-baz', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/helpers/foo/bar-baz.js',
          contains: "import Ember from 'ember';\n\n" +
                    "export function fooBarBaz(params/*, hash*/) {\n" +
                    "  return params;\n" +
                    "}\n\n" +
                    "export default Ember.Helper.helper(fooBarBaz);"
        },
        {
          file: 'tests/unit/helpers/foo/bar-baz-test.js',
          contains: "import { fooBarBaz } from 'my-app/helpers/foo/bar-baz';"
        }
      ]
    });
  });

  it('helper-test foo/bar-baz', function() {
    return generateAndDestroy(['helper-test', 'foo/bar-baz'], {
      files: [
        {
          file: 'tests/unit/helpers/foo/bar-baz-test.js',
          contains: "import { fooBarBaz } from 'my-app/helpers/foo/bar-baz';"
        }
      ]
    });
  });

  it('in-addon helper-test foo-bar', function() {
    return generateAndDestroy(['helper-test', 'foo-bar'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/helpers/foo-bar-test.js',
          contains: "import { fooBar } from 'dummy/helpers/foo-bar';"
        }
      ]
    });
  });

});
