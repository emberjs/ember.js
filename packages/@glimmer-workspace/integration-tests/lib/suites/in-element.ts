import type { AST } from '@glimmer/syntax';
import { destroy } from '@glimmer/destroyable';
import { assign, unwrap } from '@glimmer/util';

import { GlimmerishComponent } from '../components/emberish-glimmer';
import { equalsElement } from '../dom/assertions';
import { replaceHTML } from '../dom/simple-utils';
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { stripTight } from '../test-helpers/strings';
import { tracked } from '../test-helpers/tracked';

export class InElementSuite extends RenderTest {
  static suiteName = '#in-element';

  @test
  'It works with AST transforms'() {
    this.registerPlugin((env) => ({
      name: 'maybe-in-element',
      visitor: {
        BlockStatement(node: AST.BlockStatement) {
          let b = env.syntax.builders;
          let { path, ...rest } = node;
          if (path.type !== 'SubExpression' && path.original === 'maybe-in-element') {
            return assign({ path: b.path('in-element', path.loc) }, rest);
          } else {
            return node;
          }
        },
      },
    }));

    let externalElement = this.delegate.createElement('div');
    this.render('{{#maybe-in-element this.externalElement}}[{{this.foo}}]{{/maybe-in-element}}', {
      externalElement,
      foo: 'Yippie!',
    });

    equalsElement(externalElement, 'div', {}, '[Yippie!]');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yups!' });
    equalsElement(externalElement, 'div', {}, '[Double Yups!]');
    this.assertStableNodes();

    this.rerender({ foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, '[Yippie!]');
    this.assertStableNodes();
  }

  @test
  'Renders curlies into external element'() {
    let externalElement = this.delegate.createElement('div');
    this.render('{{#in-element this.externalElement}}[{{this.foo}}]{{/in-element}}', {
      externalElement,
      foo: 'Yippie!',
    });

    equalsElement(externalElement, 'div', {}, '[Yippie!]');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yups!' });
    equalsElement(externalElement, 'div', {}, '[Double Yups!]');
    this.assertStableNodes();

    this.rerender({ foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, '[Yippie!]');
    this.assertStableNodes();
  }

  @test
  'clears existing content'() {
    let externalElement = this.delegate.createElement('div');
    let initialContent = '<p>Hello there!</p>';
    replaceHTML(externalElement, initialContent);

    this.render('{{#in-element this.externalElement}}[{{this.foo}}]{{/in-element}}', {
      externalElement,
      foo: 'Yippie!',
    });

    equalsElement(externalElement, 'div', {}, '[Yippie!]');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yups!' });
    equalsElement(externalElement, 'div', {}, '[Double Yups!]');
    this.assertStableNodes();

    this.rerender({ foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, '[Yippie!]');
    this.assertStableNodes();
  }

  @test
  'Changing to falsey'() {
    let first = this.delegate.createElement('div');
    let second = this.delegate.createElement('div');

    this.render(
      stripTight`
        |{{this.foo}}|
        {{#in-element this.first}}[1{{this.foo}}]{{/in-element}}
        {{#in-element this.second}}[2{{this.foo}}]{{/in-element}}
      `,
      { first, second: null, foo: 'Yippie!' }
    );

    equalsElement(first, 'div', {}, '[1Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Yippie!|<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(first, 'div', {}, '[1Double Yips!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Double Yips!|<!----><!---->');
    this.assertStableNodes();

    this.rerender({ first: null });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Double Yips!|<!----><!---->');
    this.assertStableRerender();

    this.rerender({ second });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '[2Double Yips!]');
    this.assertHTML('|Double Yips!|<!----><!---->');
    this.assertStableRerender();

    this.rerender({ first, second: null, foo: 'Yippie!' });
    equalsElement(first, 'div', {}, '[1Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Yippie!|<!----><!---->');
    this.assertStableRerender();
  }

  @test
  'With pre-existing content'() {
    let externalElement = this.delegate.createElement('div');
    let initialContent = '<p>Hello there!</p>';
    replaceHTML(externalElement, initialContent);

    this.render(
      stripTight`{{#in-element this.externalElement insertBefore=null}}[{{this.foo}}]{{/in-element}}`,
      {
        externalElement,
        foo: 'Yippie!',
      }
    );

    equalsElement(externalElement, 'div', {}, `${initialContent}[Yippie!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(externalElement, 'div', {}, `${initialContent}[Double Yips!]`);
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ externalElement: null });
    equalsElement(externalElement, 'div', {}, `${initialContent}`);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement, foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, `${initialContent}[Yippie!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }

  @test
  'With insertBefore'() {
    let externalElement = this.delegate.createElement('div');
    replaceHTML(externalElement, '<b>Hello</b><em>there!</em>');

    this.render(
      stripTight`{{#in-element this.externalElement insertBefore=this.insertBefore}}[{{this.foo}}]{{/in-element}}`,
      { externalElement, insertBefore: externalElement.lastChild, foo: 'Yippie!' }
    );

    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Double Yips!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ insertBefore: null });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>[Double Yips!]');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement: null });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement, insertBefore: externalElement.lastChild, foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }

  @test
  'Updating remote element'() {
    let first = this.delegate.createElement('div');
    let second = this.delegate.createElement('div');

    this.render(stripTight`{{#in-element this.externalElement}}[{{this.foo}}]{{/in-element}}`, {
      externalElement: first,
      foo: 'Yippie!',
    });

    equalsElement(first, 'div', {}, '[Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(first, 'div', {}, '[Double Yips!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ foo: 'Yippie!' });
    equalsElement(first, 'div', {}, '[Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ externalElement: second });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '[Yippie!]');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '[Double Yips!]');
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ foo: 'Yay!' });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '[Yay!]');
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ externalElement: first, foo: 'Yippie!' });
    equalsElement(first, 'div', {}, '[Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }

  @test
  "Inside an '{{if}}'"() {
    let first = { element: this.delegate.createElement('div'), description: 'first' };
    let second = { element: this.delegate.createElement('div'), description: 'second' };

    this.render(
      stripTight`
        {{#if this.showFirst}}
          {{#in-element this.first}}[{{this.foo}}]{{/in-element}}
        {{/if}}
        {{#if this.showSecond}}
          {{#in-element this.second}}[{{this.foo}}]{{/in-element}}
        {{/if}}
      `,
      {
        first: first.element,
        second: second.element,
        showFirst: true,
        showSecond: false,
        foo: 'Yippie!',
      }
    );

    equalsElement(first, 'div', {}, '[Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ showFirst: false });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ showSecond: true });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '[Yippie!]');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '[Double Yips!]');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ showSecond: false });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ showFirst: true });
    equalsElement(first, 'div', {}, '[Double Yips!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Yippie!' });
    equalsElement(first, 'div', {}, '[Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();
  }

  @test
  'Inside the current constructing element'() {
    this.render(
      stripTight`
        Before
        {{#in-element this.element insertBefore=null}}
          {{this.foo}}
        {{/in-element}}
        After
      `,
      {
        element: this.element,
        foo: 'Yippie!',
      }
    );

    this.assertHTML('BeforeYippie!<!---->After');
    this.assertStableRerender();

    destroy(unwrap(this.renderResult));
  }

  @test
  Multiple() {
    let firstElement = this.delegate.createElement('div');
    let secondElement = this.delegate.createElement('div');

    this.render(
      stripTight`
        {{#in-element this.firstElement}}
          [{{this.foo}}]
        {{/in-element}}
        {{#in-element this.secondElement}}
          [{{this.bar}}]
        {{/in-element}}
        `,
      {
        firstElement,
        secondElement,
        foo: 'Hello!',
        bar: 'World!',
      }
    );

    equalsElement(firstElement, 'div', {}, stripTight`[Hello!]`);
    equalsElement(secondElement, 'div', {}, stripTight`[World!]`);
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'GoodBye!' });
    equalsElement(firstElement, 'div', {}, stripTight`[GoodBye!]`);
    equalsElement(secondElement, 'div', {}, stripTight`[World!]`);
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ bar: 'Folks!' });
    equalsElement(firstElement, 'div', {}, stripTight`[GoodBye!]`);
    equalsElement(secondElement, 'div', {}, stripTight`[Folks!]`);
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Hello!', bar: 'World!' });
    equalsElement(firstElement, 'div', {}, stripTight`[Hello!]`);
    equalsElement(secondElement, 'div', {}, stripTight`[World!]`);
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();
  }

