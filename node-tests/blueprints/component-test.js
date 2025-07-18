'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

const glimmerComponentContents = `import Component from '@glimmer/component';

export default class Foo extends Component {}
`;

const emberComponentContents = `import Component from '@ember/component';

export default class extends Component {}
`;

const templateOnlyContents = `import templateOnly from '@ember/component/template-only';

export default templateOnly();
`;

describe('Blueprint: component', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('component foo', function () {
      return emberGenerateDestroy(['component', 'foo'], (_file) => {
        expect(_file('app/components/foo.js')).to.not.exist;
        expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
    });

    it('component foo --component-structure=flat --component-class=@glimmer/component', function () {
      return emberGenerateDestroy(
        [
          'component',
          '--component-structure',
          'flat',
          '--component-class',
          '@glimmer/component',
          'foo',
        ],
        (_file) => {
          expect(_file('app/components/foo.js')).to.equal(glimmerComponentContents);

          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    it('component foo --component-structure=flat', function () {
      return emberGenerateDestroy(
        ['component', '--component-structure', 'flat', 'foo'],
        (_file) => {
          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    it('component foo --component-structure=nested', function () {
      return emberGenerateDestroy(
        ['component', '--component-structure', 'nested', 'foo'],
        (_file) => {
          expect(_file('app/components/foo/index.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    it('component foo --component-class=@ember/component', function () {
      return emberGenerateDestroy(
        ['component', '--component-class', '@ember/component', 'foo'],
        (_file) => {
          expect(_file('app/components/foo.js')).to.equal(emberComponentContents);

          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    it('component foo --component-class=@glimmer/component', function () {
      return emberGenerateDestroy(
        ['component', '--component-class', '@glimmer/component', 'foo'],
        (_file) => {
          expect(_file('app/components/foo.js')).to.equal(glimmerComponentContents);

          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    it('component foo --component-class=@ember/component/template-only', function () {
      return emberGenerateDestroy(
        ['component', '--component-class', '@ember/component/template-only', 'foo'],
        (_file) => {
          expect(_file('app/components/foo.js')).to.equal(templateOnlyContents);

          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    it('component foo --no-component-class', function () {
      return emberGenerateDestroy(['component', '--no-component-class', 'foo'], (_file) => {
        expect(_file('app/components/foo.js')).to.not.exist;

        expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
    });

    it('component x-foo', function () {
      return emberGenerateDestroy(['component', 'x-foo'], (_file) => {
        expect(_file('app/components/x-foo.js')).to.not.exist;
        expect(_file('app/components/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'x-foo',
              componentInvocation: 'XFoo',
            },
          })
        );
      });
    });

    it('component x-foo.js', function () {
      return emberGenerateDestroy(['component', 'x-foo.js'], (_file) => {
        expect(_file('app/components/x-foo.js')).to.not.exist;
        expect(_file('app/components/x-foo.js.js')).to.not.exist;
        expect(_file('app/templates/components/x-foo.js.hbs')).to.not.exist;
        expect(_file('tests/integration/components/x-foo-test.js.js')).to.not.exist;

        expect(_file('app/components/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'x-foo',
              componentInvocation: 'XFoo',
            },
          })
        );
      });
    });

    it('component foo/x-foo', function () {
      return emberGenerateDestroy(['component', 'foo/x-foo'], (_file) => {
        expect(_file('app/components/foo/x-foo.js')).to.not.exist;
        expect(_file('app/components/foo/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/foo/x-foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'foo/x-foo',
              componentInvocation: 'Foo::XFoo',
            },
          })
        );
      });
    });

    it('component foo/x-foo --component-class="@glimmer/component"', function () {
      return emberGenerateDestroy(
        ['component', 'foo/x-foo', '--component-class', '@glimmer/component'],
        (_file) => {
          expect(_file('app/components/foo/x-foo.js')).to.equal(
            glimmerComponentContents.replace('Foo', 'FooXFoo')
          );
          expect(_file('app/components/foo/x-foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo/x-foo-test.js')).to.equal(
            fixture('component-test/app.js', {
              replace: {
                component: 'foo/x-foo',
                componentInvocation: 'Foo::XFoo',
              },
            })
          );
        }
      );
    });

    it('component foo --strict', function () {
      return emberGenerateDestroy(['component', 'foo', '--strict'], (_file) => {
        expect(_file('app/components/foo.gjs')).to.equal(
          fixture('component/template-only-component.gjs')
        );

        expect(_file('tests/integration/components/foo-test.gjs')).to.equal(
          fixture('component-test/app.gjs')
        );
      });
    });

    it('component foo --strict --component-class=@glimmer/component', function () {
      return emberGenerateDestroy(
        ['component', 'foo', '--strict', '--component-class=@glimmer/component'],
        (_file) => {
          expect(_file('app/components/foo.gjs')).to.equal(
            fixture('component/glimmer-component.gjs')
          );

          expect(_file('tests/integration/components/foo-test.gjs')).to.equal(
            fixture('component-test/app.gjs')
          );
        }
      );
    });

    it('component foo --strict --component-class=@ember/component', async function () {
      await expect(
        emberGenerate(['component', 'foo', '--strict', '--component-class=@ember/component'])
      ).to.be.rejectedWith(
        'The "@ember/component" component class cannot be used in combination with the "--strict" flag'
      );
    });

    it('component foo --strict --typescript', function () {
      return emberGenerateDestroy(['component', 'foo', '--strict', '--typescript'], (_file) => {
        expect(_file('app/components/foo.gts')).to.equal(
          fixture('component/template-only-component.gts')
        );

        expect(_file('tests/integration/components/foo-test.gts')).to.equal(
          fixture('component-test/app.gts')
        );
      });
    });

    it('component foo --strict --component-class=@glimmer/component --typescript', function () {
      return emberGenerateDestroy(
        ['component', 'foo', '--strict', '--component-class=@glimmer/component', '--typescript'],
        (_file) => {
          expect(_file('app/components/foo.gts')).to.equal(
            fixture('component/glimmer-component.gts')
          );

          expect(_file('tests/integration/components/foo-test.gts')).to.equal(
            fixture('component-test/app.gts')
          );
        }
      );
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
    });

    it('component foo', function () {
      return emberGenerateDestroy(['component', 'foo'], (_file) => {
        expect(_file('addon/components/foo.js')).to.not.exist;

        expect(_file('addon/components/foo.hbs')).to.equal('{{yield}}');

        expect(_file('app/components/foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo';"
        );

        expect(_file('app/templates/components/foo.js')).to.not.exist;

        expect(_file('tests/integration/components/foo-test.js')).to.equal(
          fixture('component-test/addon.js', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
    });

    it('component x-foo', function () {
      return emberGenerateDestroy(['component', 'x-foo'], (_file) => {
        expect(_file('addon/components/x-foo.js')).to.not.exist;

        expect(_file('addon/components/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('app/components/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/x-foo';"
        );

        expect(_file('app/templates/components/x-foo.js')).to.not.exist;
        expect(_file('app/components/x-foo.hbs')).to.not.exist;

        expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
          fixture('component-test/addon.js', {
            replace: {
              component: 'x-foo',
              componentInvocation: 'XFoo',
            },
          })
        );
      });
    });

    it('component foo --strict', function () {
      return emberGenerateDestroy(['component', 'foo', '--strict'], (_file) => {
        expect(_file('addon/components/foo.js')).to.not.exist;
        expect(_file('addon/components/foo.gjs')).to.equal(
          fixture('component/template-only-component.gjs')
        );

        expect(_file('app/components/foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo';"
        );
      });
    });

    it('component foo --strict --component-class=@glimmer/component', function () {
      return emberGenerateDestroy(
        ['component', 'foo', '--strict', '--component-class=@glimmer/component'],
        (_file) => {
          expect(_file('addon/components/foo.js')).to.not.exist;
          expect(_file('addon/components/foo.gjs')).to.equal(
            fixture('component/glimmer-component.gjs')
          );

          expect(_file('app/components/foo.js')).to.contain(
            "export { default } from 'my-addon/components/foo';"
          );
        }
      );
    });

    it('component foo --strict --typescript', function () {
      return emberGenerateDestroy(['component', 'foo', '--strict', '--typescript'], (_file) => {
        expect(_file('addon/components/foo.ts')).to.not.exist;
        expect(_file('addon/components/foo.gts')).to.equal(
          fixture('component/template-only-component.gts')
        );

        expect(_file('app/components/foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo';"
        );
      });
    });

    it('component foo --strict --component-class=@glimmer/component --typescript', function () {
      return emberGenerateDestroy(
        ['component', 'foo', '--strict', '--component-class=@glimmer/component', '--typescript'],
        (_file) => {
          expect(_file('addon/components/foo.gts')).to.equal(
            fixture('component/glimmer-component.gts')
          );

          expect(_file('app/components/foo.js')).to.contain(
            "export { default } from 'my-addon/components/foo';"
          );
        }
      );
    });

    it('component foo/x-foo', function () {
      return emberGenerateDestroy(['component', 'foo/x-foo'], (_file) => {
        expect(_file('addon/components/foo/x-foo.js')).to.not.exist;

        expect(_file('addon/components/foo/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('app/components/foo/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo/x-foo';"
        );

        expect(_file('app/templates/components/foo/x-foo.js')).to.not.exist;

        expect(_file('tests/integration/components/foo/x-foo-test.js')).to.equal(
          fixture('component-test/addon.js', {
            replace: {
              component: 'foo/x-foo',
              componentInvocation: 'Foo::XFoo',
            },
          })
        );
      });
    });

    it('component x-foo --dummy', function () {
      return emberGenerateDestroy(['component', 'x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/x-foo.js')).to.not.exist;

        expect(_file('tests/dummy/app/components/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('app/components/x-foo.js')).to.not.exist;
        expect(_file('app/components/x-foo.hbs')).to.not.exist;
        expect(_file('app/templates/components/x-foo.js')).to.not.exist;

        expect(_file('tests/integration/components/x-foo-test.js')).to.not.exist;
      });
    });

    it('component foo/x-foo --dummy', function () {
      return emberGenerateDestroy(['component', 'foo/x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/foo/x-foo.js')).to.not.exist;

        expect(_file('tests/dummy/app/components/foo/x-foo.hbs')).to.equal('{{yield}}');
        expect(_file('tests/dummy/app/templates/components/foo/x-foo.hbs')).to.not.exist;

        expect(_file('app/components/foo/x-foo.js')).to.not.exist;
        expect(_file('app/components/foo/x-foo.hbs')).to.not.exist;
        expect(_file('app/templates/components/foo/x-foo.js')).to.not.exist;

        expect(_file('tests/integration/components/foo/x-foo-test.js')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' });
    });

    it('component foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['component', 'foo', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/components/foo.js')).to.not.exist;
        expect(_file('lib/my-addon/addon/components/foo.hbs')).to.equal('{{yield}}');
        expect(_file('lib/my-addon/addon/templates/components/foo.hbs')).to.not.exist;

        expect(_file('lib/my-addon/app/components/foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo';"
        );

        expect(_file('lib/my-addon/app/templates/components/foo.js')).to.not.exist;
        expect(_file('lib/my-addon/app/components/foo.hbs')).to.not.exist;

        expect(_file('tests/integration/components/foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
    });

    it('component x-foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(['component', 'x-foo', '--in-repo-addon=my-addon'], (_file) => {
        expect(_file('lib/my-addon/addon/components/x-foo.js')).to.not.exist;
        expect(_file('lib/my-addon/addon/components/x-foo.hbs')).to.equal('{{yield}}');
        expect(_file('lib/my-addon/addon/templates/components/x-foo.hbs')).to.not.exist;

        expect(_file('lib/my-addon/app/components/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/x-foo';"
        );

        expect(_file('lib/my-addon/app/templates/components/x-foo.js')).to.not.exist;
        expect(_file('lib/my-addon/app/components/x-foo.hbs')).to.not.exist;

        expect(_file('tests/integration/components/x-foo-test.js')).to.equal(
          fixture('component-test/app.js', {
            replace: {
              component: 'x-foo',
              componentInvocation: 'XFoo',
            },
          })
        );
      });
    });
  });
});
