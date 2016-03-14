'use strict';

var fs                 = require('fs-extra');
var path               = require('path');
var RSVP               = require('rsvp');
var remove             = RSVP.denodeify(fs.remove);
var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var initProject        = require('ember-cli-blueprint-test-helpers/lib/helpers/project-init');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;
var destroy = BlueprintHelpers.destroy;


describe('Acceptance: ember generate and destroy route', function() {
  setupTestHooks(this);

  it('route foo', function() {
    var files = [
      {
        file: 'app/router.js',
        contains: 'this.route(\'foo\')'
      },
      {
        file: 'app/routes/foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
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
    ];

    return generateAndDestroy(['route', 'foo'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route foo with --skip-router', function() {
    var files = [
      {
        file: 'app/router.js',
        doesNotContain: 'this.route(\'foo\')'
      },
      {
        file: 'app/routes/foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
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
    ];

    return generateAndDestroy(['route', 'foo', '--skip-router'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route foo with --path', function() {
    var files = [
      {
        file: 'app/router.js',
        contains: [
          'this.route(\'foo\', {',
          'path: \':foo_id/show\'',
          '});'
        ]
      }
    ];

    return generateAndDestroy(['route', 'foo', '--path=:foo_id/show'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route index', function() {
    var files = [
      {
        file: 'app/router.js',
        doesNotContain: "this.route('index');"
      }
    ];

    return generateAndDestroy(['route', 'index'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route application', function() {
    return generateAndDestroy(['route', 'foo'], {
      afterGenerate: function(){
        return remove(path.join('app', 'templates', 'application.hbs'))
          .then(function() {
            var files = [
              {
                file: 'app/router.js',
                doesNotContain: "this.route('application');"
              }
            ];

            return generateAndDestroy(['route', 'application'], {
              skipInit: true,
              afterDestroy: function() {
                // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
                files.shift();
              },
              files: files,
            });
        });
      }
    });
  });

  it('route basic isn\'t added to router', function() {
    var files = [
      {
        file: 'app/router.js',
        doesNotContain: "this.route('basic');"
      },
      {
        file: 'app/routes/basic.js'
      }
    ];

    return generateAndDestroy(['route', 'basic'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('in-addon route foo', function() {
    var files = [
      {
        file: 'addon/routes/foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
        ]
      },
      {
        file: 'app/routes/foo.js',
        contains: [
          "export { default } from 'my-addon/routes/foo';"
        ]
      },
      {
        file: 'addon/templates/foo.hbs',
        contains: '{{outlet}}'
      },
      {
        file: 'app/templates/foo.js',
        contains: "export { default } from 'my-addon/templates/foo';"
      },
      {
        file: 'tests/unit/routes/foo-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('route:foo'"
        ]
      },
      {
        file: 'tests/dummy/app/router.js',
        doesNotContain: "this.route('foo');"
      }
    ];

    return generateAndDestroy(['route', 'foo'], {
      target: 'addon',
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.pop();
      },
      files: files,
    });
  });

  it('in-addon route foo/bar', function() {
    var files = [
      {
        file: 'addon/routes/foo/bar.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
        ]
      },
      {
        file: 'app/routes/foo/bar.js',
        contains: "export { default } from 'my-addon/routes/foo/bar';"
      },
      {
        file: 'app/templates/foo/bar.js',
        contains: "export { default } from 'my-addon/templates/foo/bar';"
      },
      {
        file: 'tests/unit/routes/foo/bar-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('route:foo/bar'"
        ]
      },
      {
        file: 'tests/dummy/app/router.js',
        doesNotContain:  "this.route('bar');"
      }
    ];

    return generateAndDestroy(['route', 'foo/bar'], {
      target: 'addon',
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.pop();
      },
      files: files,
    });
  });

  it('dummy route foo', function() {
    var files = [
      {
        file: 'tests/dummy/app/router.js',
        contains: "this.route('foo');"
      },
      {
        file: 'tests/dummy/app/routes/foo.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
        ]
      },
      {
        file: 'app/routes/foo.js',
        exists: false
      },
      {
        file: 'tests/dummy/app/templates/foo.hbs',
        contains: '{{outlet}}'
      },
      {
        file: 'app/templates/foo.js',
        exists: false
      },
      {
        file: 'tests/unit/routes/foo-test.js',
        exists: false
      }
    ];

    return generateAndDestroy(['route', 'foo', '--dummy'], {
      target: 'addon',
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('dummy route foo/bar', function() {
    var files = [
      {
        file: 'tests/dummy/app/router.js',
        contains: [
          "this.route('foo', function() {",
          "this.route('bar');",
        ]
      },
      {
        file: 'tests/dummy/app/routes/foo/bar.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
        ]
      },
      {
        file: 'app/routes/foo/bar.js',
        exists: false
      },
      {
        file: 'tests/dummy/app/templates/foo/bar.hbs',
        contains: '{{outlet}}'
      },
      {
        file: 'tests/unit/routes/foo/bar-test.js',
        exists: false
      }
    ];

    return generateAndDestroy(['route', 'foo/bar', '--dummy'], {
      target: 'addon',
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('in-repo-addon route foo', function() {
    return generateAndDestroy(['route', 'foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/routes/foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Route.extend({\n});"
          ]
        },
        {
          file: 'lib/my-addon/app/routes/foo.js',
          contains: "export { default } from 'my-addon/routes/foo';"
        },
        {
          file: 'lib/my-addon/addon/templates/foo.hbs',
          contains: '{{outlet}}'
        },
        {
          file: 'lib/my-addon/app/templates/foo.js',
          contains: "export { default } from 'my-addon/templates/foo';"
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

  it('in-repo-addon route foo/bar', function() {
    return generateAndDestroy(['route', 'foo/bar', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/routes/foo/bar.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Route.extend({\n});"
          ]
        },
        {
          file: 'lib/my-addon/app/routes/foo/bar.js',
          contains: "export { default } from 'my-addon/routes/foo/bar';"
        },
        {
          file: 'lib/my-addon/addon/templates/foo/bar.hbs',
          contains: '{{outlet}}'
        },
        {
          file: 'lib/my-addon/app/templates/foo/bar.js',
          contains: "export { default } from 'my-addon/templates/foo/bar';"
        },
        {
          file: 'tests/unit/routes/foo/bar-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('route:foo/bar'"
          ]
        }
      ]
    });
  });

/**
* Pod tests
*
*/

  it('in-addon route foo --pod', function() {
    return generateAndDestroy(['route', 'foo', '--pod'], {
      target: 'addon',
      files: [
        {
          file: 'addon/foo/route.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Route.extend({\n});"
          ]
        },
        {
          file: 'addon/foo/template.hbs',
          contains: "{{outlet}}"
        },
        {
          file: 'app/foo/route.js',
          contains: [
            "export { default } from 'my-addon/foo/route';"
          ]
        },
        {
          file: 'app/foo/template.js',
          contains: [
            "export { default } from 'my-addon/foo/template';"
          ]
        },
        {
          file: 'tests/unit/foo/route-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('route:foo'"
          ]
        }
      ]
    });
  });


  it('route foo --pod', function() {
    var files = [
      {
        file: 'app/router.js',
        contains: 'this.route(\'foo\')'
      },
      {
        file: 'app/foo/route.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
        ]
      },
      {
        file: 'app/foo/template.hbs',
        contains: '{{outlet}}'
      },
      {
        file: 'tests/unit/foo/route-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('route:foo'"
        ]
      }
    ];

    return generateAndDestroy(['route', 'foo', '--pod'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route foo --pod with --path', function() {
    var files = [
      {
        file: 'app/router.js',
        contains: [
          'this.route(\'foo\', {',
          'path: \':foo_id/show\'',
          '});'
        ]
      }
    ];

    return generateAndDestroy(['route', 'foo', '--pod', '--path=:foo_id/show'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });


  it('route foo --pod podModulePrefix', function() {
    var files = [
      {
        file: 'app/router.js',
        contains: 'this.route(\'foo\')'
      },
      {
        file: 'app/pods/foo/route.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Route.extend({\n});"
        ]
      },
      {
        file: 'app/pods/foo/template.hbs',
        contains: '{{outlet}}'
      },
      {
        file: 'tests/unit/pods/foo/route-test.js',
        contains: [
          "import { moduleFor, test } from 'ember-qunit';",
          "moduleFor('route:foo'"
        ]
      }
    ];

    return generateAndDestroy(['route', 'foo', '--pod'], {
      podModulePrefix: true,
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route index --pod', function() {
    var files = [
      {
        file: 'app/router.js',
        doesNotContain: "this.route('index');"
      }
    ];

    return generateAndDestroy(['route', 'index', '--pod'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route application --pod', function() {
    return generateAndDestroy(['route', 'foo'], {
      afterGenerate: function(){
        return remove(path.join('app', 'templates', 'application.hbs'))
          .then(function() {
            var files = [
              {
                file: 'app/router.js',
                doesNotContain: "this.route('application');"
              }
            ];

            return generateAndDestroy(['route', 'application', '--pod'], {
              skipInit: true,
              afterDestroy: function() {
                // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
                files.shift();
              },
              files: files,
            });
        });
      }
    });
  });

  it('route basic --pod isn\'t added to router', function() {
    var files = [
      {
        file: 'app/router.js',
        doesNotContain: "this.route('basic');"
      },
      {
        file: 'app/basic/route.js'
      }
    ];

    return generateAndDestroy(['route', 'basic', '--pod'], {
      afterDestroy: function() {
        // remove `app/router.js` to work around https://github.com/ember-cli/ember-cli-blueprint-test-helpers/issues/38
        files.shift();
      },
      files: files,
    });
  });

  it('route-test foo', function() {
    return generateAndDestroy(['route-test', 'foo'], {
      files: [
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

  it('in-addon route-test foo', function() {
    return generateAndDestroy(['route-test', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/routes/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('route:foo'"
          ]
        },
        {
          file: 'app/route-test/foo.js',
          exists: false
        }
      ]
    });
  });


  it('dummy route-test foo', function() {
    return generateAndDestroy(['route-test', 'foo'], {
      target: 'addon',
      files: [
        {
          file: 'tests/unit/routes/foo-test.js',
          contains: [
            "import { moduleFor, test } from 'ember-qunit';",
            "moduleFor('route:foo'"
          ]
        },
        {
          file: 'app/route-test/foo.js',
          exists: false
        }
      ]
    });
  });

  it('route-test foo for mocha', function() {
    return generateAndDestroy(['route-test', 'foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/routes/foo-test.js',
          contains: [
            "import { describeModule, it } from 'ember-mocha';",
            "describeModule('route:foo', 'Unit | Route | foo'"
          ]
        }
      ]
    });
  });
});
