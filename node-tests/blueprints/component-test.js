'use strict';

var setupTestHooks     = require('ember-cli-blueprint-test-helpers/lib/helpers/setup');
var BlueprintHelpers   = require('ember-cli-blueprint-test-helpers/lib/helpers/blueprint-helper');
var generateAndDestroy = BlueprintHelpers.generateAndDestroy;

describe('Acceptance: ember generate component', function() {
  setupTestHooks(this);

  it('component x-foo', function() {
    return generateAndDestroy(['component', 'x-foo'], {
      files:[
        {
          file: 'app/components/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/templates/components/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        }
      ]
    });
  });

  it('component foo/x-foo', function() {
    return generateAndDestroy(['component', 'foo/x-foo'], {
      files: [
        {
          file: 'app/components/foo/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/templates/components/foo/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/components/foo/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('foo/x-foo'",
            "integration: true",
            "{{foo/x-foo}}",
            "{{#foo/x-foo}}"
          ]
        }
      ]
    });
  });

  it('component x-foo ignores --path option', function() {
    return generateAndDestroy(['component', 'x-foo', '--path', 'foo'], {
      files: [
        {
          file: 'app/components/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/templates/components/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        }
      ]
    });
  });

  it('in-addon component x-foo', function() {
    return generateAndDestroy(['component', 'x-foo'], {
      target: 'addon',
      files: [
        {
          file:'addon/components/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "import layout from '../templates/components/x-foo';",
            "export default Ember.Component.extend({",
            "layout",
            "});"
          ]
        },
        {
          file:'addon/templates/components/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file:'app/components/x-foo.js',
          contains: [
            "export { default } from 'my-addon/components/x-foo';"
          ]
        },
        {
          file:'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        }
      ]
    });
  });

  it('in-addon component nested/x-foo', function() {
    return generateAndDestroy(['component', 'nested/x-foo'], {
      target: 'addon',
      files: [
        {
          file:'addon/components/nested/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "import layout from '../../templates/components/nested/x-foo';",
            "export default Ember.Component.extend({",
            "layout",
            "});"
          ]
        },
        {
          file:'addon/templates/components/nested/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file:'app/components/nested/x-foo.js',
          contains: [
            "export { default } from 'my-addon/components/nested/x-foo';"
          ]
        },
        {
          file:'tests/integration/components/nested/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('nested/x-foo'",
            "integration: true",
            "{{nested/x-foo}}",
            "{{#nested/x-foo}}"
          ]
        }
      ]
    });
  });

  it('dummy component x-foo', function() {
    return generateAndDestroy(['component', 'x-foo', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/components/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'tests/dummy/app/templates/components/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'app/components/x-foo.js',
          exists: false
        },
        {
          file: 'tests/unit/components/x-foo-test.js',
          exists: false
        }
      ]
    });
  });

  it('dummy component nested/x-foo', function() {
    return generateAndDestroy(['component', 'nested/x-foo', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/dummy/app/components/nested/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'tests/dummy/app/templates/components/nested/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'app/components/nested/x-foo.js',
          exists: false
        },
        {
          file: 'tests/unit/components/nested/x-foo-test.js',
          exists: false
        }
      ]
    });
  });

  it('in-repo-addon component x-foo', function() {
    return generateAndDestroy(['component', 'x-foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/components/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "import layout from '../templates/components/x-foo';",
            "export default Ember.Component.extend({",
            "layout",
            "});"
          ]
        },
        {
          file: 'lib/my-addon/addon/templates/components/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'lib/my-addon/app/components/x-foo.js',
          contains: [
            "export { default } from 'my-addon/components/x-foo';"
          ]
        },
        {
          file: 'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        }
      ]
    });
  });

  it('in-repo-addon component-test x-foo', function() {
    return generateAndDestroy(['component-test', 'x-foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        }
      ]
    });
  });

  it('in-repo-addon component-test x-foo --unit', function() {
    return generateAndDestroy(['component-test', 'x-foo', '--in-repo-addon=my-addon', '--unit'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'tests/unit/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "moduleForComponent('x-foo'",
            "unit: true"
          ]
        }
      ]
    });
  });

  it('in-repo-addon component nested/x-foo', function() {
    return generateAndDestroy(['component', 'nested/x-foo', '--in-repo-addon=my-addon'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/components/nested/x-foo.js',
          contains: [
            "import Ember from 'ember';",
            "import layout from '../../templates/components/nested/x-foo';",
            "export default Ember.Component.extend({",
            "layout",
            "});"
          ]
        },
        {
          file: 'lib/my-addon/addon/templates/components/nested/x-foo.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'lib/my-addon/app/components/nested/x-foo.js',
          contains: [
            "export { default } from 'my-addon/components/nested/x-foo';"
          ]
        },
        {
          file: 'tests/integration/components/nested/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('nested/x-foo'",
            "integration: true"
          ]
        }
      ]
    });
  });
