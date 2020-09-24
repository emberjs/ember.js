import { Option, HandleResult, ErrHandle, EncoderError } from '@glimmer/interfaces';
import { createConstRef, createPrimitiveRef, createComputeRef } from '@glimmer/reference';
import {
  RenderTest,
  test,
  jitSuite,
  JitRenderDelegate,
  EmberishGlimmerComponent,
  tracked,
} from '..';
import { SafeString, registerDestructor } from '@glimmer/runtime';
import {
  assertNodeTagName,
  getElementByClassName,
  getElementsByTagName,
  stripTight,
  trimLines,
} from '..';
import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import { assert } from './support';
import { expect } from '@glimmer/util';
import { createTag, consumeTag, dirtyTag } from '@glimmer/validator';

function makeSafeString(value: string): SafeString {
  return new SafeStringImpl(value);
}

class SafeStringImpl implements SafeString {
  constructor(private string: string) {}
  toHTML() {
    return this.string;
  }
  toString() {
    return this.string;
  }
}

class UpdatingTest extends RenderTest {
  static suiteName = 'Updating';

  delegate!: JitRenderDelegate;

  @test
  'updating a single curly'() {
    this.render('<div><p>{{this.value}}</p></div>', { value: 'hello world' });
    this.assertHTML('<div><p>hello world</p></div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: 'goodbye world' });
    this.assertHTML('<div><p>goodbye world</p></div>', 'After updating and dirtying');
    this.assertStableNodes();
  }

  @test
  'updating a single curly with siblings'() {
    this.render('<div>hello {{this.value}}world</div>', { value: 'brave new ' });
    this.assertHTML('<div>hello brave new world</div>');
    this.assertStableRerender();

    this.rerender({ value: 'another ' });
    this.assertHTML('<div>hello another world</div>');
    this.assertStableNodes();

    this.rerender({ value: 'brave new ' });
    this.assertHTML('<div>hello brave new world</div>');
    this.assertStableNodes();
  }

  @test
  'null and undefined produces empty text nodes'() {
    this.render('<div><p>{{this.v1}}</p><p>{{this.v2}}</p></div>', {
      v1: null,
      v2: undefined,
    });
    this.assertHTML('<div><p></p><p></p></div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ v1: 'hello' });
    this.assertHTML('<div><p>hello</p><p></p></div>', 'After updating and dirtying');
    this.assertStableRerender();

    this.rerender({ v2: 'world' });
    this.assertHTML('<div><p>hello</p><p>world</p></div>', 'After updating and dirtying');
    this.assertStableRerender();

    this.rerender({ v1: null, v2: undefined });
    this.assertHTML('<div><p></p><p></p></div>', 'Initial render');
    this.assertStableRerender();
  }

  @test
  'weird paths'() {
    let state = {
      '': 'empty string',
      '1': '1',
      undefined: 'undefined',
      null: 'null',
      true: 'true',
      false: 'false',
      this: 'this',
      'foo.bar': 'foo.bar',
      nested: null as any | null,
    };

    state.nested = state;

    this.render(
      stripTight`
        <div>
          [{{[]}}]
          [{{[1]}}]
          [{{[undefined]}}]
          [{{[null]}}]
          [{{[true]}}]
          [{{[false]}}]
          [{{[this]}}]
          [{{[foo.bar]}}]

          [{{nested.[]}}]
          [{{nested.[1]}}]
          [{{nested.[undefined]}}]
          [{{nested.[null]}}]
          [{{nested.[true]}}]
          [{{nested.[false]}}]
          [{{nested.[this]}}]
          [{{nested.[foo.bar]}}]
        </div>
      `,
      state
    );

    this.assertHTML(stripTight`
      <div>
        [empty string]
        [1]
        [undefined]
        [null]
        [true]
        [false]
        [this]
        [foo.bar]

        [empty string]
        [1]
        [undefined]
        [null]
        [true]
        [false]
        [this]
        [foo.bar]
      </div>
    `);

    this.assertStableRerender();

    state[''] = 'EMPTY STRING';
    state['1'] = 'ONE';
    state['undefined'] = 'UNDEFINED';
    state['null'] = 'NULL';
    state['true'] = 'TRUE';
    state['false'] = 'FALSE';
    state['this'] = 'THIS';
    state['foo.bar'] = 'FOO.BAR';
    this.rerender(state);

    this.assertHTML(stripTight`
      <div>
        [EMPTY STRING]
        [ONE]
        [UNDEFINED]
        [NULL]
        [TRUE]
        [FALSE]
        [THIS]
        [FOO.BAR]

        [EMPTY STRING]
        [ONE]
        [UNDEFINED]
        [NULL]
        [TRUE]
        [FALSE]
        [THIS]
        [FOO.BAR]
      </div>
    `);

    state = {
      '': 'empty string',
      '1': '1',
      undefined: 'undefined',
      null: 'null',
      true: 'true',
      false: 'false',
      this: 'this',
      'foo.bar': 'foo.bar',
      nested: null,
    };
    state.nested = state;

    this.rerender(state);

    this.assertHTML(stripTight`
      <div>
        [empty string]
        [1]
        [undefined]
        [null]
        [true]
        [false]
        [this]
        [foo.bar]

        [empty string]
        [1]
        [undefined]
        [null]
        [true]
        [false]
        [this]
        [foo.bar]
      </div>
    `);
  }

  @test
  'updating a single trusting curly'() {
    this.render('<div>{{{this.value}}}</div>', { value: '<p>hello world</p>' });

    this.assertHTML(`<div><p>hello world</p></div>`, 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: '<span>goodbye world</span>' });

    this.assertHTML(`<div><span>goodbye world</span></div>`, 'Initial render');
    this.assertStableRerender();

    this.rerender({
      value: 'a <span>good man</span> is hard to <b>find</b>',
    });

    this.assertHTML(`<div>a <span>good man</span> is hard to <b>find</b></div>`, 'more complex');
    this.assertStableRerender();
  }

  @test
  'updating a single trusting curly with siblings'() {
    this.render('<div>hello {{{this.value}}}world</div>', {
      value: '<b>brave new </b>',
    });

    this.assertHTML('<div>hello <b>brave new </b>world</div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: 'big <b>wide</b> ' });
    this.assertHTML('<div>hello big <b>wide</b> world</div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: 'another ' });
    this.assertHTML('<div>hello another world</div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: '<b>brave new </b>' });
    this.assertHTML('<div>hello <b>brave new </b>world</div>', 'Initial render');
    this.assertStableRerender();
  }

  @test
  'updating a single trusting curly with previous sibling'() {
    this.render('<div>hello {{{this.value}}}</div>', {
      value: '<b>brave new </b>',
    });

    this.assertHTML('<div>hello <b>brave new </b></div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: 'another ' });
    this.assertHTML('<div>hello another </div>');
    this.assertStableRerender();

    this.rerender({ value: '<b>brave new </b>' });
    this.assertHTML('<div>hello <b>brave new </b></div>');
    this.assertStableNodes();
  }

  // This is to catch a regression about not caching lastValue correctly
  @test
  'Cycling between two values in a trusting curly'() {
    let a = '<p>A</p>';
    let b = '<p>B</p>';

    this.render('<div>{{{this.value}}}</div>', { value: a });

    this.assertHTML('<div><p>A</p></div>', 'Initial render');

    this.rerender({ value: b });
    this.assertHTML('<div><p>B</p></div>', 'Updating');

    // Change it back
    this.rerender({ value: a });
    this.assertHTML('<div><p>A</p></div>', 'Updating');

    // Change it back
    this.rerender({ value: b });
    this.assertHTML('<div><p>B</p></div>', 'Updating');
  }

  @test
  'updating a curly with a safe and unsafe string'() {
    interface SafeString {
      string: string;
      toHTML(): string;
      toString(): string;
    }

    let safeString = {
      string: '<p>hello world</p>',
      toHTML: function (this: SafeString) {
        return this.string;
      },
      toString: function (this: SafeString) {
        return this.string;
      },
    };
    let unsafeString = '<b>Big old world!</b>';

    this.render('<div>{{this.value}}</div>', {
      value: safeString,
    });

    this.assertHTML('<div><p>hello world</p></div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: unsafeString });

    this.assertHTML(
      '<div>&lt;b&gt;Big old world!&lt;/b&gt;</div>',
      'After replacing with unsafe string'
    );

    this.rerender({ value: safeString });
    this.assertHTML('<div><p>hello world</p></div>', 'Initial render');
    this.assertStableRerender();
  }

  @test
  'updating a triple curly with a safe and unsafe string'() {
    let safeString = makeSafeString('<p>hello world</p>');
    let unsafeString = '<b>Big old world!</b>';

    this.render('<div>{{{this.value}}}</div>', {
      value: safeString,
    });

    this.assertHTML('<div><p>hello world</p></div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({
      value: unsafeString,
    });

    this.assertHTML('<div><b>Big old world!</b></div>', 'Normal strings may contain HTML');

    this.rerender({
      value: safeString,
    });

    this.assertHTML('<div><p>hello world</p></div>', 'original input causes no problem');
  }

  @test
  'triple curlies with empty string initial value'() {
    this.render('<div>{{{this.value}}}</div>', {
      value: '',
    });

    this.assertHTML('<div><!----></div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({
      value: '<b>Bold and spicy</b>',
    });

    this.assertHTML('<div><b>Bold and spicy</b></div>', 'markup is updated');

    this.rerender({ value: '' });

    this.assertHTML('<div><!----></div>', 'back to empty string');
  }

  @test
  'double curlies with const SafeString'() {
    let rawString = '<b>bold</b> and spicy';

    this.registerInternalHelper('const-foobar', () => {
      return createConstRef(makeSafeString(rawString), 'safe-string');
    });

    this.render('<div>{{const-foobar}}</div>', {});
    this.assertHTML('<div><b>bold</b> and spicy</div>', 'initial render');
    this.assertStableRerender();
  }

  @test
  'double curlies with const Node'() {
    let rawString = '<b>bold</b> and spicy';

    this.registerInternalHelper('const-foobar', () => {
      return createConstRef(this.delegate.createTextNode(rawString), 'text-node');
    });

    this.render('<div>{{const-foobar}}</div>');
    this.assertHTML('<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', 'initial render');
    this.assertStableRerender();
  }

  @test
  'triple curlies with const SafeString'() {
    let rawString = '<b>bold</b> and spicy';

    this.registerInternalHelper('const-foobar', () => {
      return createConstRef(makeSafeString(rawString), 'safe-string');
    });

    this.render('<div>{{{const-foobar}}}</div>');
    this.assertHTML('<div><b>bold</b> and spicy</div>', 'initial render');
    this.assertStableRerender();
  }

  @test
  'triple curlies with const Node'() {
    let rawString = '<b>bold</b> and spicy';

    this.registerInternalHelper('const-foobar', () => {
      return createConstRef(this.delegate.createTextNode(rawString), 'text-node');
    });

    this.render('<div>{{{const-foobar}}}</div>');
    this.assertHTML('<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', 'initial render');
    this.assertStableRerender();
  }

  @test
  'helpers can add destroyables'() {
    let destroyable = {
      count: 0,
    };

    registerDestructor(destroyable, () => {
      destroyable.count++;
    });

    this.registerInternalHelper('destroy-me', (_args, vm) => {
      vm.associateDestroyable(destroyable);
      return createPrimitiveRef('destroy me!');
    });

    this.render('<div>{{destroy-me}}</div>', {});

    this.assertHTML('<div>destroy me!</div>', 'initial render');
    assert.strictEqual(destroyable.count, 0, 'not destroyed');

    this.rerender();

    this.assertHTML('<div>destroy me!</div>', 'no change');
    assert.strictEqual(destroyable.count, 0, 'not destroyed');

    this.destroy();

    assert.strictEqual(destroyable.count, 1, 'is destroyed');
  }

  //////////

  testStatefulHelper<T, U>(
    assert: typeof QUnit.assert,
    arg1: {
      template: string;
      truthyValue: T;
      falsyValue: U;
      element?: SimpleElement;
    }
  ) {
    let { template, truthyValue, falsyValue, element } = arg1;
    let didCreate = 0;
    let didDestroy = 0;
    let tag = createTag();
    let currentValue: T | U = truthyValue;

    this.registerInternalHelper('stateful-foo', (_args, vm) => {
      didCreate++;

      vm.associateDestroyable({
        destroy() {
          didDestroy++;
        },
      });

      return createComputeRef(() => {
        consumeTag(tag);
        return currentValue;
      });
    });

    assert.strictEqual(didCreate, 0, 'didCreate: before render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: before render');

    this.render(template, {});

    this.assertHTML('Yes', element, 'initial render');
    assert.strictEqual(didCreate, 1, 'didCreate: after initial render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after initial render');

    this.rerender();

    this.assertHTML('Yes', element, 'after no-op re-render');
    assert.strictEqual(didCreate, 1, 'didCreate: after no-op re-render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after no-op re-render');

    currentValue = falsyValue;
    dirtyTag(tag);
    this.rerender();

    this.assertHTML(element ? '' : '<!---->', element, 'after switching to falsy');
    assert.strictEqual(didCreate, 1, 'didCreate: after switching to falsy');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after switching to falsy');

    currentValue = truthyValue;
    dirtyTag(tag);
    this.rerender();

    this.assertHTML('Yes', element, 'after reset');
    assert.strictEqual(didCreate, 1, 'didCreate: after reset');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after reset');
  }

  @test
  'helpers passed as arguments to {{#if}} are not torn down when switching between blocks'() {
    let options = {
      template: '{{#if (stateful-foo)}}Yes{{/if}}',
      truthyValue: true,
      falsyValue: false,
    };

    this.testStatefulHelper(assert, options);
  }

  @test
  'helpers passed as arguments to {{#unless}} are not torn down when switching between blocks'() {
    let options = {
      template: '{{#unless (stateful-foo)}}Yes{{/unless}}',
      truthyValue: false,
      falsyValue: true,
    };

    this.testStatefulHelper(assert, options);
  }

  @test
  'helpers passed as arguments to {{#with}} are not torn down when switching between blocks'() {
    let options = {
      template: '{{#with (stateful-foo) as |unused|}}Yes{{/with}}',
      truthyValue: {},
      falsyValue: null,
    };

    this.testStatefulHelper(assert, options);
  }

  @test
  'helpers passed as arguments to {{#each}} are not torn down when switching between blocks'() {
    let options = {
      template: '{{#each (stateful-foo) key="@index" as |unused|}}Yes{{/each}}',
      truthyValue: [1],
      falsyValue: null,
    };

    this.testStatefulHelper(assert, options);
  }

  @test
  'helpers passed as arguments to {{partial}} are not torn down when switching between blocks'() {
    this.registerPartial('yasss', 'Yes');
    this.registerPartial('noooo', '');

    let options = {
      template: '{{partial (stateful-foo)}}',
      truthyValue: 'yasss',
      falsyValue: 'noooo',
    };

    this.testStatefulHelper(assert, options);
  }

  @test
  'helpers passed as arguments to {{component}} are not torn down when switching between blocks'() {
    this.registerComponent('Glimmer', 'XYasss', 'Yes');

    let options = {
      template: '{{component (stateful-foo)}}',
      truthyValue: 'XYasss',
      falsyValue: null,
    };

    this.testStatefulHelper(assert, options);
  }

  @test
  'helpers passed as arguments to {{#in-element}} are not torn down when switching between blocks'() {
    let externalElement = this.delegate.createElement('div');

    let options = {
      template: '{{#in-element (stateful-foo)}}Yes{{/in-element}}',
      truthyValue: externalElement,
      falsyValue: null,
      element: externalElement,
    };

    this.testStatefulHelper(assert, options);
  }

  @test
  'updating a curly with this'() {
    this.render('<div><p>{{this.value}}</p></div>', { value: 'hello world' });

    this.assertHTML('<div><p>hello world</p></div>');
    this.assertStableRerender();

    this.rerender({ value: 'goodbye world' });

    this.assertHTML('<div><p>goodbye world</p></div>');
  }

  @test
  'a simple implementation of a dirtying rerender'() {
    this.render(
      '<div>{{#if this.condition}}<p>{{this.value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>',
      {
        condition: true,
        value: 'hello world',
      }
    );

    this.assertHTML('<div><p>hello world</p></div>', 'Initial render');
    this.assertStableRerender();

    // Even though the #if was stable, a dirty child node is updated
    this.rerender({ value: 'goodbye world' });
    this.assertStableNodes();

    this.rerender({ condition: false });
    this.assertHTML('<div><p>Nothing</p></div>', 'And then dirtying');
    this.assertStableNodes();
  }

  @test
  'The if helper should consider an empty array truthy'() {
    this.render(
      '<div>{{#if this.condition}}<p>{{this.value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>',
      { condition: [], value: 'hello world' }
    );

    this.assertHTML('<div><p>hello world</p></div>');

    this.rerender({ condition: ['thing'] });
    this.assertHTML('<div><p>hello world</p></div>', 'after updating array');

    this.rerender({ condition: [] });
    this.assertHTML('<div><p>hello world</p></div>', 'back to empty array');
  }

  @test
  'a simple implementation of a dirtying rerender without else'() {
    this.render('<div>{{#if this.condition}}<p>{{this.value}}</p>{{/if}}</div>', {
      condition: true,
      value: 'hello world',
    });

    this.assertHTML('<div><p>hello world</p></div>', 'Initial render');

    this.rerender({ condition: false });
    this.assertHTML('<div><!----></div>', 'If the condition is false, the morph becomes empty');

    this.rerender({ condition: true });
    this.assertHTML(
      '<div><p>hello world</p></div>',
      'If the condition is true, the morph repopulates'
    );
  }

  @test
  'The unless helper without else'() {
    this.render('<div>{{#unless this.condition}}<p>{{this.value}}</p>{{/unless}}</div>', {
      condition: true,
      value: 'hello world',
    });

    this.assertHTML('<div><!----></div>', 'Initial render');

    this.rerender({ condition: false });
    this.assertHTML(
      '<div><p>hello world</p></div>',
      'If the condition is false, the morph becomes populated'
    );

    this.rerender({ condition: true });
    this.assertHTML('<div><!----></div>', 'If the condition is true, the morph unpopulated');
  }

  @test
  'The unless helper with else'() {
    this.render(
      '<div>{{#unless this.condition}}<p>{{this.value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>',
      { condition: true, value: 'hello world' }
    );

    this.assertHTML('<div><p>Nothing</p></div>', 'Initial render');

    this.rerender({ condition: false });
    this.assertHTML(
      '<div><p>hello world</p></div>',
      'If the condition is false, the default renders'
    );

    this.rerender({ condition: true });
    this.assertHTML('<div><p>Nothing</p></div>', 'If the condition is true, the else renders');
  }

  @test
  'The unless helper should consider an empty array truthy'() {
    this.render(
      '<div>{{#unless this.condition}}<p>{{this.value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>',
      { condition: [], value: 'hello world' }
    );

    this.assertHTML('<div><p>Nothing</p></div>', 'Initial render');

    this.rerender({ condition: [1] });
    this.assertHTML('<div><p>Nothing</p></div>', 'If the condition is true, the else renders');

    this.rerender({ condition: [] });
    this.assertHTML('<div><p>Nothing</p></div>', 'If the condition is false, the else renders');
  }

  @test
  'a conditional that is false on the first run'() {
    this.render('<div>{{#if this.condition}}<p>{{this.value}}</p>{{/if}}</div>', {
      condition: false,
      value: 'hello world',
    });

    this.assertHTML('<div><!----></div>', 'Initial render');

    this.rerender({ condition: true });
    this.assertHTML(
      '<div><p>hello world</p></div>',
      'If the condition is true, the morph populates'
    );

    this.rerender({ condition: false });
    this.assertHTML('<div><!----></div>', 'If the condition is false, the morph is empty');
  }

  @test
  'block arguments'() {
    class Name {
      constructor(first: string, last: string) {
        this.first = first;
        this.last = last;
      }

      @tracked first = 'Godfrey';
      @tracked last = 'Godfrey';
    }

    const person = { name: new Name('Godfrey', 'Chan') };

    this.render('<div>{{#with person.name.first as |f|}}{{f}}{{/with}}</div>', {
      person,
    });

    this.assertHTML('<div>Godfrey</div>', 'Initial render');

    person.name.first = 'Godfreak';
    this.rerender();

    this.assertHTML('<div>Godfreak</div>', 'After updating');

    this.rerender({ person: { name: { first: 'Godfrey', last: 'Chan' } } });

    this.assertHTML('<div>Godfrey</div>', 'After reset');
  }

  @test
  'missing helper'() {
    this.registerHelper('hello', () => 'hello');

    let result = this.delegate.compileTemplate('{{helo world}}');

    assertHandleError(assert, result, {
      problem: 'Unexpected Helper helo',
      span: { start: 0, end: 0 },
    });
  }

  @test
  'block arguments should have higher precedence than helpers'() {
    this.registerHelper('foo', () => 'foo-helper');
    this.registerHelper('bar', () => 'bar-helper');
    this.registerHelper('echo', (args) => args[0]);

    let template = trimLines`
      <div>
        foo: "{{foo}}";
        bar: "{{bar}}";
        value: "{{this.value}}";
        echo foo: "{{echo foo}}";
        echo bar: "{{echo bar}}";
        echo value: "{{echo value}}";

        -----

        {{#with value as |foo|}}
          foo: "{{foo}}";
          bar: "{{bar}}";
          value: "{{this.value}}";
          echo foo: "{{echo foo}}";
          echo bar: "{{echo bar}}";
          echo value: "{{echo value}}";

          -----

          {{#with foo as |bar|}}
            foo: "{{foo}}";
            bar: "{{bar}}";
            value: "{{this.value}}";
            echo foo: "{{echo foo}}";
            echo bar: "{{echo bar}}";
            echo value: "{{echo value}}";
          {{/with}}
        {{/with}}

        -----

        {{#with value as |bar|}}
          foo: "{{foo}}";
          bar: "{{bar}}";
          value: "{{this.value}}";
          echo foo: "{{echo foo}}";
          echo bar: "{{echo bar}}";
          echo value: "{{echo value}}";
        {{/with}}
      </div>
    `;

    this.render(template, { foo: 'foo-value', bar: 'bar-value', value: 'value-value' });

    this.assertHTML(
      trimLines`
      <div>
        foo: "foo-helper";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "value-value";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "value-value";
        echo value: "value-value";

        -----

        foo: "foo-helper";
        bar: "value-value";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "value-value";
        echo value: "value-value";
      </div>`,
      'Initial render'
    );

    this.assertStableRerender();

    this.rerender({ value: 'NEW-VALUE' });

    this.assertHTML(
      trimLines`
      <div>
        foo: "foo-helper";
        bar: "bar-helper";
        value: "NEW-VALUE";
        echo foo: "foo-value";
        echo bar: "bar-value";
        echo value: "NEW-VALUE";

        -----

        foo: "NEW-VALUE";
        bar: "bar-helper";
        value: "NEW-VALUE";
        echo foo: "NEW-VALUE";
        echo bar: "bar-value";
        echo value: "NEW-VALUE";

        -----

        foo: "NEW-VALUE";
        bar: "NEW-VALUE";
        value: "NEW-VALUE";
        echo foo: "NEW-VALUE";
        echo bar: "NEW-VALUE";
        echo value: "NEW-VALUE";

        -----

        foo: "foo-helper";
        bar: "NEW-VALUE";
        value: "NEW-VALUE";
        echo foo: "foo-value";
        echo bar: "NEW-VALUE";
        echo value: "NEW-VALUE";
      </div>`,
      'After update'
    );

    this.rerender({ foo: 'foo-value', bar: 'bar-value', value: 'value-value' });

    this.assertHTML(
      trimLines`
      <div>
        foo: "foo-helper";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "value-value";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "value-value";
        echo value: "value-value";

        -----

        foo: "foo-helper";
        bar: "value-value";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "value-value";
        echo value: "value-value";
      </div>`,
      'After reset'
    );
  }

  @test
  'block arguments (ensure balanced push/pop)'() {
    let person = { name: { first: 'Godfrey', last: 'Chan' } };
    this.render('<div>{{#with person.name.first as |f|}}{{f}}{{/with}}{{f}}</div>', {
      person,
      f: 'Outer',
    });

    this.assertHTML('<div>GodfreyOuter</div>', 'Initial render');

    person.name.first = 'Godfreak';
    this.rerender({ person });

    this.assertHTML('<div>GodfreakOuter</div>', 'After updating');
  }

  @test
  'block arguments cannot be accessed through {{this}}'() {
    this.registerHelper('noop', (params) => params[0]);

    this.render(
      stripTight`
        <div>
          [{{#with person as |name|}}{{this.name}}{{/with}}]
          [{{#with person as |name|}}{{#with this.name as |test|}}{{test}}{{/with}}{{/with}}]
          [{{#with person as |name|}}{{#with (noop this.name) as |test|}}{{test}}{{/with}}{{/with}}]
        </div>
      `,
      { person: 'Yehuda', name: 'Godfrey' }
    );

    this.assertHTML('<div>[Godfrey][Godfrey][Godfrey]</div>', 'Initial render');
    this.assertStableRerender();

    this.rerender({ name: 'Godfreak' });
    this.assertHTML('<div>[Godfreak][Godfreak][Godfreak]</div>', 'After update');

    this.rerender({ name: 'Godfrey' });
    this.assertHTML('<div>[Godfrey][Godfrey][Godfrey]</div>', 'After reset');
  }

  @test
  'The with helper should consider an empty array truthy'() {
    this.render('<div>{{#with condition as |c|}}{{c.length}}{{/with}}</div>', {
      condition: [],
    });

    this.assertHTML('<div>0</div>', 'Initial render');

    this.rerender({
      condition: [1],
    });

    this.assertHTML('<div>1</div>', 'After updating');
  }

  @test
  'block helpers whose template has a morph at the edge'() {
    this.render('{{#identity}}{{this.value}}{{/identity}}', { value: 'hello world' });
    this.assertHTML('hello world');

    let firstNode = this.element.firstChild;
    assert.notStrictEqual(firstNode, null, 'first node should have rendered');
    if (firstNode !== null) {
      assert.equal(firstNode.nodeType, 3, 'the first node of the helper should be a text node');
      assert.equal(firstNode.nodeValue, 'hello world', 'its content should be hello world');

      assert.strictEqual(firstNode.nextSibling, null, 'there should only be one nodes');
    }
  }

  @test
  "clean content doesn't get blown away"() {
    this.render('<div>{{this.value}}</div>', { value: 'hello' });

    let firstNode: Option<SimpleNode> = this.element.firstChild;
    let textNode: Node | null;
    if (assertNodeTagName(firstNode, 'div')) {
      textNode = firstNode.firstChild;
      assert.equal(textNode && textNode.nodeValue, 'hello');
    }

    this.rerender({ value: 'goodbye' });

    this.assertHTML('<div>goodbye</div>');

    this.rerender({ value: 'hello' });

    firstNode = this.element.firstChild;
    if (assertNodeTagName(firstNode, 'div')) {
      textNode = firstNode.firstChild;
      assert.equal(textNode && textNode.nodeValue, 'hello');
    }
  }

  @test
  'helper calls follow the normal dirtying rules'() {
    this.registerHelper('capitalize', function (params) {
      let value = params[0];
      if (value !== null && value !== undefined && typeof value === 'string') {
        return value.toUpperCase();
      }
      return;
    });

    this.render('<div>{{capitalize value}}</div>', { value: 'hello' });
    this.assertHTML('<div>HELLO</div>');

    this.rerender({
      value: 'goodbye',
    });

    this.assertHTML('<div>GOODBYE</div>');
    this.assertStableRerender();

    // Checks normalized value, not raw value
    this.rerender({
      value: 'GoOdByE',
    });
    this.assertHTML('<div>GOODBYE</div>');
    this.assertStableNodes();
  }

  @test
  'class attribute follow the normal dirtying rules'() {
    this.render("<div class='{{this.value}}'>hello</div>", { value: 'world' });

    this.assertHTML("<div class='world'>hello</div>", 'Initial render');

    this.rerender({
      value: 'universe',
    });

    this.assertHTML("<div class='universe'>hello</div>", 'Revalidating without dirtying');
    this.assertStableRerender();

    this.rerender({
      value: 'world',
    });

    this.assertHTML("<div class='world'>hello</div>", 'Revalidating after dirtying');
  }

  @test
  'class attribute w/ concat follow the normal dirtying rules'() {
    this.render("<div class='hello {{this.value}}'>hello</div>", { value: 'world' });

    this.assertHTML("<div class='hello world'>hello</div>");
    this.assertStableRerender();

    this.rerender({ value: 'universe' });
    this.assertHTML("<div class='hello universe'>hello</div>");

    this.rerender({ value: null });
    this.assertHTML("<div class='hello '>hello</div>");

    this.rerender({ value: 'world' });
    this.assertHTML("<div class='hello world'>hello</div>");
  }

  @test
  'class attribute is removed if the binding becomes null or undefined'() {
    this.render('<div class={{this.value}}>hello</div>', { value: 'foo' });

    this.assertHTML("<div class='foo'>hello</div>");
    this.assertStableRerender();

    this.rerender({ value: null });
    this.assertHTML('<div>hello</div>');

    this.rerender({ value: 0 });
    this.assertHTML("<div class='0'>hello</div>");

    this.rerender({ value: undefined });
    this.assertHTML('<div>hello</div>');

    this.rerender({ value: 'foo' });
    this.assertHTML("<div class='foo'>hello</div>");
  }

  @test
  'attribute nodes follow the normal dirtying rules'() {
    this.render("<div data-value='{{this.value}}'>hello</div>", { value: 'world' });
    this.assertHTML("<div data-value='world'>hello</div>", 'Initial render');

    this.rerender({ value: 'universe' });
    this.assertHTML("<div data-value='universe'>hello</div>", 'Revalidating without dirtying');
    this.assertStableRerender();

    this.rerender({ value: null });
    this.assertHTML('<div>hello</div>', 'Revalidating after dirtying');

    this.rerender({ value: 'world' });
    this.assertHTML("<div data-value='world'>hello</div>", 'Revalidating after dirtying');
  }

  @test
  'attribute nodes w/ concat follow the normal dirtying rules'() {
    this.render("<div data-value='hello {{this.value}}'>hello</div>", { value: 'world' });
    this.assertHTML("<div data-value='hello world'>hello</div>");
    this.assertStableRerender();

    this.rerender({ value: 'universe' });
    this.assertHTML("<div data-value='hello universe'>hello</div>");

    this.rerender({ value: null });
    this.assertHTML("<div data-value='hello '>hello</div>");

    this.rerender({ value: 'world' });
    this.assertHTML("<div data-value='hello world'>hello</div>");
  }

  @test
  'attributes values are normalized correctly'() {
    this.render('<div data-value={{this.value}}>hello</div>', {
      value: {
        toString() {
          return 'world';
        },
      },
    });

    this.assertHTML("<div data-value='world'>hello</div>", 'Initial render');
    this.assertStableRerender();

    this.rerender({ value: 123 });

    this.assertHTML("<div data-value='123'>hello</div>", 'Revalidating without dirtying');
    this.assertStableRerender();

    this.rerender({ value: false });

    this.assertHTML('<div>hello</div>', 'Revalidating after dirtying');
    this.assertStableRerender();

    this.rerender({
      value: {
        toString() {
          return 'world';
        },
      },
    });

    this.assertHTML("<div data-value='world'>hello</div>", 'Revalidating after dirtying');
  }

  @test
  'namespaced attribute nodes follow the normal dirtying rules'() {
    this.render("<div xml:lang='{{this.lang}}'>hello</div>", { lang: 'en-us' });

    this.assertHTML("<div xml:lang='en-us'>hello</div>", 'Initial render');

    this.rerender({ lang: 'en-uk' });

    this.assertHTML("<div xml:lang='en-uk'>hello</div>", 'Revalidating without dirtying');
    this.assertStableRerender();
  }

  @test
  'namespaced attribute nodes w/ concat follow the normal dirtying rules'() {
    this.render("<div xml:lang='en-{{this.locale}}'>hello</div>", { locale: 'us' });

    this.assertHTML("<div xml:lang='en-us'>hello</div>", 'Initial render');
    this.assertStableRerender();

    this.rerender({ locale: 'uk' });
    this.assertHTML("<div xml:lang='en-uk'>hello</div>", 'After update');

    this.rerender({ locale: null });
    this.assertHTML("<div xml:lang='en-'>hello</div>", 'After updating to null');

    this.rerender({ locale: 'us' });
    this.assertHTML("<div xml:lang='en-us'>hello</div>", 'After reset');
  }

  @test
  'non-standard namespaced attribute nodes follow the normal dirtying rules'() {
    this.render("<div epub:type='{{type}}'>hello</div>", { type: 'dedication' });
    this.assertHTML("<div epub:type='dedication'>hello</div>", 'Initial render');

    this.rerender({ type: 'backmatter' });
    this.assertHTML("<div epub:type='backmatter'>hello</div>", 'Revalidating without dirtying');
    this.assertStableRerender();
  }

  @test
  'non-standard namespaced attribute nodes w/ concat follow the normal dirtying rules'() {
    this.render("<div epub:type='dedication {{type}}'>hello</div>", { type: 'backmatter' });

    this.assertHTML("<div epub:type='dedication backmatter'>hello</div>", 'Initial render');
    this.assertStableRerender();

    this.rerender({ type: 'index' });
    this.assertHTML("<div epub:type='dedication index'>hello</div>", 'After update');

    this.rerender({ type: null });
    this.assertHTML("<div epub:type='dedication '>hello</div>", 'After updating to null');

    this.rerender({ type: 'backmatter' });
    this.assertHTML("<div epub:type='dedication backmatter'>hello</div>", 'After reset');
  }

  @test
  '<option selected> is normalized and updated correctly'() {
    let assertSelected = (expectedSelected: string[], label: string) => {
      let options = getElementsByTagName(this.element, 'option');
      let actualSelected = [];
      for (let i = 0; i < options.length; i++) {
        let option = options[i];
        // TODO: these type errors reflect real incompatibility with
        // SimpleDOM
        if ((option as any).selected) {
          actualSelected.push((option as any).value);
        }
      }

      assert.deepEqual(actualSelected, expectedSelected, label);
    };

    let template = stripTight`
      <select multiple>
        <option>0</option>
        <option selected={{one}}>1</option>
        <option selected={{two}}>2</option>
        <option selected={{three}}>3</option>
        <option selected={{four}}>4</option>
        <option selected={{five}}>5</option>
      </select>
    `;

    this.render(template, {
      one: true,
      two: 'is-true',
      three: undefined,
      four: null,
      five: false,
    });

    let expectedInitialTokens = stripTight`
      <select multiple="">
        <option>0</option>
        <option>1</option>
        <option>2</option>
        <option>3</option>
        <option>4</option>
        <option>5</option>
      </select>`;

    this.assertHTML(expectedInitialTokens, 'initial render tokens');
    assertSelected(['1', '2'], 'selection after initial render');

    this.rerender();

    assertSelected(['1', '2'], 'selection after no-op re-render');

    this.rerender({
      one: false,
      two: false,
    });

    assertSelected([], 'selection after update to all falsey');

    this.rerender({
      three: true,
      four: 'asdf',
    });

    assertSelected(['3', '4'], 'selection after update 3 & 4 to truthy');

    this.rerender({
      three: null,
      four: undefined,
    });

    assertSelected([], 'selection after update 3 & 4 back to falsey');
  }

  assertInvariants(msg?: string) {
    let result = expect(this.renderResult, 'must render before asserting invariants');

    assert.strictEqual(
      result.firstNode(),
      this.element.firstChild,
      `The firstNode of the result is the same as the root's firstChild${msg ? ': ' + msg : ''}`
    );
    assert.strictEqual(
      result.lastNode(),
      this.element.lastChild,
      `The lastNode of the result is the same as the roots's lastChild${msg ? ': ' + msg : ''}`
    );
  }

  getNodeByClassName(className: string) {
    let itemNode = getElementByClassName(this.element, className);
    assert.ok(itemNode, "Expected node with class='" + className + "'");
    return itemNode;
  }

  getFirstChildOfNode(className: string) {
    let itemNode = this.getNodeByClassName(className);
    assert.ok(
      itemNode,
      "Expected child node of node with class='" + className + "', but no parent node found"
    );

    let childNode = itemNode && itemNode.firstChild;
    assert.ok(
      childNode,
      "Expected child node of node with class='" + className + "', but not child node found"
    );

    return childNode;
  }

  @test
  'top-level bounds are correct when swapping order'() {
    let tom = { key: '1', name: 'Tom Dale', class: 'tomdale' };
    let yehuda = { key: '2', name: 'Yehuda Katz', class: 'wycats' };

    this.render("{{#each list key='key' as |item|}}{{item.name}}{{/each}}", {
      list: [tom, yehuda],
    });
    this.assertInvariants('initial render');

    this.rerender();
    this.assertInvariants('after no-op rerender');

    this.rerender({ list: [yehuda, tom] });
    this.assertInvariants('after reordering');

    this.rerender({ list: [tom] });
    this.assertInvariants('after deleting from the front');

    this.rerender({ list: [] });
    this.assertInvariants('after emptying the list');
  }

  @test
  'top-level bounds are correct when toggling conditionals'() {
    let tom = { name: 'Tom Dale' };
    let yehuda = { name: 'Yehuda Katz' };

    this.render('{{#if item}}{{item.name}}{{/if}}', { item: tom });
    this.assertInvariants('initial render');

    this.rerender();
    this.assertInvariants('after no-op rerender');

    this.rerender({ item: yehuda });
    this.assertInvariants('after replacement');

    this.rerender({ item: null });
    this.assertInvariants('after nulling');
  }

  @test
  'top-level bounds are correct when changing innerHTML'() {
    this.render('{{{this.html}}}', { html: '<b>inner</b>-<b>before</b>' });
    this.assertInvariants('initial render');

    this.rerender();
    this.assertInvariants('after no-op rerender');

    this.rerender({ html: '<p>inner-after</p>' });
    this.assertInvariants('after replacement');

    this.rerender({ html: '' });
    this.assertInvariants('after emptying');
  }

  @test
  'An implementation of #each using block params'() {
    let tom = { key: '1', name: 'Tom Dale', class: 'tomdale' };
    let yehuda = { key: '2', name: 'Yehuda Katz', class: 'wycats' };

    this.render(
      "<ul>{{#each list key='key' as |item|}}<li class='{{item.class}}'>{{item.name}}</li>{{/each}}</ul>",
      { list: [tom, yehuda] }
    );

    let itemNode = this.getNodeByClassName('tomdale');
    let nameNode = this.getFirstChildOfNode('tomdale');

    let assertStableNodes = (className: string, message: string) => {
      assert.strictEqual(
        this.getNodeByClassName(className),
        itemNode,
        'The item node has not changed ' + message
      );
      assert.strictEqual(
        this.getFirstChildOfNode(className),
        nameNode,
        'The name node has not changed ' + message
      );
    };

    this.assertHTML(
      "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>",
      'Initial render'
    );

    this.rerender();
    assertStableNodes('tomdale', 'after no-op rerender');
    this.assertHTML(
      "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>",
      'After no-op re-render'
    );

    this.rerender();
    assertStableNodes('tomdale', 'after non-dirty rerender');
    this.assertHTML(
      "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>",
      'After non-dirty re-render'
    );

    this.rerender({ list: [yehuda, tom] });
    assertStableNodes('tomdale', 'after changing the list order');
    this.assertHTML(
      "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>",
      'After changing the list order'
    );
  }

  @test
  'The each helper with empty string items'() {
    this.render(`<ul>{{#each list key='@identity' as |item|}}<li>{{item}}</li>{{/each}}</ul>`, {
      list: [''],
    });

    let items = getElementsByTagName(this.element, 'li');
    let lastNode = items[items.length - 1];

    this.assertHTML('<ul><li></li></ul>', 'Initial render');

    this.rerender({ list: ['first!', ''] });
    this.assertHTML('<ul><li>first!</li><li></li></ul>', 'After prepending list item');

    let newItems = getElementsByTagName(this.element, 'li');
    let newLastNode = newItems[newItems.length - 1];

    assert.strictEqual(
      newLastNode,
      lastNode,
      'The last node has not changed after prepending to list'
    );
  }

  @test
  'The each helper with else'() {
    this.render(
      `<ul>{{#each list key='name' as |item|}}<li class="{{item.class}}">{{item.name}}</li>{{else}}<li class="none">none</li>{{/each}}</ul>`,
      {
        list: [],
      }
    );

    let itemNode = this.getNodeByClassName('none');
    let textNode = this.getFirstChildOfNode('none');

    let assertStableNodes = (className: string, message: string) => {
      assert.strictEqual(
        this.getNodeByClassName(className),
        itemNode,
        'The item node has not changed ' + message
      );
      assert.strictEqual(
        this.getFirstChildOfNode(className),
        textNode,
        'The text node has not changed ' + message
      );
    };

    this.assertHTML(`<ul><li class="none">none</li></none`);

    this.rerender();
    assertStableNodes('none', 'after no-op rerender');

    this.rerender({ list: [{ name: 'Foo Bar', class: 'foobar' }] });
    this.assertHTML('<ul><li class="foobar">Foo Bar</li></ul>');

    this.rerender({ list: [] });
    this.assertHTML('<ul><li class="none">none</li></ul>');
  }

  @test
  'The each helper yields the index of the current item current item when using the @index key'() {
    let tom = { name: 'Tom Dale', class: 'tomdale' };
    let yehuda = { name: 'Yehuda Katz', class: 'wycats' };

    this.render(
      "<ul>{{#each list key='@index' as |item index|}}<li class='{{item.class}}'>{{item.name}}<p class='index-{{index}}'>{{index}}</p></li>{{/each}}</ul>",
      { list: [tom, yehuda] }
    );

    let itemNode = this.getNodeByClassName('tomdale');
    let indexNode = this.getNodeByClassName('index-0');
    let nameNode = this.getFirstChildOfNode('tomdale');

    let assertStableNodes = (className: string, index: number, message: string) => {
      assert.strictEqual(
        this.getNodeByClassName(className),
        itemNode,
        'The item node has not changed ' + message
      );
      assert.strictEqual(
        this.getNodeByClassName(`index-${index}`),
        indexNode,
        'The index node has not changed ' + message
      );
      assert.strictEqual(
        this.getFirstChildOfNode(className),
        nameNode,
        'The name node has not changed ' + message
      );
    };

    this.assertHTML(
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'Initial render'
    );
    this.assertStableRerender();
    this.assertStableRerender();

    this.rerender({ list: [yehuda, tom] });
    this.assertHTML(
      "<ul><li class='wycats'>Yehuda Katz<p class='index-0'>0</p></li><li class='tomdale'>Tom Dale<p class='index-1'>1</p></li></ul>",
      'After changing list order'
    );
    assert.strictEqual(
      this.getNodeByClassName(`index-0`),
      indexNode,
      'The index node has not changed after changing list order'
    );

    this.rerender({
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Kris Selden', class: 'krisselden' },
      ],
    });
    assertStableNodes('mmun', 0, 'after changing the list entries, but with stable keys');
    this.assertHTML(
      `<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='krisselden'>Kris Selden<p class='index-1'>1</p></li></ul>`,
      `After changing the list entries, but with stable keys`
    );

    this.rerender({
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Kristoph Selden', class: 'krisselden' },
        { name: 'Matthew Beale', class: 'mixonic' },
      ],
    });
    assertStableNodes('mmun', 0, 'after adding an additional entry');
    this.assertHTML(
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='krisselden'>Kristoph Selden<p class='index-1'>1</p></li>
        <li class='mixonic'>Matthew Beale<p class='index-2'>2</p></li></ul>`,
      `After adding an additional entry`
    );

    this.rerender({
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Matthew Beale', class: 'mixonic' },
      ],
    });
    assertStableNodes('mmun', 0, 'after removing the middle entry');
    this.assertHTML(
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='mixonic'>Matthew Beale<p class='index-1'>1</p></li></ul>",
      'after removing the middle entry'
    );

    this.rerender({
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Stefan Penner', class: 'stefanpenner' },
        { name: 'Robert Jackson', class: 'rwjblue' },
      ],
    });
    assertStableNodes('mmun', 0, 'after adding two more entries');
    this.assertHTML(
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding two more entries`
    );

    // New node for stability check
    itemNode = this.getNodeByClassName('rwjblue');
    nameNode = this.getFirstChildOfNode('rwjblue');
    indexNode = this.getNodeByClassName('index-2');

    this.rerender({
      list: [{ name: 'Robert Jackson', class: 'rwjblue' }],
    });
    this.assertHTML(
      "<ul><li class='rwjblue'>Robert Jackson<p class='index-0'>0</p></li></ul>",
      'After removing two entries'
    );

    this.rerender({
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Stefan Penner', class: 'stefanpenner' },
        { name: 'Robert Jackson', class: 'rwjblue' },
      ],
    });
    this.assertHTML(
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding back entries`
    );

    // New node for stability check
    itemNode = this.getNodeByClassName('mmun');
    nameNode = this.getFirstChildOfNode('mmun');
    indexNode = this.getNodeByClassName('index-0');

    this.rerender({
      list: [{ name: 'Martin Muñoz', class: 'mmun' }],
    });
    assertStableNodes('mmun', 0, 'after removing from the back');
    this.assertHTML(
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li></ul>",
      'After removing from the back'
    );

    this.rerender({ list: [] });
    if (assertNodeTagName(this.element.firstChild, 'ul')) {
      assert.strictEqual(
        this.element.firstChild!.firstChild && this.element.firstChild!.firstChild.nodeType,
        8,
        "there are no li's after removing the remaining entry"
      );
      this.assertHTML('<ul><!----></ul>', 'After removing the remaining entries');
    }
  }

  @test
  'The each helper yields the index of the current item when using a non-@index key'() {
    let tom = { key: '1', name: 'Tom Dale', class: 'tomdale' };
    let yehuda = { key: '2', name: 'Yehuda Katz', class: 'wycats' };

    this.render(
      "<ul>{{#each list key='key' as |item index|}}<li class='{{item.class}}'>{{item.name}}<p class='index-{{index}}'>{{index}}</p></li>{{/each}}</ul>",
      { list: [tom, yehuda] }
    );

    let itemNode = this.getNodeByClassName('tomdale');
    let indexNode = this.getNodeByClassName('index-0');
    let nameNode = this.getFirstChildOfNode('tomdale');

    let assertStableNodes = (className: string, index: number, message: string) => {
      assert.strictEqual(
        this.getNodeByClassName(className),
        itemNode,
        'The item node has not changed ' + message
      );
      assert.strictEqual(
        this.getNodeByClassName(`index-${index}`),
        indexNode,
        'The index node has not changed ' + message
      );
      assert.strictEqual(
        this.getFirstChildOfNode(className),
        nameNode,
        'The name node has not changed ' + message
      );
    };

    this.assertHTML(
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'Initial render'
    );
    this.assertStableRerender();
    this.assertStableRerender();

    this.rerender({ list: [yehuda, tom] });
    this.assertHTML(
      "<ul><li class='wycats'>Yehuda Katz<p class='index-0'>0</p></li><li class='tomdale'>Tom Dale<p class='index-1'>1</p></li></ul>",
      'After changing list order'
    );
    assert.strictEqual(
      this.getNodeByClassName('index-1'),
      indexNode,
      'The index node has been moved after changing list order'
    );

    this.rerender({
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '2', name: 'Kris Selden', class: 'krisselden' },
      ],
    });
    assertStableNodes('mmun', 0, 'after changing the list entries, but with stable keys');
    this.assertHTML(
      `<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='krisselden'>Kris Selden<p class='index-1'>1</p></li></ul>`,
      `After changing the list entries, but with stable keys`
    );

    this.rerender({
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '2', name: 'Kristoph Selden', class: 'krisselden' },
        { key: '3', name: 'Matthew Beale', class: 'mixonic' },
      ],
    });
    assertStableNodes('mmun', 0, 'after adding an additional entry');
    this.assertHTML(
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='krisselden'>Kristoph Selden<p class='index-1'>1</p></li>
        <li class='mixonic'>Matthew Beale<p class='index-2'>2</p></li></ul>`,
      `After adding an additional entry`
    );

    this.rerender({
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '3', name: 'Matthew Beale', class: 'mixonic' },
      ],
    });
    assertStableNodes('mmun', 0, 'after removing the middle entry');
    this.assertHTML(
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='mixonic'>Matthew Beale<p class='index-1'>1</p></li></ul>",
      'after removing the middle entry'
    );

