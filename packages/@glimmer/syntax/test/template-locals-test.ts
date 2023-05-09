import { getTemplateLocals } from '@glimmer/syntax';

QUnit.module('[glimmer-syntax] getTemplateLocals');

QUnit.test('it works', function (assert) {
  let locals = getTemplateLocals(`
    <Component/>

    <ComponentWithYield>
      <:main></:main>
    </ComponentWithYield>

    {{#if globalValue}}
      {{globalHelper 123}}
    {{/if}}

    {{#if this.localValue}}
      {{this.localHelper 123}}
    {{/if}}

    {{global-value}}

    {{component this.myComponent}}

    {{some.value.with.path}}
    <someOther.value.with.path />

    {{@arg}}
    <@argComponent />

    {{#this.dynamicBlockComponent}}
    {{/this.dynamicBlockComponent}}

    <button></button>

    <this.dynamicAngleComponent>
    </this.dynamicAngleComponent>

    <ComponentYieldingContextual as |hash|>
      <InsideHash />
      <hash.some as |some|>
        {{inside-another-hash}}
        <some.other/>
        {{some.value}}
      </hash.some>
    </ComponentYieldingContextual>
  `);

  assert.deepEqual(locals, [
    'Component',
    'ComponentWithYield',
    'globalValue',
    'globalHelper',
    'global-value',
    'some',
    'someOther',
    'ComponentYieldingContextual',
    'InsideHash',
    'inside-another-hash',
  ]);
});

QUnit.test('it does not include locals', function (assert) {
  let locals = getTemplateLocals(
    `
      <SomeComponent as |button|>
        <button></button>
        {{button}}
      </SomeComponent>
    `,
    {
      includeHtmlElements: true,
    }
  );

  assert.deepEqual(locals, ['SomeComponent']);
});

QUnit.test('it excludes object locals', function (assert) {
  let locals = getTemplateLocals(
    `
      <SomeComponent as |b|>
        <b.button />
      </SomeComponent>
    `
  );

  assert.deepEqual(locals, ['SomeComponent']);
});

QUnit.test('it excludes object locals from nested blocks', function (assert) {
  let locals = getTemplateLocals(
    `
      <SomeComponent as |some|>
        <some.foo as |foo|>
          <foo.bar as |bar|>
            <bar.baz />
          </foo.bar>
        </some.foo>
      </SomeComponent>
    `
  );

  assert.deepEqual(locals, ['SomeComponent']);
});

QUnit.test('it can include keywords', function (assert) {
  let locals = getTemplateLocals(
    `
      <Component/>

      <ComponentWithYield>
        <:main></:main>
      </ComponentWithYield>

      {{#if globalValue}}
        {{globalHelper 123}}
      {{/if}}

      {{#if this.localValue}}
        {{this.localHelper 123}}
      {{/if}}

      {{global-value}}

      {{component this.myComponent}}

      {{some.value.with.path}}
      <someOther.value.with.path />

      {{@arg}}
      <@argComponent />

      {{#this.dynamicBlockComponent}}
      {{/this.dynamicBlockComponent}}

      <this.dynamicAngleComponent>
      </this.dynamicAngleComponent>
    `,
    {
      includeKeywords: true,
    }
  );

  assert.deepEqual(locals, [
    'Component',
    'ComponentWithYield',
    'if',
    'globalValue',
    'globalHelper',
    'global-value',
    'component',
    'some',
    'someOther',
  ]);
});

QUnit.test('it can include html elements', function (assert) {
  let locals = getTemplateLocals(
    `
      <button></button>
    `,
    {
      includeHtmlElements: true,
    }
  );

  assert.deepEqual(locals, ['button']);
});
