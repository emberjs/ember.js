import { getTemplateLocals } from '..';

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
  `);

  assert.deepEqual(locals, [
    'Component',
    'ComponentWithYield',
    'globalValue',
    'globalHelper',
    'global-value',
    'some',
    'someOther',
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
