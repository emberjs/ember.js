'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy util', function() {
  setupTestHooks(this);

  it('util foo-bar', function() {
    return generateAndDestroy(['util', 'foo-bar'], {
      files: [
        {
          file: 'app/utils/foo-bar.js',
          contains: 'export default function fooBar() {\n' +
                    '  return true;\n' +
                    '}'
        },
        {
          file: 'tests/unit/utils/foo-bar-test.js',
          contains: [
            "import fooBar from 'my-app/utils/foo-bar';"
          ]
        }
      ]
    });
  });

  it('util foo-bar/baz', function() {
    return generateAndDestroy(['util', 'foo/bar-baz'], {
      files: [
        {
          file: 'app/utils/foo/bar-baz.js',
          contains: 'export default function fooBarBaz() {\n' +
                    '  return true;\n' +
                    '}'
        },
        {
          file: 'tests/unit/utils/foo/bar-baz-test.js',
          contains: [
            "import fooBarBaz from 'my-app/utils/foo/bar-baz';"
          ]
        }
      ]
    });
  });

  it('in-addon util foo-bar', function() {
    return generateAndDestroy(['util', 'foo-bar'], {
      target: 'addon',
      files: [
        {
          file: 'addon/utils/foo-bar.js',
          contains: 'export default function fooBar() {\n' +
                    '  return true;\n' +
                    '}'
        },
        {
          file: 'app/utils/foo-bar.js',
          contains: [
            "export { default } from 'my-addon/utils/foo-bar';"
          ]
        },
        {
          file: 'tests/unit/utils/foo-bar-test.js',
          contains: [
            "import fooBar from 'dummy/utils/foo-bar';"
          ]
        }
      ]
    });
  });

  it('in-addon util foo-bar/baz', function() {
    return generateAndDestroy(['util', 'foo/bar-baz'], {
      target: 'addon',
      files: [
        {
          file: 'addon/utils/foo/bar-baz.js',
          contains: 'export default function fooBarBaz() {\n' +
                    '  return true;\n' +
                    '}'
        },
        {
          file: 'app/utils/foo/bar-baz.js',
          contains: [
            "export { default } from 'my-addon/utils/foo/bar-baz';"
          ]
        },
        {
          file: 'tests/unit/utils/foo/bar-baz-test.js',
          contains: [
            "import fooBarBaz from 'dummy/utils/foo/bar-baz';"
          ]
        }
      ]
    });
  });
/**
* Pod tests
*
*/

  it('util foo-bar --pod', function() {
    return generateAndDestroy(['util', 'foo-bar', '--pod'], {
      files: [
        {
          file: 'app/utils/foo-bar.js',
          contains: 'export default function fooBar() {\n' +
                    '  return true;\n' +
                    '}'
        },
        {
          file: 'tests/unit/utils/foo-bar-test.js',
          contains: [
            "import fooBar from 'my-app/utils/foo-bar';"
          ]
        }
      ]
    });
  });

  it('util foo-bar --pod podModulePrefix', function() {
    return generateAndDestroy(['util', 'foo-bar', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/utils/foo-bar.js',
          contains: 'export default function fooBar() {\n' +
                    '  return true;\n' +
                    '}'
        },
        {
          file: 'tests/unit/utils/foo-bar-test.js',
          contains: [
            "import fooBar from 'my-app/utils/foo-bar';"
          ]
        }
      ]
    });
  });

  it('util foo-bar/baz --pod', function() {
    return generateAndDestroy(['util', 'foo/bar-baz', '--pod'], {
      files: [
        {
          file: 'app/utils/foo/bar-baz.js',
          contains: 'export default function fooBarBaz() {\n' +
                    '  return true;\n' +
                    '}'
        },
        {
          file: 'tests/unit/utils/foo/bar-baz-test.js',
          contains: [
            "import fooBarBaz from 'my-app/utils/foo/bar-baz';"
          ]
        }
      ]
    });
  });

  it('util-test foo-bar', function() {
    return generateAndDestroy(['util-test', 'foo-bar'], {
      files: [
        {
          file: 'tests/unit/utils/foo-bar-test.js',
          contains: [
            "import fooBar from 'my-app/utils/foo-bar';"
          ]
        }
      ]
    });
  });

  it('in-addon util-test foo-bar', function() {
    return generateAndDestroy(['util-test', 'foo-bar'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/utils/foo-bar-test.js',
          contains: [
            "import fooBar from 'dummy/utils/foo-bar';"
          ]
        }
      ]
    });
  });

  it('util-test foo-bar for mocha', function() {
    return generateAndDestroy(['util-test', 'foo-bar'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/utils/foo-bar-test.js',
          contains: [
            "import { describe, it } from 'mocha';",
            "import fooBar from 'my-app/utils/foo-bar';"
          ]
        }
      ]
    });
  });
});
