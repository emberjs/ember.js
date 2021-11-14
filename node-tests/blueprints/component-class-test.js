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

const { EMBER_SET_COMPONENT_TEMPLATE } = require('../../blueprints/component');

const glimmerComponentContents = `import Component from '@glimmer/component';

export default class FooComponent extends Component {
}
`;

const emberComponentContents = `import Component from '@ember/component';

export default Component.extend({
});
`;

const templateOnlyContents = `import templateOnly from '@ember/component/template-only';

export default templateOnly();
`;

describe('Blueprint: component-class', function () {
  setupTestHooks(this);

  describe('in app', function () {
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

    it('component-class foo', function () {
      return emberGenerateDestroy(['component-class', 'foo'], (_file) => {
        expect(_file('app/components/foo.js')).to.equal(emberComponentContents);
      });
    });

    if (EMBER_SET_COMPONENT_TEMPLATE) {
      // classic default
      it('component-class foo --component-structure=classic --component-class=@ember/component', function () {
        return emberGenerateDestroy(
          [
            'component-class',
            'foo',
            '--component-structure',
            'classic',
            '--component-class',
            '@ember/component',
          ],
          (_file) => {
            expect(_file('app/components/foo.js')).to.equal(emberComponentContents);
          }
        );
      });

      // Octane default
      it('component-class foo --component-structure=flat --component-class=@glimmer/component', function () {
        return emberGenerateDestroy(
          [
            'component-class',
            '--component-structure',
            'flat',
            '--component-class',
            '@glimmer/component',
            'foo',
          ],
          (_file) => {
            expect(_file('app/components/foo.js')).to.equal(glimmerComponentContents);
          }
        );
      });

      it('component-class foo --component-structure=flat', function () {
        return emberGenerateDestroy(
          ['component-class', '--component-structure', 'flat', 'foo'],
          (_file) => {
            expect(_file('app/components/foo.js')).to.equal(emberComponentContents);
          }
        );
      });

      it('component-class foo --component-structure=nested', function () {
        return emberGenerateDestroy(
          ['component-class', '--component-structure', 'nested', 'foo'],
          (_file) => {
            expect(_file('app/components/foo/index.js')).to.equal(emberComponentContents);
          }
        );
      });

      it('component-class foo --component-structure=classic', function () {
        return emberGenerateDestroy(
          ['component-class', '--component-structure', 'classic', 'foo'],
          (_file) => {
            expect(_file('app/components/foo.js')).to.equal(emberComponentContents);
          }
        );
      });

      it('component-class foo --component-class=@ember/component', function () {
        return emberGenerateDestroy(
          ['component-class', '--component-class', '@ember/component', 'foo'],
          (_file) => {
            expect(_file('app/components/foo.js')).to.equal(emberComponentContents);
          }
        );
      });

      it('component-class foo --component-class=@glimmer/component', function () {
        return emberGenerateDestroy(
          ['component-class', '--component-class', '@glimmer/component', 'foo'],
          (_file) => {
            expect(_file('app/components/foo.js')).to.equal(glimmerComponentContents);
          }
        );
      });

      it('component-class foo --component-class=@ember/component/template-only', function () {
        return emberGenerateDestroy(
          ['component-class', '--component-class', '@ember/component/template-only', 'foo'],
          (_file) => {
            expect(_file('app/components/foo.js')).to.equal(templateOnlyContents);
          }
        );
      });
    }

    it('component-class x-foo', function () {
      return emberGenerateDestroy(['component-class', 'x-foo'], (_file) => {
        expect(_file('app/components/x-foo.js')).to.equal(fixture('component/component-dash.js'));
      });
    });

    it('component-class foo/x-foo', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo'], (_file) => {
        expect(_file('app/components/foo/x-foo.js')).to.equal(
          fixture('component/component-nested.js')
        );
      });
    });

    it('component-class x-foo --path foo', function () {
      return emberGenerateDestroy(['component-class', 'x-foo', '--path', 'foo'], (_file) => {
        expect(_file('app/components/x-foo.js')).to.equal(fixture('component/component-dash.js'));
      });
    });

    it('component-class foo.js', function () {
      return emberGenerateDestroy(['component-class', 'foo.js'], (_file) => {
        expect(_file('app/components/foo.js.js')).to.not.exist;
        expect(_file('app/components/foo.js')).to.equal(fixture('component/component.js'));
      });
    });

    it('component-class x-foo --pod', function () {
      return emberGenerateDestroy(['component-class', 'x-foo', '--pod'], (_file) => {
        expect(_file('app/components/x-foo/component.js')).to.equal(
          fixture('component/component-dash.js')
        );
      });
    });

    it('component-class foo/x-foo --pod', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo', '--pod'], (_file) => {
        expect(_file('app/components/foo/x-foo/component.js')).to.equal(
          fixture('component/component-nested.js')
        );
      });
    });

    it('component-class x-foo --pod --path foo', function () {
      return emberGenerateDestroy(
        ['component-class', 'x-foo', '--pod', '--path', 'foo'],
        (_file) => {
          expect(_file('app/foo/x-foo/component.js')).to.equal(
            fixture('component/component-dash.js')
          );
        }
      );
    });

    it('component-class foo/x-foo --pod --path bar', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo/x-foo', '--pod', '--path', 'bar'],
        (_file) => {
          expect(_file('app/bar/foo/x-foo/component.js')).to.equal(
            fixture('component/component-nested.js')
          );
        }
      );
    });

    it('component-class x-foo --pod --path bar/foo', function () {
      return emberGenerateDestroy(
        ['component-class', 'x-foo', '--pod', '--path', 'bar/foo'],
        (_file) => {
          expect(_file('app/bar/foo/x-foo/component.js')).to.equal(
            fixture('component/component-dash.js')
          );
        }
      );
    });

    it('component-class foo/x-foo --pod --path bar/baz', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo/x-foo', '--pod', '--path', 'bar/baz'],
        (_file) => {
          expect(_file('app/bar/baz/foo/x-foo/component.js')).to.equal(
            fixture('component/component-nested.js')
          );
        }
      );
    });

    it('component-class x-foo --pod -no-path', function () {
      return emberGenerateDestroy(['component-class', 'x-foo', '--pod', '-no-path'], (_file) => {
        expect(_file('app/x-foo/component.js')).to.equal(fixture('component/component-dash.js'));
      });
    });

    it('component-class foo/x-foo --pod -no-path', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo/x-foo', '--pod', '-no-path'],
        (_file) => {
          expect(_file('app/foo/x-foo/component.js')).to.equal(
            fixture('component/component-nested.js')
          );
        }
      );
    });

    it('component-class x-foo.js --pod', function () {
      return emberGenerateDestroy(['component-class', 'x-foo.js', '--pod'], (_file) => {
        expect(_file('app/components/x-foo.js/component.js')).to.not.exist;
        expect(_file('app/components/x-foo/component.js')).to.equal(
          fixture('component/component-dash.js')
        );
      });
    });

    describe('with podModulePrefix', function () {
      beforeEach(function () {
        setupPodConfig({ podModulePrefix: true });
      });

      it('component-class foo --pod', function () {
        return emberGenerateDestroy(['component-class', 'foo', '--pod'], (_file) => {
          expect(_file('app/pods/components/foo/component.js')).to.equal(
            fixture('component/component.js')
          );
        });
      });

      it('component-class x-foo --pod', function () {
        return emberGenerateDestroy(['component-class', 'x-foo', '--pod'], (_file) => {
          expect(_file('app/pods/components/x-foo/component.js')).to.equal(
            fixture('component/component-dash.js')
          );
        });
      });

      it('component-class foo/x-foo --pod', function () {
        return emberGenerateDestroy(['component-class', 'foo/x-foo', '--pod'], (_file) => {
          expect(_file('app/pods/components/foo/x-foo/component.js')).to.equal(
            fixture('component/component-nested.js')
          );
        });
      });

      it('component-class x-foo --pod --path foo', function () {
        return emberGenerateDestroy(
          ['component-class', 'x-foo', '--pod', '--path', 'foo'],
          (_file) => {
            expect(_file('app/pods/foo/x-foo/component.js')).to.equal(
              fixture('component/component-dash.js')
            );
          }
        );
      });

      it('component-class foo/x-foo --pod --path bar', function () {
        return emberGenerateDestroy(
          ['component-class', 'foo/x-foo', '--pod', '--path', 'bar'],
          (_file) => {
            expect(_file('app/pods/bar/foo/x-foo/component.js')).to.equal(
              fixture('component/component-nested.js')
            );
          }
        );
      });

      it('component-class x-foo --pod --path bar/foo', function () {
        return emberGenerateDestroy(
          ['component-class', 'x-foo', '--pod', '--path', 'bar/foo'],
          (_file) => {
            expect(_file('app/pods/bar/foo/x-foo/component.js')).to.equal(
              fixture('component/component-dash.js')
            );
          }
        );
      });

      it('component-class foo/x-foo --pod --path bar/baz', function () {
        return emberGenerateDestroy(
          ['component-class', 'foo/x-foo', '--pod', '--path', 'bar/baz'],
          (_file) => {
            expect(_file('app/pods/bar/baz/foo/x-foo/component.js')).to.equal(
              fixture('component/component-nested.js')
            );
          }
        );
      });

      it('component-class x-foo --pod -no-path', function () {
        return emberGenerateDestroy(['component-class', 'x-foo', '--pod', '-no-path'], (_file) => {
          expect(_file('app/pods/x-foo/component.js')).to.equal(
            fixture('component/component-dash.js')
          );
        });
      });

      it('component-class foo/x-foo --pod -no-path', function () {
        return emberGenerateDestroy(
          ['component-class', 'foo/x-foo', '--pod', '-no-path'],
          (_file) => {
            expect(_file('app/pods/foo/x-foo/component.js')).to.equal(
              fixture('component/component-nested.js')
            );
          }
        );
      });
    });
  });

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

    it('component-class foo', function () {
      return emberGenerateDestroy(['component-class', 'foo'], (_file) => {
        expect(_file('app/components/foo.js')).to.equal(glimmerComponentContents);
      });
    });

    it('component-class x-foo', function () {
      return emberGenerateDestroy(['component-class', 'x-foo'], (_file) => {
        expect(_file('app/components/x-foo.js')).to.equal(
          glimmerComponentContents.replace('FooComponent', 'XFooComponent')
        );
      });
    });

    it('component-class x-foo.js', function () {
      return emberGenerateDestroy(['component-class', 'x-foo.js'], (_file) => {
        expect(_file('app/components/x-foo.js.js')).to.not.exist;
        expect(_file('app/components/x-foo.js')).to.equal(
          glimmerComponentContents.replace('FooComponent', 'XFooComponent')
        );
      });
    });

    it('component-class foo/x-foo', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo'], (_file) => {
        expect(_file('app/components/foo/x-foo.js')).to.equal(
          glimmerComponentContents.replace('FooComponent', 'FooXFooComponent')
        );
      });
    });

    it('component-class foo/x-foo --component-class="@glimmer/component"', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo/x-foo', '--component-class', '@glimmer/component'],
        (_file) => {
          expect(_file('app/components/foo/x-foo.js')).to.equal(
            glimmerComponentContents.replace('FooComponent', 'FooXFooComponent')
          );
        }
      );
    });
  });

  describe('in addon', function () {
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

    it('component-class foo', function () {
      return emberGenerateDestroy(['component-class', 'foo'], (_file) => {
        expect(_file('addon/components/foo.js')).to.equal(fixture('component/component-addon.js'));
        expect(_file('app/components/foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo';"
        );
      });
    });

    it('component-class x-foo', function () {
      return emberGenerateDestroy(['component-class', 'x-foo'], (_file) => {
        expect(_file('addon/components/x-foo.js')).to.equal(
          fixture('component/component-addon-dash.js')
        );
        expect(_file('app/components/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/x-foo';"
        );
      });
    });

    it('component-class x-foo.js', function () {
      return emberGenerateDestroy(['component-class', 'x-foo.js'], (_file) => {
        expect(_file('addon/components/x-foo.js.js')).to.not.exist;
        expect(_file('app/components/x-foo.js.js')).to.not.exist;
        expect(_file('addon/components/x-foo.js')).to.equal(
          fixture('component/component-addon-dash.js')
        );
        expect(_file('app/components/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/x-foo';"
        );
      });
    });

    it('component-class foo/x-foo', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo'], (_file) => {
        expect(_file('addon/components/foo/x-foo.js')).to.equal(
          fixture('component/component-addon-nested.js')
        );
        expect(_file('app/components/foo/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo/x-foo';"
        );
      });
    });

    it('component-class x-foo --dummy', function () {
      return emberGenerateDestroy(['component-class', 'x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/x-foo.js')).to.equal(
          fixture('component/component-addon-dash.js')
        );
        expect(_file('app/components/x-foo.js')).to.not.exist;
      });
    });

    it('component-class foo/x-foo --dummy', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/foo/x-foo.js')).to.equal(
          fixture('component/component-addon-nested.js')
        );
        expect(_file('app/components/foo/x-foo.js')).to.not.exist;
      });
    });

    it('component-class x-foo.js --dummy', function () {
      return emberGenerateDestroy(['component-class', 'x-foo.js', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/x-foo.js.js')).to.not.exist;
        expect(_file('app/components/x-foo.js.js')).to.not.exist;
        expect(_file('tests/dummy/app/components/x-foo.js')).to.equal(
          fixture('component/component-addon-dash.js')
        );
        expect(_file('app/components/x-foo.js')).to.not.exist;
      });
    });

    it('component-class x-foo --pod', function () {
      return emberGenerateDestroy(['component-class', 'x-foo', '--pod'], (_file) => {
        expect(_file('addon/components/x-foo/component.js')).to.equal(
          fixture('component/component-addon-dash-pod.js')
        );
        expect(_file('app/components/x-foo/component.js')).to.contain(
          "export { default } from 'my-addon/components/x-foo/component';"
        );
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

    it('component-class foo', function () {
      return emberGenerateDestroy(['component-class', 'foo'], (_file) => {
        expect(_file('addon/components/foo.js')).to.equal(glimmerComponentContents);
        expect(_file('app/components/foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo';"
        );
      });
    });

    it('component-class x-foo', function () {
      return emberGenerateDestroy(['component-class', 'x-foo'], (_file) => {
        expect(_file('addon/components/x-foo.js')).to.equal(
          glimmerComponentContents.replace('FooComponent', 'XFooComponent')
        );
        expect(_file('app/components/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/x-foo';"
        );
      });
    });

    it('component-class foo/x-foo', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo'], (_file) => {
        expect(_file('addon/components/foo/x-foo.js')).to.equal(
          glimmerComponentContents.replace('FooComponent', 'FooXFooComponent')
        );
        expect(_file('app/components/foo/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo/x-foo';"
        );
      });
    });

    it('component-class x-foo --dummy', function () {
      return emberGenerateDestroy(['component-class', 'x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/x-foo.js')).equal(
          glimmerComponentContents.replace('FooComponent', 'XFooComponent')
        );
        expect(_file('app/components/x-foo.js')).to.not.exist;
      });
    });

    it('component-class foo/x-foo --dummy', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/foo/x-foo.js')).to.equal(
          glimmerComponentContents.replace('FooComponent', 'FooXFooComponent')
        );
        expect(_file('app/components/foo/x-foo.hbs')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function () {
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

    it('component-class foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/foo.js')).to.equal(
            fixture('component/component-addon.js')
          );
          expect(_file('lib/my-addon/app/components/foo.js')).to.contain(
            "export { default } from 'my-addon/components/foo';"
          );
        }
      );
    });

    it('component-class x-foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['component-class', 'x-foo', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/x-foo.js')).to.equal(
            fixture('component/component-addon-dash.js')
          );
          expect(_file('lib/my-addon/app/components/x-foo.js')).to.contain(
            "export { default } from 'my-addon/components/x-foo';"
          );
        }
      );
    });

    it('component-class x-foo.js --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['component-class', 'x-foo.js', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/x-foo.js.js')).to.not.exist;
          expect(_file('lib/my-addon/app/components/x-foo.js.js')).to.not.exist;

          expect(_file('lib/my-addon/addon/components/x-foo.js')).to.equal(
            fixture('component/component-addon-dash.js')
          );
          expect(_file('lib/my-addon/app/components/x-foo.js')).to.contain(
            "export { default } from 'my-addon/components/x-foo';"
          );
        }
      );
    });

    it('component-class foo/x-foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo/x-foo', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/foo/x-foo.js')).to.equal(
            fixture('component/component-addon-nested.js')
          );
          expect(_file('lib/my-addon/app/components/foo/x-foo.js')).to.contain(
            "export { default } from 'my-addon/components/foo/x-foo';"
          );
        }
      );
    });

    it('component-class x-foo --in-repo-addon=my-addon --pod', function () {
      return emberGenerateDestroy(
        ['component-class', 'x-foo', '--in-repo-addon=my-addon', '--pod'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/x-foo/component.js')).to.equal(
            fixture('component/component-addon-dash-pod.js')
          );
          expect(_file('lib/my-addon/app/components/x-foo/component.js')).to.contain(
            "export { default } from 'my-addon/components/x-foo/component';"
          );
        }
      );
    });

    it('component-class x-foo.js --in-repo-addon=my-addon --pod', function () {
      return emberGenerateDestroy(
        ['component-class', 'x-foo.js', '--in-repo-addon=my-addon', '--pod'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/x-foo/component.js.js')).to.not.exist;
          expect(_file('lib/my-addon/app/components/x-foo/component.js.js')).to.not.exist;
          expect(_file('lib/my-addon/addon/components/x-foo/component.js')).to.equal(
            fixture('component/component-addon-dash-pod.js')
          );
          expect(_file('lib/my-addon/app/components/x-foo/component.js')).to.contain(
            "export { default } from 'my-addon/components/x-foo/component';"
          );
        }
      );
    });

    it('component-class foo/x-foo --in-repo-addon=my-addon --pod', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo/x-foo', '--in-repo-addon=my-addon', '--pod'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/foo/x-foo/component.js')).to.equal(
            fixture('component/component-addon-nested-pod.js')
          );
          expect(_file('lib/my-addon/app/components/foo/x-foo/component.js')).to.contain(
            "export { default } from 'my-addon/components/foo/x-foo/component';"
          );
        }
      );
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

    it('component-class foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/foo.js')).to.equal(glimmerComponentContents);
          expect(_file('lib/my-addon/app/components/foo.js')).to.contain(
            "export { default } from 'my-addon/components/foo';"
          );
        }
      );
    });

    it('component-class x-foo --in-repo-addon=my-addon', function () {
      return emberGenerateDestroy(
        ['component-class', 'x-foo', '--in-repo-addon=my-addon'],
        (_file) => {
          expect(_file('lib/my-addon/addon/components/x-foo.js')).to.equal(
            glimmerComponentContents.replace('FooComponent', 'XFooComponent')
          );
          expect(_file('lib/my-addon/app/components/x-foo.js')).to.contain(
            "export { default } from 'my-addon/components/x-foo';"
          );
        }
      );
    });
  });
});
