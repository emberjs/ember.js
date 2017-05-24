import {
  VersionedObject,
  strip,
  template,
  testModule,
  RenderingTest
} from "@glimmer/test-helpers";

@testModule('Static Content Tests')
export class StaticContentTests extends RenderingTest {
  @template(`Hello World!`)
  ['renders text']() {
    this.render({});
    this.assertContent(`Hello World!`);
    this.assertStableRerender();
  }

  @template(`<h1>Hello World!</h1>`)
  ['renders static element']() {
    this.render({});
    this.assertContent(`<h1>Hello World!</h1>`);
    this.assertStableRerender();
  }

  @template(`<use-the-platform />`)
  ['renders custom elements']() {
    this.render({});
    this.assertContent(`<use-the-platform></use-the-platform>`);
    this.assertStableRerender();
  }

  @template(strip`
    <div class="world">
      <h1>Hello World!</h1>
      <p>This is just a paragraph</p>
      <a href="http://linkedin.com">Some Link</a>
    </div>
  `)
  ['renders static template']() {
    this.render({});
    this.assertContent(strip`
    <div class="world">
      <h1>Hello World!</h1>
      <p>This is just a paragraph</p>
      <a href="http://linkedin.com">Some Link</a>
    </div>
    `);
    this.assertStableRerender();
  }
}

@testModule('Content Tests')
export class DynamicContentTests extends RenderingTest {
  protected context: VersionedObject;

  @template(`<div><p>{{value}}</p></div>`)
  ['renders simple curly']() {
    this.render({ value: 'hello world' });
    this.assertContent('<div><p>hello world</p></div>');
    this.assertStableRerender();

    this.runTask(() => this.context.set('value', "goodbye world"));
    this.assertContent('<div><p>goodbye world</p></div>');
    this.assertInvariants();

    this.runTask(() => this.context.update({ value: 'hello world'}));
    this.assertContent('<div><p>hello world</p></div>');
    this.assertInvariants();
  }

  @template(`<div><p>{{value}} world</p></div>`)
  ['renders simple curly with sibling']() {
    this.render({ value: 'hello' });
    this.assertContent('<div><p>hello world</p></div>');
    this.assertStableRerender();

    this.runTask(() => this.context.set('value', "goodbye"));
    this.assertContent('<div><p>goodbye world</p></div>');
    this.assertInvariants();

    this.runTask(() => this.context.update({ value: 'hello' }));
    this.assertContent('<div><p>hello world</p></div>');
    this.assertInvariants();
  }

  @template(`<div><p>{{v1}}</p><p>{{v2}}</p></div>`)
  ['null and undefined produces empty text nodes']() {
    this.render({ v1: null, v2: undefined });
    this.assertContent('<div><p></p><p></p></div>');
    this.assertStableRerender();

    this.runTask(() => {
      this.context.set('v1', "hello");
      this.context.set('v2', "world");
    });
    this.assertContent('<div><p>hello</p><p>world</p></div>');
    this.assertInvariants();

    this.runTask(() => {
      this.context.update({ v1: null, v2: undefined });
    });
    this.assertContent('<div><p></p><p></p></div>');
    this.assertInvariants();
  }

  @template(`<div>{{foo.bar.baz}}</div>`)
  ['renders path expression']() {
    this.render({ foo: { bar: { baz: 'Hello World'} } });

    this.assertStableRerender();

    this.assertContent('<div>Hello World</div>');

    this.runTask(() => this.context.set('foo', { bar: { baz: 'WOOT' } }));

    this.assertContent('<div>WOOT</div>');

    this.runTask(() => this.context.set('foo', { bar: { baz: 'Hello World' } }));

    this.assertContent('<div>Hello World</div>');
  }

  @template(`<div>{{{value}}}</div>`)
  ['updating a single trusting curly']() {
    this.render({ value: '<p>hello world</p>' });

    this.assertStableRerender();

    this.assertContent('<div><p>hello world</p></div>');

    this.runTask(() => this.context.set('value', '<h1>WORD</h1>' ));

    this.assertContent('<div><h1>WORD</h1></div>');

    this.runTask(() => this.context.update({ value: '<p>hello world</p>' }));

    this.assertContent('<div><p>hello world</p></div>');
  }
}
