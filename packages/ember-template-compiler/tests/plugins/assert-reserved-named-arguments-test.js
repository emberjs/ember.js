import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert-reserved-named-arguments',
  class extends AbstractTestCase {
    [`@test '@arguments' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@arguments}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@arguments' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @arguments}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@arguments' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @arguments "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@arguments' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@args' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@args}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@args' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @args}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@args' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @args "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@args' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@block' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@block}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@block' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @block}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@block' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @block "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@block' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@else' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@else}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@else' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @else}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@else' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @else "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@else' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    // anything else that doesn't start with a lower case letter
    [`@test '@Arguments' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@Arguments}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Arguments' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @Arguments}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Arguments' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @Arguments "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Arguments' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@Args' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@Args}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Args' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @Args}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Args' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @Args "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Args' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@FOO' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@FOO}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@FOO' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @FOO}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@FOO' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @FOO "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@FOO' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@Foo' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@Foo}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Foo' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @Foo}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Foo' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @Foo "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@Foo' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@.' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@.}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@.' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @.}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@.' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @. "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@.' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@_' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@_}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@_' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @_}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@_' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @_ "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@_' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@-' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@-}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@-' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @-}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@-' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @- "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@-' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@$' is reserved`]() {
      expectAssertion(() => {
        compile(`{{@$}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@$' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @$}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@$' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @$ "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@$' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@__ARGS__' is reserved`]() {
      expectAssertion(() => {
        compile(`<Foo @__ARGS__="bar" />`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@__ARGS__' is reserved. ('baz/foo-bar' @ L1:C5) `);

      expectAssertion(() => {
        compile(`{{foo __ARGS__="bar"}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'__ARGS__' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{#let (component "foo" __ARGS__="bar") as |c|}}{{c}}{{/let}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'__ARGS__' is reserved. ('baz/foo-bar' @ L1:C24) `);

      expectAssertion(() => {
        compile(`{{@__ARGS__}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@__ARGS__' is reserved. ('baz/foo-bar' @ L1:C2) `);

      expectAssertion(() => {
        compile(`{{#if @__ARGS__}}Yup{{/if}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@__ARGS__' is reserved. ('baz/foo-bar' @ L1:C6) `);

      expectAssertion(() => {
        compile(`{{input type=(if @__ARGS__ "bar" "baz")}}`, {
          moduleName: 'baz/foo-bar',
        });
      }, `'@__ARGS__' is reserved. ('baz/foo-bar' @ L1:C17) `);
    }

    [`@test '@' is de facto reserved (parse error)`](assert) {
      assert.throws(() => {
        compile('{{@}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{#if @}}Yup{{/if}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{input type=(if @ "bar" "baz")}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);
    }

    [`@test '@0' is de facto reserved (parse error)`](assert) {
      assert.throws(() => {
        compile('{{@0}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{#if @0}}Yup{{/if}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{input type=(if @0 "bar" "baz")}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);
    }

    [`@test '@1' is de facto reserved (parse error)`](assert) {
      assert.throws(() => {
        compile('{{@1}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{#if @1}}Yup{{/if}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{input type=(if @1 "bar" "baz")}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);
    }

    [`@test '@2' is de facto reserved (parse error)`](assert) {
      assert.throws(() => {
        compile('{{@2}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{#if @2}}Yup{{/if}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{input type=(if @2 "bar" "baz")}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);
    }

    [`@test '@@' is de facto reserved (parse error)`](assert) {
      assert.throws(() => {
        compile('{{@@}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{#if @@}}Yup{{/if}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{input type=(if @@ "bar" "baz")}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);
    }

    [`@test '@=' is de facto reserved (parse error)`](assert) {
      assert.throws(() => {
        compile('{{@=}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{#if @=}}Yup{{/if}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{input type=(if @= "bar" "baz")}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);
    }

    [`@test '@!' is de facto reserved (parse error)`](assert) {
      assert.throws(() => {
        compile('{{@!}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{#if @!}}Yup{{/if}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);

      assert.throws(() => {
        compile('{{input type=(if @! "bar" "baz")}}', {
          moduleName: 'baz/foo-bar',
        });
      }, /Expecting 'ID'/);
    }
  }
);
