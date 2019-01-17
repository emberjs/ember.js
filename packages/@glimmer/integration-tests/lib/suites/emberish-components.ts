import { RenderTest, Count } from '../render-test';
import { test } from '../test-decorator';
import { SimpleElement } from '@simple-dom/interface';
import { EmberishGlimmerComponent, EmberishCurlyComponent } from '../components';
import { strip } from '../test-helpers/strings';
import { assertElementShape, classes, assertEmberishElement } from '../dom/assertions';
import { assertElement, toInnerHTML } from '../dom/simple-utils';
import { EmberishGlimmerArgs } from '../components/emberish-glimmer';
import { equalTokens } from '../snapshot';

export class EmberishComponentTests extends RenderTest {
  static suiteName = 'Emberish';

  @test({ kind: 'glimmer' })
  '[BUG: #644 popping args should be balanced]'() {
    class MainComponent extends EmberishGlimmerComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent(
      'Glimmer',
      'Main',
      '<div><HelloWorld @name={{salutation}} /></div>',
      MainComponent
    );
    this.registerComponent('Glimmer', 'HelloWorld', '<h1>Hello {{@name}}!</h1>');
    this.render('<Main />');
    this.assertHTML('<div><h1>Hello Glimmer!</h1></div>');
  }

  @test({ kind: 'glimmer' })
  '[BUG] Gracefully handles application of curried args when invoke starts with 0 args'() {
    class MainComponent extends EmberishGlimmerComponent {
      salutation = 'Glimmer';
    }
    this.registerComponent(
      'Glimmer',
      'Main',
      '<div><HelloWorld @a={{@a}} as |wat|>{{wat}}</HelloWorld></div>',
      MainComponent
    );
    this.registerComponent('Glimmer', 'HelloWorld', '{{yield (component "A" a=@a)}}');
    this.registerComponent('Glimmer', 'A', 'A {{@a}}');
    this.render('<Main @a={{a}} />', { a: 'a' });
    this.assertHTML('<div>A a</div>');
    this.assertStableRerender();
    this.rerender({ a: 'A' });
    this.assertHTML('<div>A A</div>');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  'Static block component helper'() {
    this.registerComponent('Glimmer', 'A', 'A {{#component "B" arg1=@one}}{{/component}}');
    this.registerComponent('Glimmer', 'B', 'B {{@arg1}}');
    this.render('<A @one={{arg}} />', { arg: 1 });
    this.assertHTML('A B 1');
    this.assertStableRerender();
    this.rerender({ arg: 2 });
    this.assertHTML('A B 2');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  'Static inline component helper'() {
    this.registerComponent('Glimmer', 'A', 'A {{component "B" arg1=@one}}');
    this.registerComponent('Glimmer', 'B', 'B {{@arg1}}');
    this.render('<A @one={{arg}} />', { arg: 1 });
    this.assertHTML('A B 1');
    this.assertStableRerender();
    this.rerender({ arg: 2 });
    this.assertHTML('A B 2');
    this.assertStableNodes();
  }

  @test({ kind: 'glimmer' })
  'top level in-element'() {
    this.registerComponent('Glimmer', 'Foo', '<Bar data-bar={{@childName}} @data={{@data}} />');
    this.registerComponent('Glimmer', 'Bar', '<div ...attributes>Hello World</div>');

    let el = this.delegate.getInitialElement();

    this.render(
      strip`
    {{#each components key="id" as |component|}}
      {{#in-element component.mount}}
        {{component component.name childName=component.child data=component.data}}
      {{/in-element}}
    {{/each}}
    `,
      { components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] }
    );

    let first = assertElement(el.firstChild);

    assertElementShape(first, 'div', { 'data-bar': 'Bar' }, 'Hello World');
    this.rerender({ components: [{ name: 'Foo', child: 'Bar', mount: el, data: { wat: 'Wat' } }] });
    assertElementShape(first, 'div', { 'data-bar': 'Bar' }, 'Hello World');
  }

  @test({ kind: 'glimmer' })
  'recursive component invocation'() {
    let counter = 0;

    class RecursiveInvoker extends EmberishGlimmerComponent {
      id: number;

      get showChildren() {
        return this.id < 3;
      }

      constructor(args: EmberishGlimmerArgs) {
        super(args);
        this.id = ++counter;
      }
    }

    this.registerComponent(
      'Glimmer',
      'RecursiveInvoker',
      '{{id}}{{#if showChildren}}<RecursiveInvoker />{{/if}}',
      RecursiveInvoker
    );

    this.render('<RecursiveInvoker />');
    this.assertHTML('123<!---->');
  }

  @test
  'Element modifier with hooks'(assert: Assert, count: Count) {
    this.registerModifier(
      'foo',
      class {
        element?: SimpleElement;
        didInsertElement() {
          count.expect('didInsertElement');
          assert.ok(this.element, 'didInsertElement');
          assert.equal(this.element!.getAttribute('data-ok'), 'true', 'didInsertElement');
        }

        didUpdate() {
          count.expect('didUpdate');
          assert.ok(true, 'didUpdate');
        }

        willDestroyElement() {
          count.expect('willDestroyElement');
          assert.ok(true, 'willDestroyElement');
        }
      }
    );

    this.render('{{#if ok}}<div data-ok=true {{foo bar}}></div>{{/if}}', {
      bar: 'bar',
      ok: true,
    });

    this.rerender({ bar: 'foo' });
    this.rerender({ ok: false });
  }

  @test
  'non-block without properties'() {
    this.render({
      layout: 'In layout',
    });

    this.assertComponent('In layout');
    this.assertStableRerender();
  }

  @test
  'block without properties'() {
    this.render({
      layout: 'In layout -- {{yield}}',
      template: 'In template',
    });

    this.assertComponent('In layout -- In template');
    this.assertStableRerender();
  }

  @test
  'yield inside a conditional on the component'() {
    this.render(
      {
        layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
        template: 'In template',
        args: { predicate: 'predicate' },
      },
      { predicate: true }
    );

    this.assertComponent('In layout -- In template', {});
    this.assertStableRerender();

    this.rerender({ predicate: false });
    this.assertComponent('In layout -- <!---->');
    this.assertStableNodes();

    this.rerender({ predicate: true });
    this.assertComponent('In layout -- In template', {});
    this.assertStableNodes();
  }

  @test
  'non-block with properties on attrs'() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}}',
      args: { someProp: '"something here"' },
    });

    this.assertComponent('In layout - someProp: something here');
    this.assertStableRerender();
  }

  @test
  'block with properties on attrs'() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}} - {{yield}}',
      template: 'In template',
      args: { someProp: '"something here"' },
    });

    this.assertComponent('In layout - someProp: something here - In template');
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'curly' })
  'with ariaRole specified'() {
    this.render({
      layout: 'Here!',
      attributes: { id: '"aria-test"', ariaRole: '"main"' },
    });

    this.assertComponent('Here!', { id: '"aria-test"', role: '"main"' });
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'curly' })
  'with ariaRole and class specified'() {
    this.render({
      layout: 'Here!',
      attributes: { id: '"aria-test"', class: '"foo"', ariaRole: '"main"' },
    });

    this.assertComponent('Here!', {
      id: '"aria-test"',
      class: classes('ember-view foo'),
      role: '"main"',
    });
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'curly' })
  'with ariaRole specified as an outer binding'() {
    this.render(
      {
        layout: 'Here!',
        attributes: { id: '"aria-test"', class: '"foo"', ariaRole: 'ariaRole' },
      },
      { ariaRole: 'main' }
    );

    this.assertComponent('Here!', {
      id: '"aria-test"',
      class: classes('ember-view foo'),
      role: '"main"',
    });
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'glimmer' })
  'glimmer component with role specified as an outer binding and copied'() {
    this.render(
      {
        layout: 'Here!',
        attributes: { id: '"aria-test"', role: 'myRole' },
      },
      { myRole: 'main' }
    );

    this.assertComponent('Here!', { id: '"aria-test"', role: '"main"' });
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'invoking wrapped layout via angle brackets applies ...attributes'() {
    this.registerComponent('Curly', 'FooBar', 'Hello world!');

    this.render(`<FooBar data-foo="bar" />`);

    this.assertComponent('Hello world!', { 'data-foo': 'bar' });
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'invoking wrapped layout via angle brackets - invocation attributes clobber internal attributes'() {
    class FooBar extends EmberishCurlyComponent {
      [index: string]: unknown;

      constructor() {
        super();
        this.attributeBindings = ['data-foo'];
        this['data-foo'] = 'inner';
      }
    }
    this.registerComponent('Curly', 'FooBar', 'Hello world!', FooBar);

    this.render(`<FooBar data-foo="outer" />`);

    this.assertComponent('Hello world!', { 'data-foo': 'outer' });
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'invoking wrapped layout via angle brackets - invocation attributes merges classes'() {
    class FooBar extends EmberishCurlyComponent {
      [index: string]: unknown;

      constructor() {
        super();
        this.attributeBindings = ['class'];
        this['class'] = 'inner';
      }
    }
    this.registerComponent('Curly', 'FooBar', 'Hello world!', FooBar);

    this.render(`<FooBar class="outer" />`);

    this.assertComponent('Hello world!', { class: classes('ember-view inner outer') });
    this.assertStableRerender();
  }

  @test({ kind: 'curly' })
  'invoking wrapped layout via angle brackets also applies explicit ...attributes'() {
    this.registerComponent('Curly', 'FooBar', '<h1 ...attributes>Hello world!</h1>');

    this.render(`<FooBar data-foo="bar" />`);

    let wrapperElement = assertElement(this.element.firstChild);
    assertEmberishElement(wrapperElement, 'div', { 'data-foo': 'bar' });
    equalTokens(toInnerHTML(wrapperElement), '<h1 data-foo="bar">Hello world!</h1>');

    this.assertStableRerender();
  }
}
