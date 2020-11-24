import { RenderTest, Count } from '../render-test';
import { test } from '../test-decorator';
import { SimpleElement } from '@simple-dom/interface';
import { EmberishCurlyComponent } from '../components';
import { classes, assertEmberishElement } from '../dom/assertions';
import { assertElement, toInnerHTML } from '../dom/simple-utils';
import { equalTokens } from '../snapshot';

export class EmberishComponentTests extends RenderTest {
  static suiteName = 'Emberish';

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

  // LOCKS
  @test({ kind: 'curly' })
  'yields named block'() {
    class FooBar extends EmberishCurlyComponent {
      [index: string]: unknown;

      constructor() {
        super();
      }
    }
    this.registerComponent('Curly', 'FooBar', 'Hello{{yield to="baz"}}world!', FooBar);

    this.render(`<FooBar><:baz> my </:baz></FooBar>`);

    this.assertComponent('Hello my world!');
    this.assertStableRerender();
  }

  // LOCKS
  @test({ kind: 'curly' })
  'implicit default named block'() {
    class FooBar extends EmberishCurlyComponent {
      [index: string]: unknown;

      constructor() {
        super();
      }
    }
    this.registerComponent('Curly', 'FooBar', 'Hello{{yield}}world!', FooBar);

    this.render(`<FooBar> my </FooBar>`);

    this.assertComponent('Hello my world!');
    this.assertStableRerender();
  }

  // LOCKS
  @test({ kind: 'curly' })
  'explicit default named block'() {
    class FooBar extends EmberishCurlyComponent {
      [index: string]: unknown;

      constructor() {
        super();
      }
    }
    this.registerComponent('Curly', 'FooBar', 'Hello{{yield to="default"}}world!', FooBar);

    this.render(`<FooBar><:default> my </:default></FooBar>`);

    this.assertComponent('Hello my world!');
    this.assertStableRerender();
  }

  // LOCKS
  @test({ kind: 'curly' })
  'else named block'() {
    class FooBar extends EmberishCurlyComponent {
      [index: string]: unknown;

      constructor() {
        super();
      }
    }
    this.registerComponent('Curly', 'FooBar', 'Hello{{yield to="inverse"}}world!', FooBar);

    this.render(`<FooBar><:else> my </:else></FooBar>`);

    this.assertComponent('Hello my world!');
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