  @test
  'Inside a loop'() {
    let { delegate } = this;

    class Item {
      element = delegate.createElement('div');

      @tracked value: string;

      constructor(value: string) {
        this.value = value;
      }
    }

    this.testType = 'Dynamic';
    this.registerComponent('TemplateOnly', 'FooBar', '<p>{{@value}}</p>');

    this.registerHelper('log', () => {});

    let roots = [new Item('foo'), new Item('bar'), new Item('baz')];

    this.render(
      stripTight`
        {{~#each this.roots as |root|~}}
          {{~log root~}}
          {{~#in-element root.element ~}}
            <FooBar @value={{root.value}} />
            {{!component 'FooBar' value=root.value}}
          {{~/in-element~}}
        {{~/each}}
        `,
      {
        roots,
      }
    );

    const [first, second, third] = roots;
    this.guard(first && second && third, 'the roots exists');

    equalsElement(first.element, 'div', {}, '<p>foo</p>');
    equalsElement(second.element, 'div', {}, '<p>bar</p>');
    equalsElement(third?.element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();

    first.value = 'qux!';
    this.rerender();
    equalsElement(first.element, 'div', {}, '<p>qux!</p>');
    equalsElement(second.element, 'div', {}, '<p>bar</p>');
    equalsElement(third.element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();

    second.value = 'derp';
    this.rerender();
    equalsElement(first.element, 'div', {}, '<p>qux!</p>');
    equalsElement(second.element, 'div', {}, '<p>derp</p>');
    equalsElement(third.element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();

    first.value = 'foo';
    second.value = 'bar';
    this.rerender();
    equalsElement(first.element, 'div', {}, '<p>foo</p>');
    equalsElement(second.element, 'div', {}, '<p>bar</p>');
    equalsElement(third.element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();
    this.testType = 'TemplateOnly';
  }

  @test
  Nesting() {
    let firstElement = this.delegate.createElement('div');
    let secondElement = this.delegate.createElement('div');

    this.render(
      stripTight`
        {{#in-element this.firstElement}}
          [{{this.foo}}]
          {{#in-element this.secondElement}}
            [{{this.bar}}]
          {{/in-element}}
        {{/in-element}}
        `,
      {
        firstElement,
        secondElement,
        foo: 'Hello!',
        bar: 'World!',
      }
    );

    equalsElement(firstElement, 'div', {}, stripTight`[Hello!]<!---->`);
    equalsElement(secondElement, 'div', {}, stripTight`[World!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'GoodBye!' });
    equalsElement(firstElement, 'div', {}, stripTight`[GoodBye!]<!---->`);
    equalsElement(secondElement, 'div', {}, stripTight`[World!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ bar: 'Folks!' });
    equalsElement(firstElement, 'div', {}, stripTight`[GoodBye!]<!---->`);
    equalsElement(secondElement, 'div', {}, stripTight`[Folks!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ bar: 'World!' });
    equalsElement(firstElement, 'div', {}, stripTight`[GoodBye!]<!---->`);
    equalsElement(secondElement, 'div', {}, stripTight`[World!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Hello!' });
    equalsElement(firstElement, 'div', {}, stripTight`[Hello!]<!---->`);
    equalsElement(secondElement, 'div', {}, stripTight`[World!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }

  @test
  'Components are destroyed'() {
    let destroyed = 0;

    class DestroyMeComponent extends GlimmerishComponent {
      override willDestroy() {
        super.willDestroy();
        destroyed++;
      }
    }

    this.registerComponent('Glimmer', 'DestroyMe', 'destroy me!', DestroyMeComponent as any);
    let externalElement = this.delegate.createElement('div');

    this.render(
      stripTight`
        {{#if this.showExternal}}
          {{#in-element this.externalElement}}[<DestroyMe />]{{/in-element}}
        {{/if}}
      `,
      {
        externalElement,
        showExternal: false,
      }
    );

    equalsElement(externalElement, 'div', {}, stripTight``);
    this.assert.strictEqual(destroyed, 0, 'component was destroyed');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ showExternal: true });
    equalsElement(externalElement, 'div', {}, stripTight`[destroy me!]`);
    this.assert.strictEqual(destroyed, 0, 'component was destroyed');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ showExternal: false });
    equalsElement(externalElement, 'div', {}, stripTight``);
    this.assert.strictEqual(destroyed, 1, 'component was destroyed');
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }
}