    this.rerender({
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '4', name: 'Stefan Penner', class: 'stefanpenner' },
        { key: '5', name: 'Robert Jackson', class: 'rwjblue' },
      ],
    });
    assertStableNodes('mmun', 0, 'after adding two more entries');
    this.assertHTML(
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding two more entries`
    );

    // New node for stability check
    itemNode = this.getNodeByClassName('rwjblue');
    nameNode = this.getFirstChildOfNode('rwjblue');
    indexNode = this.getNodeByClassName('index-2');

    this.rerender({
      list: [{ key: '5', name: 'Robert Jackson', class: 'rwjblue' }],
    });
    assertStableNodes('rwjblue', 0, 'after removing two entries');
    this.assertHTML(
      "<ul><li class='rwjblue'>Robert Jackson<p class='index-0'>0</p></li></ul>",
      'After removing two entries'
    );

    this.rerender({
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '4', name: 'Stefan Penner', class: 'stefanpenner' },
        { key: '5', name: 'Robert Jackson', class: 'rwjblue' },
      ],
    });
    assertStableNodes('rwjblue', 2, 'after adding back entries');
    this.assertHTML(
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding back entries`
    );

    // New node for stability check
    itemNode = this.getNodeByClassName('mmun');
    nameNode = this.getFirstChildOfNode('mmun');
    indexNode = this.getNodeByClassName('index-0');

    this.rerender({
      list: [{ key: '1', name: 'Martin Muñoz', class: 'mmun' }],
    });
    assertStableNodes('mmun', 0, 'after removing from the back');
    this.assertHTML(
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li></ul>",
      'After removing from the back'
    );

    this.rerender({ list: [] });
    if (assertNodeTagName(this.element.firstChild, 'ul')) {
      assert.strictEqual(
        this.element.firstChild!.firstChild && this.element.firstChild!.firstChild.nodeType,
        8,
        "there are no li's after removing the remaining entry"
      );
    }
    this.assertHTML('<ul><!----></ul>', 'After removing the remaining entries');
  }

  @test
  '{{each}} items destroy correctly when destroying the whole list (new and updated items)'() {
    let destroyCount = 0;

    this.registerComponent(
      'Glimmer',
      'DestroyableComponent',
      '{{@item}}',
      class extends EmberishGlimmerComponent {
        destroy() {
          destroyCount++;
        }
      }
    );

    this.render(
      stripTight`
        {{#each this.list as |item|}}
          <div><DestroyableComponent @item={{item}}/></div>
        {{/each}}
      `,
      {
        list: ['initial'],
      }
    );

    this.assertHTML(`<div>initial</div>`);

    this.rerender({ list: ['initial', 'update'] });
    this.assertHTML(`<div>initial</div><div>update</div>`);

    this.rerender({ list: ['initial'] });
    assert.equal(destroyCount, 1, 'destroy was called for removed item');

    this.rerender({ list: [] });
    assert.equal(destroyCount, 2, 'remaining list item was correctly destroyed');
  }

  @test
  '{{each}} items destroy correctly if they were added after initial render'() {
    let destroyCount = 0;

    this.registerComponent(
      'Glimmer',
      'DestroyableComponent',
      '{{@item}}',
      class extends EmberishGlimmerComponent {
        destroy() {
          destroyCount++;
        }
      }
    );

    this.render(
      stripTight`
        {{#each this.list as |item|}}
          <div><DestroyableComponent @item={{item}}/></div>
        {{/each}}
      `,
      {
        list: ['initial'],
      }
    );

    this.assertHTML(`<div>initial</div>`);

    this.rerender({ list: ['initial', 'update'] });
    this.assertHTML(`<div>initial</div><div>update</div>`);

    this.rerender({ list: ['initial'] });
    assert.equal(destroyCount, 1, 'new list item was correctly destroyed');
  }

  // TODO: port https://github.com/emberjs/ember.js/pull/14082
}

jitSuite(UpdatingTest);

function assertHandleError(
  assert: typeof QUnit.assert,
  result: HandleResult,
  ...errors: EncoderError[]
) {
  assert.ok(typeof result !== 'number', 'Expected errors, found none');
  assert.deepEqual((result as ErrHandle).errors, errors);
}