/**
* Pod tests
*
*/
  it('component x-foo --pod', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod'], {
      files: [
        {
          file: 'app/components/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/components/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/components/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true"
          ]
        },
      ]
    });
  });

  it('component x-foo --pod podModulePrefix', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/components/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/pods/components/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/pods/components/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        },
      ]
    });
  });

  it('component foo/x-foo --pod', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod'], {
      files: [
        {
          file: 'app/components/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/components/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/components/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('foo/x-foo'",
            "integration: true",
            "{{foo/x-foo}}",
            "{{#foo/x-foo}}"
          ]
        },
    ]
    });
  });

  it('component foo/x-foo --pod podModulePrefix', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/components/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/pods/components/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/pods/components/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('foo/x-foo'",
            "integration: true",
            "{{foo/x-foo}}",
            "{{#foo/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component x-foo --pod --path', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod', '--path', 'bar'], {
      files: [
        {
          file: 'app/bar/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/bar/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/bar/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('bar/x-foo'",
            "integration: true",
            "{{bar/x-foo}}",
            "{{#bar/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component x-foo --pod --path podModulePrefix', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod', '--path', 'bar'], {
      podModulePrefix: true,
      files: [
        {
        file: 'app/pods/bar/x-foo/component.js',
        contains: [
          "import Ember from 'ember';",
          "export default Ember.Component.extend({",
          "});"
        ]
      },
      {
        file: 'app/pods/bar/x-foo/template.hbs',
        contains: "{{yield}}"
      },
      {
        file: 'tests/integration/pods/bar/x-foo/component-test.js',
        contains: [
          "import { moduleForComponent, test } from 'ember-qunit';",
          "import hbs from 'htmlbars-inline-precompile';",
          "moduleForComponent('bar/x-foo'",
          "integration: true",
          "{{bar/x-foo}}",
          "{{#bar/x-foo}}"
        ]
      },
    ]
    });
  });

  it('component foo/x-foo --pod --path', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod', '--path', 'bar'], {
      files: [
        {
          file: 'app/bar/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/bar/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/bar/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('bar/foo/x-foo'",
            "integration: true",
            "{{bar/foo/x-foo}}",
            "{{#bar/foo/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component foo/x-foo --pod --path podModulePrefix', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod', '--path', 'bar'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/bar/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/pods/bar/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/pods/bar/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "moduleForComponent('bar/foo/x-foo'",
            "integration: true",
            "{{bar/foo/x-foo}}",
            "{{#bar/foo/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component x-foo --pod --path nested', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod', '--path', 'bar/baz'], {
      files: [
        {
          file: 'app/bar/baz/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/bar/baz/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/bar/baz/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('bar/baz/x-foo'",
            "integration: true",
            "{{bar/baz/x-foo}}",
            "{{#bar/baz/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component x-foo --pod --path nested podModulePrefix', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod', '--path', 'bar/baz'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/bar/baz/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/pods/bar/baz/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/pods/bar/baz/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('bar/baz/x-foo'",
            "integration: true",
            "{{bar/baz/x-foo}}",
            "{{#bar/baz/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component foo/x-foo --pod --path nested', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod', '--path', 'bar/baz'], {
      files: [
        {
          file: 'app/bar/baz/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/bar/baz/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/bar/baz/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('bar/baz/foo/x-foo'",
            "integration: true",
            "{{bar/baz/foo/x-foo}}",
            "{{#bar/baz/foo/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component foo/x-foo --pod --path nested podModulePrefix', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod', '--path', 'bar/baz'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/bar/baz/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/pods/bar/baz/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/pods/bar/baz/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('bar/baz/foo/x-foo'",
            "integration: true",
            "{{bar/baz/foo/x-foo}}",
            "{{#bar/baz/foo/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component x-foo --pod -no-path', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod', '-no-path'], {
      files: [
        {
          file: 'app/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        },
      ]
    });
  });

  it('component x-foo --pod -no-path podModulePrefix', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod', '-no-path'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/pods/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/pods/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        },
      ]
    });
  });

  it('component foo/x-foo --pod -no-path', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod', '-no-path'], {
      files: [
        {
          file: 'app/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('foo/x-foo'",
            "integration: true",
            "{{foo/x-foo}}",
            "{{#foo/x-foo}}"
          ]
        },
      ]
    });
  });

  it('component foo/x-foo --pod -no-path podModulePrefix', function() {
    return generateAndDestroy(['component', 'foo/x-foo', '--pod', '-no-path'], {
      podModulePrefix: true,
      files: [
        {
          file: 'app/pods/foo/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "export default Ember.Component.extend({",
            "});"
          ]
        },
        {
          file: 'app/pods/foo/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'tests/integration/pods/foo/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('foo/x-foo'",
            "integration: true",
            "{{foo/x-foo}}",
            "{{#foo/x-foo}}"
          ]
        },
      ]
    });
  });

  it('in-addon component x-foo --pod', function() {
    return generateAndDestroy(['component', 'x-foo', '--pod'], {
      target: 'addon',
      files: [
        {
          file: 'addon/components/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "import layout from './template';",
            "export default Ember.Component.extend({",
            "layout",
            "});"
          ]
        },
        {
          file: 'addon/components/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'app/components/x-foo/component.js',
          contains: [
            "export { default } from 'my-addon/components/x-foo/component';"
          ]
        },
        {
          file: 'tests/integration/components/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "moduleForComponent('x-foo'",
            "integration: true"
          ]
        }
      ]
    });
  });

  it('in-repo-addon component x-foo --pod', function() {
    return generateAndDestroy(['component', 'x-foo', '--in-repo-addon=my-addon', '--pod'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/components/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "import layout from './template';",
            "export default Ember.Component.extend({",
            "layout",
            "});"
          ]
        },
        {
          file: 'lib/my-addon/addon/components/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'lib/my-addon/app/components/x-foo/component.js',
          contains: [
            "export { default } from 'my-addon/components/x-foo/component';"
          ]
        },
        {
          file: 'tests/integration/components/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "moduleForComponent('x-foo'",
            "integration: true"
          ]
        }
      ]
    });
  });

  it('in-repo-addon component nested/x-foo', function() {
    return generateAndDestroy(['component', 'nested/x-foo', '--in-repo-addon=my-addon', '--pod'], {
      target: 'inRepoAddon',
      files: [
        {
          file: 'lib/my-addon/addon/components/nested/x-foo/component.js',
          contains: [
            "import Ember from 'ember';",
            "import layout from './template';",
            "export default Ember.Component.extend({",
            "layout",
            "});"
          ]
        },
        {
          file: 'lib/my-addon/addon/components/nested/x-foo/template.hbs',
          contains: "{{yield}}"
        },
        {
          file: 'lib/my-addon/app/components/nested/x-foo/component.js',
          contains: [
            "export { default } from 'my-addon/components/nested/x-foo/component';"
          ]
        },
        {
          file: 'tests/integration/components/nested/x-foo/component-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "moduleForComponent('nested/x-foo'",
            "integration: true"
          ]
        }
      ]
    });
  });

  it('component-test x-foo', function() {
    return generateAndDestroy(['component-test', 'x-foo'], {
      files: [
        {
          file: 'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        }
      ]
    });
  });

  it('component-test x-foo --unit', function() {
    return generateAndDestroy(['component-test', 'x-foo', '--unit'], {
      files: [
        {
          file: 'tests/unit/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "moduleForComponent('x-foo'",
            "unit: true"
          ]
        }
      ]
    });
  });

  it('in-addon component-test x-foo', function() {
    return generateAndDestroy(['component-test', 'x-foo'], {
      target: 'addon',
      files: [
        {
          file:'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        },
        {
          file: 'app/component-test/x-foo.js',
          exists: false
        }
      ]
    });
  });

  it('in-addon component-test x-foo --unit', function() {
    return generateAndDestroy(['component-test', 'x-foo', '--unit'], {
      target: 'addon',
      files: [
        {
          file:'tests/unit/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "moduleForComponent('x-foo'",
            "unit: true"
          ]
        },
        {
          file: 'app/component-test/x-foo.js',
          exists: false
        }
      ]
    });
  });

  it('dummy component-test x-foo', function() {
    return generateAndDestroy(['component-test', 'x-foo', '--dummy'], {
      target: 'addon',
      files: [
        {
          file: 'tests/integration/components/x-foo-test.js',
          contains: [
            "import { moduleForComponent, test } from 'ember-qunit';",
            "import hbs from 'htmlbars-inline-precompile';",
            "moduleForComponent('x-foo'"
          ]
        },
        {
          file: 'app/component-test/x-foo.js',
          exists: false
        }
      ]
    });
  });

  it('component-test x-foo for mocha', function() {
    return generateAndDestroy(['component-test', 'x-foo'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/integration/components/x-foo-test.js',
          contains: [
            "import { describeComponent, it } from 'ember-mocha';",
            "import hbs from 'htmlbars-inline-precompile';",
            "describeComponent('x-foo', 'Integration | Component | x foo'",
            "integration: true",
            "{{x-foo}}",
            "{{#x-foo}}"
          ]
        }
      ]
    });
  });

  it('component-test x-foo --unit for mocha', function() {
    return generateAndDestroy(['component-test', 'x-foo', '--unit'], {
      packages: [
        { name: 'ember-cli-qunit', delete: true },
        { name: 'ember-cli-mocha', dev: true }
      ],
      files: [
        {
          file: 'tests/unit/components/x-foo-test.js',
          contains: [
            "import { describeComponent, it } from 'ember-mocha';",
            "describeComponent('x-foo', 'Unit | Component | x foo",
            "unit: true"
          ]
        }
      ]
    });
  });
});
