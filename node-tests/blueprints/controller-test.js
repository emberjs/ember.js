'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy controller', function() {
  setupTestHooks(this);

  it('controller foo', function() {
    return generateAndDestroy(['controller', 'foo'], {
      files: [
        {
          file: 'app/controllers/foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'tests/unit/controllers/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo'"
          ]
        },
      ]
    });
  });

  it('controller foo/bar', function() {
    return generateAndDestroy(['controller', 'foo/bar'], {
      files: [
        {
          file: 'app/controllers/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'tests/unit/controllers/foo/bar-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo/bar'"
          ]
        }
      ]
    });
  });

  it('in-addon controller foo', function() {
    return generateAndDestroy(['controller', 'foo'], {
        target: 'addon',
        files: [
          {
            file: 'addon/controllers/foo.js',
            contains: [
              "import Ember from 'ember';",
              "export default Ember.Controller.extend({\n});"
            ]
          },
          {
            file: 'app/controllers/foo.js',
            contains: [
              "export { default } from 'my-addon/controllers/foo';"
            ]
          },
          {
            file: 'tests/unit/controllers/foo-test.js',
            contains: [
              "import { moduleFor, test } from 'ember-qunit';",
              "moduleFor('controller:foo'"
            ]
          }
        ]
    });
  });

  it('in-addon controller foo/bar', function() {
    return generateAndDestroy(['controller', 'foo/bar'], {
      target: 'addon',
      files: [
        {
          file: 'addon/controllers/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'app/controllers/foo/bar.js',
          contains: [
            "export { default } from 'my-addon/controllers/foo/bar';"
          ]
        },
        {
          file: 'tests/unit/controllers/foo/bar-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo/bar'"
          ]
        }
      ]
    });
  });

  it('dummy controller foo', function() {
    return generateAndDestroy(['controller', 'foo', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/controllers/foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'app/controllers/foo-test.js',
          exists: false
        },
        {
          file: 'tests/unit/controllers/foo-test.js',
          exists: false
        }
      ]
    });
  });

  it('dummy controller foo/bar', function() {
    return generateAndDestroy(['controller', 'foo/bar', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/controllers/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'app/controllers/foo/bar.js',
          exists: false
        },
        {
          file: 'tests/unit/controllers/foo/bar-test.js',
          exists: false
        }
      ]
    });
  });

  it('in-repo-addon controller foo', function() {
    return generateAndDestroy(['controller', 'foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/controllers/foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'lib/my-addon/app/controllers/foo.js',
          contains: [
            "export { default } from 'my-addon/controllers/foo';"
          ]
        },
        {
          file: 'tests/unit/controllers/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo'"
          ]
        }
      ]
    });
  });

  it('in-repo-addon controller foo/bar', function() {
    return generateAndDestroy(['controller', 'foo/bar', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/controllers/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'lib/my-addon/app/controllers/foo/bar.js',
          contains: [
            "export { default } from 'my-addon/controllers/foo/bar';"
          ]
        },
        {
          file: 'tests/unit/controllers/foo/bar-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo/bar'"
          ]
        }
      ]
    });
  });

/**
* Pod tests
*
*/
  it('controller foo --pod', function() {
    return generateAndDestroy(['controller', 'foo', '--pod'], {
      files: [
        {
          file: 'app/foo/controller.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'tests/unit/foo/controller-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo'"
          ]
        }
      ]
    });
  });

  it('controller foo --pod podModulePrefix', function() {
    return generateAndDestroy(['controller', 'foo', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/foo/controller.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'tests/unit/pods/foo/controller-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo'"
          ]
        }
      ]
    });
  });

  it('controller foo/bar --pod', function() {
    return generateAndDestroy(['controller', 'foo/bar', '--pod'], {
      files: [
        {
          file: 'app/foo/bar/controller.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'tests/unit/foo/bar/controller-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo/bar'"
          ]
        }
      ]
    });
  });

  it('controller foo/bar --pod podModulePrefix', function() {
    return generateAndDestroy(['controller', 'foo/bar', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/foo/bar/controller.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Controller.extend({\n});"
          ]
        },
        {
          file: 'tests/unit/pods/foo/bar/controller-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo/bar'"
          ]
        }
      ]
    });
  });

  it('controller-test foo', function() {
    return generateAndDestroy(['controller-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/controllers/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('controller:foo'"
          ]
        },
      ]
    });
  });

  it('in-addon controller-test foo', function() {
    return generateAndDestroy(['controller-test', 'foo'], {
        target: 'addon',
        files: [
          {
            file: 'tests/unit/controllers/foo-test.js',
            contains: [
              "import { moduleFor, test } from 'ember-qunit';",
              "moduleFor('controller:foo'"
            ]
          }
        ]
    });
  });

  it('controller-test foo for mocha', function() {
    return generateAndDestroy(['controller-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/controllers/foo-test.js',
          contains: [
            "import { describeModule, it } from 'ember-mocha';",
            "describeModule(\n  'controller:foo'"
          ]
        }
      ]
    });
  });
});
