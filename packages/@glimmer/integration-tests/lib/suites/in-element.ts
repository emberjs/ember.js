import { RenderTest } from '../render-test';
import { setProperty as set } from '@glimmer/object-reference';
import { test } from '../test-decorator';
import { equalsElement } from '../dom/assertions';
import { stripTight } from '../test-helpers/strings';
import { replaceHTML } from '../dom/simple-utils';
import { EmberishCurlyComponent } from '../components/emberish-curly';

export class InElementSuite extends RenderTest {
  static suiteName = '#in-element';

  @test
  'Renders curlies into external element'() {
    let externalElement = this.delegate.createElement('div');
    this.render('{{#in-element externalElement}}[{{foo}}]{{/in-element}}', {
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
        |{{foo}}|
        {{#in-element first}}[1{{foo}}]{{/in-element}}
        {{#in-element second}}[2{{foo}}]{{/in-element}}
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

    this.render(stripTight`{{#in-element externalElement}}[{{foo}}]{{/in-element}}`, {
      externalElement,
      foo: 'Yippie!',
    });

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
  'With nextSibling'() {
    let externalElement = this.delegate.createElement('div');
    replaceHTML(externalElement, '<b>Hello</b><em>there!</em>');

    this.render(
      stripTight`{{#in-element externalElement nextSibling=nextSibling}}[{{foo}}]{{/in-element}}`,
      { externalElement, nextSibling: externalElement.lastChild, foo: 'Yippie!' }
    );

    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Double Yips!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ nextSibling: null });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>[Double Yips!]');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement: null });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement, nextSibling: externalElement.lastChild, foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }

  @test
  'Updating remote element'() {
    let first = this.delegate.createElement('div');
    let second = this.delegate.createElement('div');

    this.render(stripTight`{{#in-element externalElement}}[{{foo}}]{{/in-element}}`, {
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
        {{#if showFirst}}
          {{#in-element first}}[{{foo}}]{{/in-element}}
        {{/if}}
        {{#if showSecond}}
          {{#in-element second}}[{{foo}}]{{/in-element}}
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
  Multiple() {
    let firstElement = this.delegate.createElement('div');
    let secondElement = this.delegate.createElement('div');

    this.render(
      stripTight`
        {{#in-element firstElement}}
          [{{foo}}]
        {{/in-element}}
        {{#in-element secondElement}}
          [{{bar}}]
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
    this.testType = 'Dynamic';
    this.registerComponent('Basic', 'FooBar', '<p>{{@value}}</p>');

    let roots = [
      { id: 0, element: this.delegate.createElement('div'), value: 'foo' },
      { id: 1, element: this.delegate.createElement('div'), value: 'bar' },
      { id: 2, element: this.delegate.createElement('div'), value: 'baz' },
    ];

    this.render(
      stripTight`
        {{~#each roots key="id" as |root|~}}
          {{~#in-element root.element ~}}
            {{component 'FooBar' value=root.value}}
          {{~/in-element~}}
        {{~/each}}
        `,
      {
        roots,
      }
    );

    equalsElement(roots[0].element, 'div', {}, '<p>foo</p>');
    equalsElement(roots[1].element, 'div', {}, '<p>bar</p>');
    equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();

    set(roots[0], 'value', 'qux!');
    this.rerender();
    equalsElement(roots[0].element, 'div', {}, '<p>qux!</p>');
    equalsElement(roots[1].element, 'div', {}, '<p>bar</p>');
    equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();

    set(roots[1], 'value', 'derp');
    this.rerender();
    equalsElement(roots[0].element, 'div', {}, '<p>qux!</p>');
    equalsElement(roots[1].element, 'div', {}, '<p>derp</p>');
    equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();

    set(roots[0], 'value', 'foo');
    set(roots[1], 'value', 'bar');
    this.rerender();
    equalsElement(roots[0].element, 'div', {}, '<p>foo</p>');
    equalsElement(roots[1].element, 'div', {}, '<p>bar</p>');
    equalsElement(roots[2].element, 'div', {}, '<p>baz</p>');
    this.assertHTML('<!----><!----><!--->');
    this.assertStableRerender();
    this.testType = 'Basic';
  }

  @test
  Nesting() {
    let firstElement = this.delegate.createElement('div');
    let secondElement = this.delegate.createElement('div');

    this.render(
      stripTight`
        {{#in-element firstElement}}
          [{{foo}}]
          {{#in-element secondElement}}
            [{{bar}}]
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

    class DestroyMeComponent extends EmberishCurlyComponent {
      destroy() {
        super.destroy();
        destroyed++;
      }
    }

    this.registerComponent('Glimmer', 'DestroyMe', 'destroy me!', DestroyMeComponent as any);
    let externalElement = this.delegate.createElement('div');

    this.render(
      stripTight`
        {{#if showExternal}}
          {{#in-element externalElement}}[<DestroyMe />]{{/in-element}}
        {{/if}}
      `,
      {
        externalElement,
        showExternal: false,
      }
    );

    equalsElement(externalElement, 'div', {}, stripTight``);
    this.assert.equal(destroyed, 0, 'component was destroyed');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ showExternal: true });
    equalsElement(externalElement, 'div', {}, stripTight`[destroy me!]`);
    this.assert.equal(destroyed, 0, 'component was destroyed');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ showExternal: false });
    equalsElement(externalElement, 'div', {}, stripTight``);
    this.assert.equal(destroyed, 1, 'component was destroyed');
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }
}
