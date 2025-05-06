'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const glimmerComponentContents = `import Component from '@glimmer/component';

export default class Foo extends Component {}
`;

const emberComponentContents = `import Component from '@ember/component';

export default Component.extend({});
`;

const templateOnlyContents = `import templateOnly from '@ember/component/template-only';

export default templateOnly();
`;

describe('Blueprint: component-class', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew();
    });

    it('component-class foo', function () {
      return emberGenerateDestroy(['component-class', 'foo'], (_file) => {
        expect(_file('app/components/foo.js')).to.equal(glimmerComponentContents);
      });
    });

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
          expect(_file('app/components/foo.js')).to.equal(glimmerComponentContents);
        }
      );
    });

    it('component-class foo --component-structure=nested', function () {
      return emberGenerateDestroy(
        ['component-class', '--component-structure', 'nested', 'foo'],
        (_file) => {
          expect(_file('app/components/foo/index.js')).to.equal(glimmerComponentContents);
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

    it('component-class x-foo', function () {
      return emberGenerateDestroy(['component-class', 'x-foo'], (_file) => {
        expect(_file('app/components/x-foo.js')).to.equal(
          glimmerComponentContents.replace('Foo', 'XFoo')
        );
      });
    });

    it('component-class x-foo.js', function () {
      return emberGenerateDestroy(['component-class', 'x-foo.js'], (_file) => {
        expect(_file('app/components/x-foo.js.js')).to.not.exist;
        expect(_file('app/components/x-foo.js')).to.equal(
          glimmerComponentContents.replace('Foo', 'XFoo')
        );
      });
    });

    it('component-class foo/x-foo', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo'], (_file) => {
        expect(_file('app/components/foo/x-foo.js')).to.equal(
          glimmerComponentContents.replace('Foo', 'FooXFoo')
        );
      });
    });

    it('component-class foo/x-foo --component-class="@glimmer/component"', function () {
      return emberGenerateDestroy(
        ['component-class', 'foo/x-foo', '--component-class', '@glimmer/component'],
        (_file) => {
          expect(_file('app/components/foo/x-foo.js')).to.equal(
            glimmerComponentContents.replace('Foo', 'FooXFoo')
          );
        }
      );
    });
  });

  describe('in addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'addon' });
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
          glimmerComponentContents.replace('Foo', 'XFoo')
        );
        expect(_file('app/components/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/x-foo';"
        );
      });
    });

    it('component-class foo/x-foo', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo'], (_file) => {
        expect(_file('addon/components/foo/x-foo.js')).to.equal(
          glimmerComponentContents.replace('Foo', 'FooXFoo')
        );
        expect(_file('app/components/foo/x-foo.js')).to.contain(
          "export { default } from 'my-addon/components/foo/x-foo';"
        );
      });
    });

    it('component-class x-foo --dummy', function () {
      return emberGenerateDestroy(['component-class', 'x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/x-foo.js')).equal(
          glimmerComponentContents.replace('Foo', 'XFoo')
        );
        expect(_file('app/components/x-foo.js')).to.not.exist;
      });
    });

    it('component-class foo/x-foo --dummy', function () {
      return emberGenerateDestroy(['component-class', 'foo/x-foo', '--dummy'], (_file) => {
        expect(_file('tests/dummy/app/components/foo/x-foo.js')).to.equal(
          glimmerComponentContents.replace('Foo', 'FooXFoo')
        );
        expect(_file('app/components/foo/x-foo.hbs')).to.not.exist;
      });
    });
  });

  describe('in in-repo-addon', function () {
    beforeEach(function () {
      return emberNew({ target: 'in-repo-addon' });
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
            glimmerComponentContents.replace('Foo', 'XFoo')
          );
          expect(_file('lib/my-addon/app/components/x-foo.js')).to.contain(
            "export { default } from 'my-addon/components/x-foo';"
          );
        }
      );
    });
  });
});
