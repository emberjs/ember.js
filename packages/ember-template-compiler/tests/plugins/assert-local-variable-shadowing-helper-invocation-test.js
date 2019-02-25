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

      // Not invocations

      compile(
        `
        {{#let foo as |foo|}}
          {{concat foo}}
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        {{#let (concat foo) as |concat|}}
          {{input value=concat}}
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

      // Not invocations

      compile(
        `
        <Foo as |foo|>
          {{concat foo}}
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        <Foo foo={{concat foo}} as |concat|>
          {{input value=concat}}
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

      // Not invocations

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

      compile(
        `
        {{#let (foo foo) as |foo|}}
          <FooBar bar=(bar bar) as |bar|>
            {{#each (baz baz) as |baz|}}
              {{concat foo bar baz}}
            {{/each}}
          </FooBar>
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test block statements shadowing attribute sub-expression invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <div class={{concat (foo bar baz)}} />
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C32) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}{{/let}}
        <div class={{concat (foo)}} />
        <div class={{concat (foo bar baz)}} />`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not invocations

      compile(
        `
        {{#let foo as |foo|}}
          <div class={{concat foo}} />
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        {{#let (foo foo) as |foo|}}
          <div class={{concat foo}} />
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test element nodes shadowing attribute sub-expression invocations`]() {
      expectAssertion(() => {
        compile(
          `
          <Foo as |foo|>
            <div class={{concat (foo bar baz)}} />
          </Foo>`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C32) `);

      // Not shadowed

      compile(
        `
        <Foo as |foo|></Foo>
        <div class={{concat (foo)}} />
        <div class={{concat (foo bar baz)}} />`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not invocations

      compile(
        `
        <Foo as |foo|>
          <div class={{concat foo}} />
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        <Foo foo={{foo foo}} as |foo|>
          <div class={{concat foo}} />
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test deeply nested attribute sub-expression invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <FooBar as |bar|>
              {{#each items as |baz|}}
                <div class={{concat (foo bar baz)}} />
              {{/each}}
            </FooBar>
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L5:C36) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
            {{/each}}
            <div class={{concat (baz)}} />
            <div class={{concat (baz bat)}} />
          </FooBar>
          <div class={{concat (bar)}} />
          <div class={{concat (bar baz bat)}} />
        {{/let}}
        <div class={{concat (foo)}} />
        <div class={{concat (foo bar baz bat)}} />`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not invocations

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
              <div class={{concat foo}} />
            {{/each}}
          </FooBar>
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        {{#let (foo foo) as |foo|}}
          <FooBar bar=(bar bar) as |bar|>
            {{#each (baz baz) as |baz|}}
              <div class={{concat foo bar baz}} />
            {{/each}}
          </FooBar>
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test block statements shadowing attribute mustache invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <div class={{foo bar baz}} />
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C23) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}{{/let}}
        <div class={{foo}} />
        <div class={{foo bar baz}} />`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not invocations

      compile(
        `
        {{#let foo as |foo|}}
          <div class={{foo}} />
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        {{#let (concat foo) as |concat|}}
          <div class={{concat}} />
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test element nodes shadowing attribute mustache invocations`]() {
      expectAssertion(() => {
        compile(
          `
          <Foo as |foo|>
            <div class={{foo bar baz}} />
          </Foo>`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C23) `);

      // Not shadowed

      compile(
        `
        <Foo as |foo|></Foo>
        <div class={{foo}} />
        <div class={{foo bar baz}} />`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not invocations

      compile(
        `
        <Foo as |foo|>
          <div class={{foo}} />
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        <Foo foo={{concat foo}} as |concat|>
          <div class={{concat}} />
        </Foo>`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test deeply nested attribute mustache invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <FooBar as |bar|>
              {{#each items as |baz|}}
                <div class={{foo bar baz}} />
              {{/each}}
            </FooBar>
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` helper because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L5:C27) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
            {{/each}}
            <div class={{baz}} />
            <div class={{baz bat}} />
          </FooBar>
          <div class={{bar}} />
          <div class={{bar baz bat}} />
        {{/let}}
        <div class={{foo}} />
        <div class={{foo bar baz bat}} />`,
        { moduleName: 'baz/foo-bar' }
      );

      // Not invocations

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
              <div class={{foo}} />
            {{/each}}
          </FooBar>
        {{/let}}`,
        { moduleName: 'baz/foo-bar' }
      );

      compile(
        `
        {{#let (foo foo) as |foo|}}
          <FooBar bar=(bar bar) as |bar|>
            {{#each (baz baz) as |baz|}}
              <div foo={{foo}} bar={{bar}} baz={{baz}} />
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

    [`@test block statements shadowing modifier invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <div {{foo}} />
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` modifier because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C17) `);

      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <div {{foo bar baz}} />
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` modifier because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C17) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}{{/let}}
        <div {{foo}} />
        <div {{foo bar baz}} />`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test element nodes shadowing modifier invocations`]() {
      expectAssertion(() => {
        compile(
          `
          <Foo as |foo|>
            <div {{foo}} />
          </Foo>`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` modifier because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C17) `);

      expectAssertion(() => {
        compile(
          `
          <Foo as |foo|>
            <div {{foo bar baz}} />
          </Foo>`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` modifier because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L3:C17) `);

      // Not shadowed

      compile(
        `
        <Foo as |foo|></Foo>
        <div {{foo}} />
        <div {{foo bar baz}} />`,
        { moduleName: 'baz/foo-bar' }
      );
    }

    [`@test deeply nested modifier invocations`]() {
      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <FooBar as |bar|>
              {{#each items as |baz|}}
                <div {{foo}} />
              {{/each}}
            </FooBar>
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` modifier because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L5:C21) `);

      expectAssertion(() => {
        compile(
          `
          {{#let foo as |foo|}}
            <FooBar as |bar|>
              {{#each items as |baz|}}
                <div {{foo bar baz}} />
              {{/each}}
            </FooBar>
          {{/let}}`,
          { moduleName: 'baz/foo-bar' }
        );
      }, `Cannot invoke the \`foo\` modifier because it was shadowed by a local variable (i.e. a block param) with the same name. Please rename the local variable to resolve the conflict. ('baz/foo-bar' @ L5:C21) `);

      // Not shadowed

      compile(
        `
        {{#let foo as |foo|}}
          <FooBar as |bar|>
            {{#each items as |baz|}}
            {{/each}}
            <div {{baz}} />
            <div {{baz bat}} />
          </FooBar>
          <div {{bar}} />
          <div {{bar baz bat}} />
        {{/let}}
        <div {{foo}} />
        <div {{foo bar baz bat}} />`,
        { moduleName: 'baz/foo-bar' }
      );
    }
  }
);
