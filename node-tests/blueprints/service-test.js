'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy service', function() {
  setupTestHooks(this);

  it('service foo', function() {
    return generateAndDestroy(['service', 'foo'], {
      files: [
        {
          file: 'app/services/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'tests/unit/services/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo'"
          ]
        }
      ]
    });
  });

  it('service foo/bar', function() {
    return generateAndDestroy(['service', 'foo/bar'], {
      files: [
        {
          file: 'app/services/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'tests/unit/services/foo/bar-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo/bar'"
          ]
        }
      ]
    });
  });
  it('in-addon service foo', function() {
    return generateAndDestroy(['service', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'addon/services/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'app/services/foo.js',
          contains: [
            "export { default } from 'my-addon/services/foo';"
          ]
        },
        {
          file: 'tests/unit/services/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo'"
          ]
        }
      ]
    });
  });

  it('in-addon service foo/bar', function() {
    return generateAndDestroy(['service', 'foo/bar'], {
      target: 'addon',
      files: [
        {
          file: 'addon/services/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'app/services/foo/bar.js',
          contains: [
            "export { default } from 'my-addon/services/foo/bar';"
          ]
        },
        {
          file: 'tests/unit/services/foo/bar-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo/bar'"
          ]
        }
      ]
    });
  });
/**
* Pod tests
*
*/

  it('service foo --pod', function() {
    return generateAndDestroy(['service', 'foo', '--pod'], {
      files: [
        {
          file: 'app/foo/service.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'tests/unit/foo/service-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo'"
          ]
        }
      ]
    });
  });

  it('service foo/bar --pod', function() {
    return generateAndDestroy(['service', 'foo/bar', '--pod'], {
      files: [
        {
          file: 'app/foo/bar/service.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'tests/unit/foo/bar/service-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo/bar'"
          ]
        }
      ]
    });
  });

  it('service foo --pod podModulePrefix', function() {
    return generateAndDestroy(['service', 'foo', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/foo/service.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'tests/unit/pods/foo/service-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo'"
          ]
        }
      ]
    });
  });

  it('service foo/bar --pod podModulePrefix', function() {
    return generateAndDestroy(['service', 'foo/bar', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/foo/bar/service.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Service.extend({\n});'
          ]
        },
        {
          file: 'tests/unit/pods/foo/bar/service-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo/bar'"
          ]
        }
      ]
    });
  });

  it('service-test foo', function() {
    return generateAndDestroy(['service-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/services/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo'"
          ]
        }
      ]
    });
  });

  it('in-addon service-test foo', function() {
    return generateAndDestroy(['service-test', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/services/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('service:foo'"
          ]
        },
        {
          file: 'app/service-test/foo.js',
          exists: false
        }
      ]
    });
  });

  it('service-test foo for mocha', function() {
    return generateAndDestroy(['service-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/services/foo-test.js',
          contains: [
            "import { describeModule, it } from 'ember-mocha';",
            "describeModule(\n  'service:foo'"
          ]
        }
      ]
    });
  });
});
