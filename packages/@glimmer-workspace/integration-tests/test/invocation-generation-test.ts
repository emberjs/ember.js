import { JitRenderDelegate, RenderTest } from '@glimmer-workspace/integration-tests';

import { module } from './support';

let renderTests: RenderTest;
module(
  'Render Tests: buildComponent',
  {
    beforeEach() {
      renderTests = new RenderTest(new JitRenderDelegate());
    },
  },
  ({ test }) => {
    test('Can build basic glimmer invocation', (assert) => {
      renderTests['testType'] = 'Glimmer';
      let invocation = renderTests.buildComponent({
        layout: 'Hello',
      });

      assert.strictEqual(invocation, '<TestComponent />');
    });

    test('Can build glimmer invocation with template', (assert) => {
      renderTests['testType'] = 'Glimmer';
      let invocation = renderTests.buildComponent({
        layout: 'Hello {{yield}}',
        template: 'World',
      });

      assert.strictEqual(invocation, '<TestComponent>World</TestComponent>');
    });

    test('Can build glimmer invocation with args', (assert) => {
      renderTests['testType'] = 'Glimmer';
      let invocation = renderTests.buildComponent({
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null, literal: "'literal'" },
      });

      assert.strictEqual(
        invocation,
        "<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}} @literal='literal'>World</TestComponent>"
      );
    });

    test('Can build glimmer invocation with attributes', (assert) => {
      renderTests['testType'] = 'Glimmer';
      let invocation = renderTests.buildComponent({
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null },
        attributes: { 'data-foo': 'bar', id: 'wat' },
      });

      assert.strictEqual(
        invocation,
        '<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}} data-foo=bar id=wat>World</TestComponent>'
      );
    });

    test('Can build glimmer invocation with custom tag name', (assert) => {
      renderTests['testType'] = 'Glimmer';
      let invocation = renderTests.buildComponent({
        name: 'LolWat',
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null },
        attributes: { 'data-foo': '"bar"', id: '"wat"' },
      });

      assert.strictEqual(
        invocation,
        `<LolWat @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat">World</LolWat>`
      );
    });

    test('Can build glimmer invocation with block params', (assert) => {
      renderTests['testType'] = 'Glimmer';
      let invocation = renderTests.buildComponent({
        name: 'Lol',
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null },
        attributes: { 'data-foo': '"bar"', id: '"wat"' },
        blockParams: ['a b c'],
      });

      assert.strictEqual(
        invocation,
        `<Lol @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat" as |a b c|>World</Lol>`
      );
    });

    test('Can build glimmer invocation with else', (assert) => {
      renderTests['testType'] = 'Glimmer';
      let invocation = renderTests.buildComponent({
        name: 'Lol',
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar' },
        blockParams: ['a b c'],
        else: 'ELSE',
      });

      assert.strictEqual(
        invocation,
        `<Lol @foo={{bar}}><:default as |a b c|>World</:default><:else>ELSE</:else></Lol>`
      );
    });

    test('Can build basic component invocation', (assert) => {
      renderTests['testType'] = 'TemplateOnly';
      let invocation = renderTests.buildComponent({
        layout: 'Hello',
      });

      assert.strictEqual(invocation, '<TestComponent />');
    });

    test('Can build basic component invocation with template', (assert) => {
      renderTests['testType'] = 'TemplateOnly';
      let invocation = renderTests.buildComponent({
        layout: 'Hello {{yield}}',
        template: 'World',
      });

      assert.strictEqual(invocation, '<TestComponent>World</TestComponent>');
    });

    test('Can build basic component invocation with args', (assert) => {
      renderTests['testType'] = 'TemplateOnly';
      let invocation = renderTests.buildComponent({
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null },
      });

      assert.strictEqual(
        invocation,
        '<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}}>World</TestComponent>'
      );
    });

    test('Can build basic component invocation with attributes', (assert) => {
      renderTests['testType'] = 'TemplateOnly';
      let invocation = renderTests.buildComponent({
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null },
        attributes: { 'data-foo': 'bar', id: 'wat' },
      });

      assert.strictEqual(
        invocation,
        '<TestComponent @foo={{bar}} @baz={{1}} @bar={{null}} data-foo=bar id=wat>World</TestComponent>'
      );
    });

    test('Can build basic component invocation with custom tag name', (assert) => {
      renderTests['testType'] = 'TemplateOnly';
      let invocation = renderTests.buildComponent({
        name: 'Lol',
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null },
        attributes: { 'data-foo': '"bar"', id: '"wat"' },
      });

      assert.strictEqual(
        invocation,
        `<Lol @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat">World</Lol>`
      );
    });

    test('Can build basic component invocation with block params', (assert) => {
      renderTests['testType'] = 'TemplateOnly';
      let invocation = renderTests.buildComponent({
        name: 'Lol',
        layout: 'Hello {{yield}}',
        template: 'World',
        args: { foo: 'bar', baz: 1, bar: null },
        attributes: { 'data-foo': '"bar"', id: '"wat"' },
        blockParams: ['a b c'],
      });

      assert.strictEqual(
        invocation,
        `<Lol @foo={{bar}} @baz={{1}} @bar={{null}} data-foo="bar" id="wat" as |a b c|>World</Lol>`
      );
    });
  }
);
