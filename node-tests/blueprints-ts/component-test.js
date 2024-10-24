'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const fixture = require('../helpers/fixture');

function glimmerComponentContents(componentName = 'Foo') {
  return `import Component from '@glimmer/component';

export interface ${componentName}Signature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: []
  };
  // The element to which \`...attributes\` is applied in the component template
  Element: null;
}

export default class ${componentName} extends Component<${componentName}Signature> {}
`;
}

const emberComponentContents = `import Component from '@ember/component';


export default Component.extend({});
`;

const templateOnlyContents = `import templateOnly from '@ember/component/template-only';

export interface FooSignature {
  // The arguments accepted by the component
  Args: {};
  // Any blocks yielded by the component
  Blocks: {
    default: []
  };
  // The element to which \`...attributes\` is applied in the component template
  Element: null;
}

export default templateOnly<FooSignature>();
`;

describe('TS Blueprint: component', function () {
  setupTestHooks(this);

  describe('in app', function () {
    beforeEach(function () {
      return emberNew({ cliArgs: ['--typescript'] });
    });

    it('component foo', function () {
      return emberGenerateDestroy(['component', 'foo'], (_file) => {
        expect(_file('app/components/foo.ts')).to.not.exist;
        expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/foo-test.ts')).to.equal(
          fixture('component-test/rfc232-template.ts', {
            replace: {
              component: 'foo',
              componentInvocation: 'Foo',
            },
          })
        );
      });
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
          expect(_file('app/components/foo.ts')).to.equal(glimmerComponentContents());
          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.ts')).to.equal(
            fixture('component-test/rfc232-template.ts', {
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

          expect(_file('tests/integration/components/foo-test.ts')).to.equal(
            fixture('component-test/rfc232-template.ts', {
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

          expect(_file('tests/integration/components/foo-test.ts')).to.equal(
            fixture('component-test/rfc232-template.ts', {
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
          expect(_file('app/components/foo.ts')).to.equal(emberComponentContents);

          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.ts')).to.equal(
            fixture('component-test/rfc232-template.ts', {
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
          expect(_file('app/components/foo.ts')).to.equal(glimmerComponentContents());

          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.ts')).to.equal(
            fixture('component-test/rfc232-template.ts', {
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
          expect(_file('app/components/foo.ts')).to.equal(templateOnlyContents);

          expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo-test.ts')).to.equal(
            fixture('component-test/rfc232-template.ts', {
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
        expect(_file('app/components/foo.ts')).to.not.exist;

        expect(_file('app/components/foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/foo-test.ts')).to.equal(
          fixture('component-test/rfc232-template.ts', {
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
        expect(_file('app/components/x-foo.ts')).to.not.exist;
        expect(_file('app/components/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/x-foo-test.ts')).to.equal(
          fixture('component-test/rfc232-template.ts', {
            replace: {
              component: 'x-foo',
              componentInvocation: 'XFoo',
            },
          })
        );
      });
    });

    it('component x-foo.ts', function () {
      return emberGenerateDestroy(['component', 'x-foo.ts'], (_file) => {
        expect(_file('app/components/x-foo.ts')).to.not.exist;
        expect(_file('app/components/x-foo.js.js')).to.not.exist;
        expect(_file('app/templates/components/x-foo.ts.hbs')).to.not.exist;
        expect(_file('tests/integration/components/x-foo-test.ts.ts')).to.not.exist;

        expect(_file('app/components/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/x-foo-test.ts')).to.equal(
          fixture('component-test/rfc232-template.ts', {
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
        expect(_file('app/components/foo/x-foo.ts')).to.not.exist;
        expect(_file('app/components/foo/x-foo.hbs')).to.equal('{{yield}}');

        expect(_file('tests/integration/components/foo/x-foo-test.ts')).to.equal(
          fixture('component-test/rfc232-template.ts', {
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
          expect(_file('app/components/foo/x-foo.ts')).to.equal(
            glimmerComponentContents('FooXFoo')
          );
          expect(_file('app/components/foo/x-foo.hbs')).to.equal('{{yield}}');

          expect(_file('tests/integration/components/foo/x-foo-test.ts')).to.equal(
            fixture('component-test/rfc232-template.ts', {
              replace: {
                component: 'foo/x-foo',
                componentInvocation: 'Foo::XFoo',
              },
            })
          );
        }
      );
    });
  });
});
