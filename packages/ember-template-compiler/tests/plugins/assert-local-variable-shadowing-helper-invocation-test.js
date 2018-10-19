import { compile } from '../../index';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-template-compiler: assert-local-variable-shadowing-helper-invocation',
  class extends AbstractTestCase {
    [`@test block statements shadowing sub-expression invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            {{concat (foo)}}
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C21) `);

      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            {{concat (foo bar baz)}}
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C21) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}{{/let}}
        {{concat (foo)}}
        {{concat (foo bar baz)}}`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not an invocation

      compile(
        `
        {{#let foo as |foo|}}
          {{concat foo}}
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test element nodes shadowing sub-expression invocations`]() {
      expectAssertion(() => {
        compile(
          `
          <Foo as |foo|>
            {{concat (foo)}}
          </Foo>`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C21) `);

      expectAssertion(() => {
        compile(
          `
          <Foo as |foo|>
            {{concat (foo bar baz)}}
          </Foo>`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C21) `);

      // Not shadowed

      compile(
        `
        <Foo as |foo|></Foo>
        {{concat (foo)}}
        {{concat (foo bar baz)}}`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not an invocation

      compile(
        `
        <Foo as |foo|>
          {{concat foo}}
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test deeply nested sub-expression invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <FooBar as |bar|>
              {{#each items as |baz|}}
                {{concat (foo)}}
              {{/each}}
            </FooBar>
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L5:C25) `);

      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <FooBar as |bar|>
              {{#each items as |baz|}}
                {{concat (foo bar baz)}}
              {{/each}}
            </FooBar>
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L5:C25) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
            {{/each}}
            {{concat (baz)}}
            {{concat (baz bat)}}
          </FooBar>
          {{concat (bar)}}
          {{concat (bar baz bat)}}
        {{/let}}
        {{concat (foo)}}
        {{concat (foo bar baz bat)}}`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not an invocation

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
              {{concat foo}}
            {{/each}}
          </FooBar>
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test block statements shadowing mustache invocations`](assert) {
      // These are fine, because they should already be considered contextual
      // component invocations, not helper invocations
      assert.expect(0);

      compile(
        `
        {{#let foo as |foo|}}
          {{foo}}
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        {{#let foo as |foo|}}
          {{foo bar baz}}
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test element nodes shadowing mustache invocations`](assert) {
      // These are fine, because they should already be considered contextual
      // component invocations, not helper invocations
      assert.expect(0);

      compile(
        `
        <Foo as |foo|>
          {{foo}}
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        <Foo as |foo|>
          {{foo bar baz}}
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test deeply nested mustache invocations`](assert) {
      // These are fine, because they should already be considered contextual
      // component invocations, not helper invocations
      assert.expect(0);

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
              {{foo}}
            {{/each}}
          </FooBar>
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
              {{foo bar baz}}
            {{/each}}
          </FooBar>
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }
  }
);
