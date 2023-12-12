'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const setupPodConfig = blueprintHelpers.setupPodConfig;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

const setupTestEnvironment = require('../helpers/setup-test-environment');
const enableOctane = setupTestEnvironment.enableOctane;

const glimmerComponentContents = `import Component from '@glimmer/component';

export default class FooComponent extends Component {}
`;

const emberComponentContents = `import Component from '@ember/component';

export default Component.extend({});
`;

const templateOnlyContents = `import templateOnly from '@ember/component/template-only';

export default templateOnly();
`;

describe('Blueprint: component', function () {
  setupTestHooks(this);

  describe('in app - octane', function () {
    enableOctane();

    beforeEach(function () {
      return emberNew()
        .then(() =>
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', dev: true },
          ])
        )
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
    });

    it('component foo', function () {
      return emberGenerateDestroy(['component', 'foo'], (_file) => {
        expect(_file('app/components/foo.js')).to.not.exist;
        expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/foo-test.js')).to.equal(
          fixture('component-test/default-template.js', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
    });

    // classic default
    it('component foo --component-structure=classic --component-class=@ember/component', function () {
      return emberGenerateDestroy(
        [
          'component',
          'foo',
          '--component-structure',
          'classic',
          '--component-class',
          '@ember/component',
        ],
        (_file) => {
          expect(_file('app/components/foo.js')).to.equal(emberComponentContents);

          expect(_file('app/templates/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    // Octane default
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
            fixture('component-test/default-template.js', {
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
            fixture('component-test/default-template.js', {
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
            fixture('component-test/default-template.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        }
      );
    });

    it('component foo --component-structure=classic', function () {
      return emberGenerateDestroy(
        ['component', '--component-structure', 'classic', 'foo'],
        (_file) => {
          expect(_file('app/templates/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.js')).to.equal(
            fixture('component-test/default-template.js', {
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
            fixture('component-test/default-template.js', {
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
            fixture('component-test/default-template.js', {
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
            fixture('component-test/default-template.js', {
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
          fixture('component-test/default-template.js', {
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
          fixture('component-test/default-template.js', {
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
          fixture('component-test/default-template.js', {
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
          fixture('component-test/default-template.js', {
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
            glimmerComponentContents.replace('FooComponent', 'FooXFooComponent')
          );
          expect(_file('app/components/foo/x-foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo/x-foo-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'foo/x-foo',
                componentInvocation: 'Foo::XFoo',
              },
            })
          );
        }
      );
    });

    describe('with podModulePrefix', function () {
      beforeEach(function () {
        setupPodConfig({ podModulePrefix: true });
      });

      it('component foo --pod', function () {
        return emberGenerateDestroy(['component', 'foo', '--pod'], (_file) => {
          expect(_file('app/pods/components/foo/template.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/pods/components/foo/component-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'foo',
                componentInvocation: 'Foo',
              },
            })
          );
        });
      });

      it('component x-foo --pod', function () {
        return emberGenerateDestroy(['component', 'x-foo', '--pod'], (_file) => {
          expect(_file('app/pods/components/x-foo/template.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/pods/components/x-foo/component-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'x-foo',
                componentInvocation: 'XFoo',
              },
            })
          );
        });
      });

      it('component foo/x-foo --pod', function () {
        return emberGenerateDestroy(['component', 'foo/x-foo', '--pod'], (_file) => {
          expect(_file('app/pods/components/foo/x-foo/template.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/pods/components/foo/x-foo/component-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'foo/x-foo',
                componentInvocation: 'Foo::XFoo',
              },
            })
          );
        });
      });

      it('component x-foo --pod --path foo', function () {
        return emberGenerateDestroy(['component', 'x-foo', '--pod', '--path', 'foo'], (_file) => {
          expect(_file('app/pods/foo/x-foo/template.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/pods/foo/x-foo/component-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'x-foo',
                componentInvocation: 'XFoo',
                path: 'foo/',
              },
            })
          );
        });
      });

      it('component foo/x-foo --pod --path bar', function () {
        return emberGenerateDestroy(
          ['component', 'foo/x-foo', '--pod', '--path', 'bar'],
          (_file) => {
            expect(_file('app/pods/bar/foo/x-foo/template.hbs')).to.equal('{{yield}}');

            expect(_file('tests/integration/pods/bar/foo/x-foo/component-test.js')).to.equal(
              fixture('component-test/default-template.js', {
                replace: {
                  component: 'foo/x-foo',
                  componentInvocation: 'Foo::XFoo',
                  path: 'bar/',
                },
              })
            );
          }
        );
      });

      it('component x-foo --pod --path bar/foo', function () {
        return emberGenerateDestroy(
          ['component', 'x-foo', '--pod', '--path', 'bar/foo'],
          (_file) => {
            expect(_file('app/pods/bar/foo/x-foo/template.hbs')).to.equal('{{yield}}');
            expect(_file('tests/integration/pods/bar/foo/x-foo/component-test.js')).to.equal(
              fixture('component-test/default-template.js', {
                replace: {
                  component: 'x-foo',
                  componentInvocation: 'XFoo',
                  path: 'bar/foo/',
                },
              })
            );
          }
        );
      });

      it('component foo/x-foo --pod --path bar/baz', function () {
        return emberGenerateDestroy(
          ['component', 'foo/x-foo', '--pod', '--path', 'bar/baz'],
          (_file) => {
            expect(_file('app/pods/bar/baz/foo/x-foo/template.hbs')).to.equal('{{yield}}');

            expect(_file('tests/integration/pods/bar/baz/foo/x-foo/component-test.js')).to.equal(
              fixture('component-test/default-template.js', {
                replace: {
                  component: 'foo/x-foo',
                  componentInvocation: 'Foo::XFoo',
                  path: 'bar/baz/',
                },
              })
            );
          }
        );
      });

      it('component x-foo --pod -no-path', function () {
        return emberGenerateDestroy(['component', 'x-foo', '--pod', '-no-path'], (_file) => {
          expect(_file('app/pods/x-foo/template.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/pods/x-foo/component-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'x-foo',
                componentInvocation: 'XFoo',
              },
            })
          );
        });
      });

      it('component foo/x-foo --pod -no-path', function () {
        return emberGenerateDestroy(['component', 'foo/x-foo', '--pod', '-no-path'], (_file) => {
          expect(_file('app/pods/foo/x-foo/template.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/pods/foo/x-foo/component-test.js')).to.equal(
            fixture('component-test/default-template.js', {
              replace: {
                component: 'foo/x-foo',
                componentInvocation: 'Foo::XFoo',
              },
            })
          );
        });
      });
    });
  });

  describe('in addon - octane', function () {
    enableOctane();

    beforeEach(function () {
      return emberNew({ target: 'addon' })
        .then(() =>
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', dev: true },
          ])
        )
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
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
          fixture('component-test/default-template.js', {
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
          fixture('component-test/default-template.js', {
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
        expect(_file('addon/components/foo/x-foo.js')).to.not.exist;

        expect(_file('addon/components/foo/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('app/components/foo/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo/x-foo';"
        );

        expect(_file('app/templates/components/foo/x-foo.js')).to.not.exist;

        expect(_file('tests/integration/components/foo/x-foo-test.js')).to.equal(
          fixture('component-test/default-template.js', {
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

  describe('in in-repo-addon - octane', function () {
    enableOctane();

    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' })
        .then(() =>
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', dev: true },
          ])
        )
        .then(() => generateFakePackageManifest('ember-cli-qunit', '4.1.0'));
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
          fixture('component-test/default-template.js', {
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
          fixture('component-test/default-template.js', {
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
