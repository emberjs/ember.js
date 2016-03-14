'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate and destroy mixin', function() {
  setupTestHooks(this);

  it('mixin foo', function() {
    return generateAndDestroy(['mixin', 'foo'], {
      files: [
        {
          file: 'app/mixins/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import FooMixin from 'my-app/mixins/foo';"
          ]
        }
      ]
    });
  });

  it('mixin foo/bar', function() {
    return generateAndDestroy(['mixin', 'foo/bar'], {
      files: [
        {
          file: 'app/mixins/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo/bar-test.js',
          contains: [
            "import FooBarMixin from 'my-app/mixins/foo/bar';"
          ]
        }
      ]
    });
  });

  it('mixin foo/bar/baz', function() {
    return generateAndDestroy(['mixin', 'foo/bar/baz'], {
      files: [
        {
          file: 'tests/unit/mixins/foo/bar/baz-test.js',
          contains: [
            "import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';"
          ]
        }
      ]
    });
  });

  it('in-addon mixin foo', function() {
    return generateAndDestroy(['mixin', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'addon/mixins/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import FooMixin from 'my-addon/mixins/foo';"
          ]
        },
        {
          file: 'app/mixins/foo.js',
          exists: false
        }
      ]
    });
  });

  it('in-addon mixin foo/bar', function() {
    return generateAndDestroy(['mixin', 'foo/bar'], {
      target: 'addon',
      files: [
        {
          file: 'addon/mixins/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo/bar-test.js',
          contains: [
            "import FooBarMixin from 'my-addon/mixins/foo/bar';"
          ]
        },
        {
          file: 'app/mixins/foo/bar.js',
          exists: false
        }
      ]
    });
  });

  it('in-addon mixin foo/bar/baz', function() {
    return generateAndDestroy(['mixin', 'foo/bar/baz'], {
      target: 'addon',
      files: [
        {
          file: 'addon/mixins/foo/bar/baz.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo/bar/baz-test.js',
          contains: [
            "import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';"
          ]
        },
        {
          file: 'app/mixins/foo/bar/baz.js',
          exists: false
        }
      ]
    });
  })

  it('in-repo-addon mixin foo', function() {
    return generateAndDestroy(['mixin', 'foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/mixins/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import FooMixin from 'my-addon/mixins/foo';"
          ]
        }
      ]
    });
  });

  it('in-repo-addon mixin foo/bar', function() {
    return generateAndDestroy(['mixin', 'foo/bar', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/mixins/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo/bar-test.js',
          contains: [
            "import FooBarMixin from 'my-addon/mixins/foo/bar';"
          ]
        }
      ]
    });
  });

  it('in-repo-addon mixin foo/bar/baz', function() {
    return generateAndDestroy(['mixin', 'foo/bar/baz', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'tests/unit/mixins/foo/bar/baz-test.js',
          contains: [
            "import FooBarBazMixin from 'my-addon/mixins/foo/bar/baz';"
          ]
        }
      ]
    });
  });

  /* Pod tests */

  it('mixin foo --pod', function() {
    return generateAndDestroy(['mixin', 'foo', '--pod'], {
      files: [
        {
          file: 'app/mixins/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import FooMixin from 'my-app/mixins/foo';"
          ]
        }
      ]
    });
  });

  it('mixin foo --pod podModulePrefix', function() {
    return generateAndDestroy(['mixin', 'foo', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/mixins/foo.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import FooMixin from 'my-app/mixins/foo';"
          ]
        }
      ]
    });
  });

  it('mixin foo/bar --pod', function() {
    return generateAndDestroy(['mixin', 'foo/bar', '--pod'], {
      files: [
        {
          file: 'app/mixins/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo/bar-test.js',
          contains: [
            "import FooBarMixin from 'my-app/mixins/foo/bar';"
          ]
        }
      ]
    });
  });

  it('mixin foo/bar --pod podModulePrefix', function() {
    return generateAndDestroy(['mixin', 'foo/bar', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/mixins/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            'export default Ember.Mixin.create({\n});'
          ]
        },
        {
          file: 'tests/unit/mixins/foo/bar-test.js',
          contains: [
            "import FooBarMixin from 'my-app/mixins/foo/bar';"
          ]
        }
      ]
    });
  });

  it('mixin foo/bar/baz --pod', function() {
    return generateAndDestroy(['mixin', 'foo/bar/baz', '--pod'], {
      files: [
        {
          file: 'tests/unit/mixins/foo/bar/baz-test.js',
          contains: [
            "import FooBarBazMixin from 'my-app/mixins/foo/bar/baz';"
          ]
        }
      ]
    });
  });

  it('mixin-test foo', function() {
    return generateAndDestroy(['mixin-test', 'foo'], {
      files: [
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import FooMixin from 'my-app/mixins/foo';"
          ]
        }
      ]
    });
  });

  it('in-addon mixin-test foo', function() {
    return generateAndDestroy(['mixin-test', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import FooMixin from 'my-addon/mixins/foo';"
          ]
        }
      ]
    });
  });

  it('mixin-test foo for mocha', function() {
    return generateAndDestroy(['mixin-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/mixins/foo-test.js',
          contains: [
            "import { describe, it } from 'mocha';",
            "import FooMixin from 'my-app/mixins/foo';"
          ]
        }
      ]
    });
  });
});
