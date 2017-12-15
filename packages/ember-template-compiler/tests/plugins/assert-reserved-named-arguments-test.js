import { EMBER_GLIMMER_NAMED_ARGUMENTS } from 'ember/features';
import { compile } from '../../index';

QUnit.module('ember-template-compiler: assert-reserved-named-arguments');

if (EMBER_GLIMMER_NAMED_ARGUMENTS) {
  let RESERVED = [
    '@arguments',
    '@args',
    // anything else that doesn't start with a lower case letter
    '@Arguments', '@Args',
    '@A', '@FOO', '@Foo',
    '@.', '@_', '@-', '@$'
  ];

  RESERVED.forEach(name => {
    QUnit.test(`'${name}' is reserved`, () => {
      expect(3);

      expectAssertion(() => {
        compile(`{{${name}}}`, {
          moduleName: 'baz/foo-bar'
        });
      }, `'${name}' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if ${name}}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar'
        });
      }, `'${name}' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if ${name} "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar'
        });
      }, `'${name}' is reserved. ('baz/foo-bar' @ L1:C17) `);
    });
  });

  let DE_FACTO_RESERVED = [
    '@',
    '@0', '@1', '@2',
    '@@', '@!', '@='
  ];

  DE_FACTO_RESERVED.forEach(name => {
    QUnit.test(`'${name}' is de facto reserved (parse error)`, assert => {
      expect(3);

      assert.throws(() => {
        compile(`{{${name}}}`, {
          moduleName: 'baz/foo-bar'
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile(`{{#if ${name}}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar'
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile(`{{input type=(if ${name} "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar'
        });
      }, /Expecting 'ID'/);
    });
  });
} else {
  QUnit.test('Paths beginning with @ are not valid', () => {
    expect(3);

    expectAssertion(() => {
      compile('{{@foo}}', {
        moduleName: 'baz/foo-bar'
      });
    }, `'@foo' is not a valid path. ('baz/foo-bar' @ L1:C2) `);

    expectAssertion(() => {
      compile('{{#if @foo}}Yup{{/if}}', {
        moduleName: 'baz/foo-bar'
      });
    }, `'@foo' is not a valid path. ('baz/foo-bar' @ L1:C6) `);

    expectAssertion(() => {
      compile('{{input type=(if @foo "bar" "baz")}}', {
        moduleName: 'baz/foo-bar'
      });
    }, `'@foo' is not a valid path. ('baz/foo-bar' @ L1:C17) `);
  });
}
