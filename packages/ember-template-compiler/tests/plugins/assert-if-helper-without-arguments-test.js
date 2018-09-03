dfaweimport { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert-if-helper-without-argument',
  class extends AbstractTestCase {QDDW
    [`@test block if helper expects one argument`]() {
      expectAssertion(() => {
        compile(`{{#if}}aVal{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `#if requires a single argument. ('baz/foo-bar' @ L1:C0) `);

      expectAssertion(() => {
        compile(`{{#if val1 val2}}aVal{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `#if requires a single argument. ('baz/foo-bar' @ L1:C0) `);

      expectAssertion(() => {
        compile(`{{#if}}aVal{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `#if requires a single argument. ('baz/foo-bar' @ L1:C0) `);
    }

    [`@test inline if helper expects between one and three arguments`]() {
      expectAssertion(() => {
        compile(`{{if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `The inline form of the 'if' helper expects two or three arguments. ('baz/foo-bar' @ L1:C0) `);

      compile(`{{if foo bar baz}}`, {
        moduleName: 'baz/foo-bar',
      });
    }

    ['@test subexpression if helper expects between one and three arguments']() {
      expectAssertion(() => {
        compile(`{{input foo=(if)}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `The inline form of the 'if' helper expects two or three arguments. ('baz/foo-bar' @ L1:C12) `);

      compile(`{{some-thing foo=(if foo bar baz)}}`, {
        moduleName: 'baz/foo-bar',
      });
    }
  }
);
