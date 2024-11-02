import type { SimpleElement } from '@glimmer/interfaces';
import { castToBrowser, expect } from '@glimmer/debug-util';
import { normalizeProperty } from '@glimmer/runtime';
import { NS_SVG } from '@glimmer/util';

import { assertingElement, hasAttribute, jitSuite, RenderTest, test, tracked } from '..';

export class AttributesTests extends RenderTest {
  static suiteName = 'Attributes';

  protected readDOMAttr(attr: string, element = this.element.firstChild as SimpleElement) {
    const isSVG = element.namespaceURI === NS_SVG;
    const { type, normalized } = normalizeProperty(element, attr);

    if (isSVG) {
      return element.getAttribute(normalized);
    }

    if (type === 'attr') {
      return element.getAttribute(normalized);
    }

    return (element as any)[normalized];
  }

  protected nativeValueForElementProperty<
    T extends keyof HTMLElementTagNameMap,
    P extends keyof HTMLElementTagNameMap[T],
  >(tagName: T, property: P, value: HTMLElementTagNameMap[T][P]) {
    const element = document.createElement<T>(tagName);
    element[property] = value;
    return element[property];
  }

  @test
  'helpers shadow self'() {
    this.registerHelper('foo', () => {
      return 'hello';
    });

    this.render('<div data-test="{{foo}}"></div>', { foo: 'bye' });
    this.assertHTML('<div data-test="hello"></div>');
    this.assertStableRerender();

    this.rerender({ foo: 'bar' });
    this.assertHTML('<div data-test="hello"></div>');
    this.assertStableNodes();

    this.rerender({ foo: 'bye' });
    this.assertHTML('<div data-test="hello"></div>');
    this.assertStableNodes();
  }

  @test
  'disable updates properly'() {
    this.render('<input disabled={{this.enabled}} />', { enabled: true });
    this.assertHTML('<input disabled />');
    this.assertStableRerender();

    this.rerender({ enabled: false });
    this.assertHTML('<input />');
    this.assertStableNodes();

    this.rerender({ enabled: 'wat' });
    this.assertHTML('<input disabled />');
    this.assertStableNodes();

    this.rerender({ enabled: null });
    this.assertHTML('<input />');
    this.assertStableNodes();

    this.rerender({ enabled: true });
    this.assertHTML('<input disabled />');
    this.assertStableNodes();

    this.rerender({ enabled: undefined });
    this.assertHTML('<input />');
    this.assertStableNodes();

    this.rerender({ enabled: true });
    this.assertHTML('<input disabled />');
    this.assertStableNodes();
  }

  @test
  'Quoted disabled is always disabled if a not-null, not-undefined value is given'() {
    this.render('<input disabled="{{this.enabled}}" />', { enabled: true });
    this.assertHTML('<input disabled />');
    this.assertStableRerender();

    this.rerender({ enabled: false });
    this.assertHTML('<input disabled />');
    this.assertStableNodes();

    this.rerender({ enabled: 'wat' });
    this.assertHTML('<input disabled />');
    this.assertStableNodes();

    this.rerender({ enabled: null });
    this.assertHTML('<input />');
    this.assertStableNodes();

    this.rerender({ enabled: true });
    this.assertHTML('<input disabled />');
    this.assertStableNodes();

    this.rerender({ enabled: undefined });
    this.assertHTML('<input />');
    this.assertStableNodes();

    this.rerender({ enabled: true });
    this.assertHTML('<input disabled />');
    this.assertStableNodes();
  }

  @test
  'disabled without an explicit value is truthy'() {
    this.render('<input disabled />');
    this.assertHTML('<input disabled />');
    this.assert.ok(this.readDOMAttr('disabled'));

    this.assertStableRerender();
    this.assert.ok(this.readDOMAttr('disabled'));
  }

  @test
  'div[href] is not marked as unsafe'() {
    this.render('<div href="{{this.foo}}"></div>', { foo: 'javascript:foo()' });
    this.assertHTML('<div href="javascript:foo()"></div>');
    this.assertStableRerender();

    this.rerender({ foo: 'example.com' });
    this.assertHTML('<div href="example.com"></div>');
    this.assertStableNodes();

    this.rerender({ foo: 'javascript:foo()' });
    this.assertHTML('<div href="javascript:foo()"></div>');
    this.assertStableNodes();
  }

  @test
  'triple curlies in attribute position'() {
    this.render('<div data-bar="bar" data-foo={{{this.rawString}}}>Hello</div>', {
      rawString: 'TRIPLE',
    });
    this.assertHTML('<div data-foo="TRIPLE" data-bar="bar">Hello</div>');
    this.assertStableRerender();

    this.rerender({ rawString: 'DOUBLE' });
    this.assertHTML('<div data-foo="DOUBLE" data-bar="bar">Hello</div>');
    this.assertStableNodes();

    this.rerender({ rawString: 'TRIPLE' });
    this.assertHTML('<div data-foo="TRIPLE" data-bar="bar">Hello</div>');
    this.assertStableNodes();
  }

  @test
  'can read attributes'() {
    this.render('<div data-bar="bar"></div>');
    this.assert.strictEqual(this.readDOMAttr('data-bar'), 'bar');
    this.assertStableRerender();
  }

  @test
  'can read attributes from namespace elements'() {
    this.render('<svg viewBox="0 0 0 0"></svg>');
    this.assert.strictEqual(this.readDOMAttr('viewBox'), '0 0 0 0');
    this.assertStableRerender();
  }

  @test
  'can read properties'() {
    this.render('<input value="gnargnar" />');
    this.assert.strictEqual(this.readDOMAttr('value'), 'gnargnar');
    this.assertStableRerender();
  }

  @test
  'can read the form attribute'() {
    this.render('<button form="gnargnar" />');
    this.assert.strictEqual(this.readDOMAttr('form'), 'gnargnar');
    this.assertStableRerender();
  }

  @test
  'can set attributes on form properties'() {
    this.render('<form id={{this.foo}}></form><output form={{this.foo}}></output>', { foo: 'bar' });

    const outputElement = assertingElement(this.element.lastChild);

    this.assert.ok(hasAttribute(outputElement, 'form'));
    this.assert.strictEqual(this.readDOMAttr('form', outputElement), 'bar');

    this.assertStableRerender();
    this.assertStableNodes();
  }

  @test
  'handles null input values'() {
    this.render('<input value={{this.isNull}} />', { isNull: null });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableRerender();

    this.rerender({ isNull: 'hey' });
    this.assert.strictEqual(this.readDOMAttr('value'), 'hey');
    this.assertStableNodes();

    this.rerender({ isNull: null });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableNodes();
  }

  @test
  'handles undefined input values'() {
    this.render('<input value={{this.isUndefined}} />', { isUndefined: null });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableRerender();

    this.rerender({ isUndefined: 'hey' });
    this.assert.strictEqual(this.readDOMAttr('value'), 'hey');
    this.assertStableNodes();

    this.rerender({ isUndefined: null });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableNodes();
  }

  @test
  'handles undefined `toString` input values'() {
    const obj = Object.create(null);
    this.render('<input value={{this.obj}} />', { obj });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableRerender();

    this.rerender({ obj: 'hello' });
    this.assert.strictEqual(this.readDOMAttr('value'), 'hello');
    this.assertStableNodes();

    this.rerender({ obj });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableNodes();
  }

  @test
  'handles successive updates to the same value'() {
    class Model {
      @tracked value = '';
    }

    const model = new Model();

    this.render('<input value={{this.model.value}} />', { model });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableRerender();

    const inputElement = castToBrowser(
      expect(this.element.firstChild, 'expected input to exist'),
      'input'
    );

    inputElement.value = 'bar';
    this.assert.strictEqual(this.readDOMAttr('value'), 'bar');

    model.value = 'foo';
    this.rerender();
    this.assert.strictEqual(this.readDOMAttr('value'), 'foo');
    this.assertStableNodes();

    inputElement.value = 'bar';
    this.assert.strictEqual(this.readDOMAttr('value'), 'bar');

    model.value = 'foo';
    this.rerender();
    this.assert.strictEqual(this.readDOMAttr('value'), 'foo');
    this.assertStableNodes();
  }

  @test
  'input[checked] prop updates when set to undefined'() {
    this.registerHelper('if', (params) => {
      if (params[0]) {
        return params[1];
      } else {
        return params[2];
      }
    });

    this.render('<input checked={{if this.foo true undefined}} />', { foo: true });
    this.assert.strictEqual(this.readDOMAttr('checked'), true);
    this.assertStableRerender();

    this.rerender({ foo: false });
    this.assert.strictEqual(this.readDOMAttr('checked'), false);
    this.assertStableNodes();

    this.rerender({ foo: true });
    this.assert.strictEqual(this.readDOMAttr('checked'), true);
    this.assertStableNodes();
  }

  @test
  'input[checked] prop updates when set to null'() {
    this.render('<input checked={{this.foo}} />', { foo: true });
    this.assert.strictEqual(this.readDOMAttr('checked'), true);
    this.assertStableRerender();

    this.rerender({ foo: null });
    this.assert.strictEqual(this.readDOMAttr('checked'), false);
    this.assertStableNodes();

    this.rerender({ foo: true });
    this.assert.strictEqual(this.readDOMAttr('checked'), true);
    this.assertStableNodes();
  }

  @test
  'select[value] prop updates when set to undefined'() {
    // setting `select[value]` only works after initial render, just use
    this.render(
      '<select value={{this.foo}}><option></option><option value="us" selected>us</option></select>',
      { foo: undefined }
    );
    this.assert.strictEqual(this.readDOMAttr('value'), 'us');
    this.assertStableRerender();

    // now setting the `value` property will have an effect
    this.rerender({ foo: null });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableNodes();

    this.rerender({ foo: 'us' });
    this.assert.strictEqual(this.readDOMAttr('value'), 'us');
    this.assertStableNodes();
  }

  @test
  'handles empty string textarea values'() {
    this.render('<textarea value={{this.name}} />', { name: '' });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
    this.assertStableRerender();

    // Note: In IE and Edge will insert a TextNode,
    //       thus the nodes are going to be unstable
    this.rerender({ name: 'Alex' });
    this.assert.strictEqual(this.readDOMAttr('value'), 'Alex');

    this.rerender({ name: '' });
    this.assert.strictEqual(this.readDOMAttr('value'), '');
  }

  @test
  'handles empty string input placeholders'() {
    this.render('<input type="text" placeholder={{this.name}} />', { name: '' });
    this.assert.strictEqual(this.readDOMAttr('placeholder'), '');
    this.assertStableRerender();

    this.rerender({ name: 'Alex' });
    this.assert.strictEqual(this.readDOMAttr('placeholder'), 'Alex');

    this.rerender({ name: '' });
    this.assert.strictEqual(this.readDOMAttr('placeholder'), '');
    this.assertStableNodes();
  }

  @test
  'type attribute can be set to non-valid type'() {
    this.render('<input type="yolo" />');
    this.assert.strictEqual(this.readDOMAttr('type'), 'text');
    this.assertStableRerender();

    this.rerender();
    this.assertStableNodes();
  }

  @test
  'does not set undefined attributes'() {
    this.render('<div data-foo={{this.isUndefined}} /><div data-foo={{this.isNotUndefined}} />', {
      isUndefined: undefined,
      isNotUndefined: 'hello',
    });

    const firstElement = assertingElement(this.element.firstChild);
    const secondElement = assertingElement(this.element.lastChild);

    this.assert.notOk(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'hello');
    this.assertStableRerender();

    this.rerender({ isUndefined: 'hey', isNotUndefined: 'hello' });
    this.assert.ok(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'hello');
    this.assertStableNodes();

    this.rerender({ isUndefined: 'hey', isNotUndefined: 'world' });
    this.assert.ok(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'world');
    this.assertStableNodes();

    this.rerender({ isUndefined: undefined, isNotUndefined: 'hello' });
    this.assert.notOk(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'hello');
    this.assertStableNodes();
  }

  @test
  'does not set null attributes'() {
    this.render('<div data-foo={{this.isNull}} /><div data-foo={{this.isNotNull}} />', {
      isNull: null,
      isNotNull: 'hello',
    });

    const firstElement = assertingElement(this.element.firstChild);
    const secondElement = assertingElement(this.element.lastChild);

    this.assert.notOk(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'hello');
    this.assertHTML('<div></div><div data-foo="hello" />');
    this.assertStableRerender();

    this.rerender({ isNull: 'hey', isNotNull: 'hello' });
    this.assert.ok(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'hello');
    this.assertHTML('<div data-foo="hey"></div><div data-foo="hello" />');
    this.assertStableNodes();

    this.rerender({ isNull: 'hey', isNotNull: 'world' });
    this.assert.ok(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'world');
    this.assertHTML('<div data-foo="hey"></div><div data-foo="world" />');
    this.assertStableNodes();

    this.rerender({ isNull: undefined, isNotNull: 'hello' });
    this.assert.notOk(hasAttribute(firstElement, 'data-foo'));
    this.assert.ok(hasAttribute(secondElement, 'data-foo'));
    this.assert.strictEqual(this.readDOMAttr('data-foo', secondElement), 'hello');
    this.assertHTML('<div></div><div data-foo="hello" />');
    this.assertStableNodes();
  }

  @test
  'does not set undefined properties initially'() {
    this.render('<div title={{this.isUndefined}} /><div title={{this.isNotUndefined}} />', {
      isUndefined: undefined,
      isNotUndefined: 'hello',
    });

    const firstElement = assertingElement(this.element.firstChild);
    const secondElement = assertingElement(this.element.lastChild);

    this.assert.notOk(hasAttribute(firstElement, 'title'));
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'hello');
    this.assertHTML('<div></div><div title="hello"></div>');
    this.assertStableRerender();

    this.rerender({ isUndefined: 'hey', isNotUndefined: 'hello' });
    this.assert.strictEqual(this.readDOMAttr('title', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'hello');
    this.assertHTML('<div title="hey"></div><div title="hello"></div>');
    this.assertStableNodes();

    this.rerender({ isUndefined: 'hey', isNotUndefined: 'world' });
    this.assert.strictEqual(this.readDOMAttr('title', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'world');
    this.assertHTML('<div title="hey"></div><div title="world"></div>');
    this.assertStableNodes();

    this.rerender({ isUndefined: undefined, isNotUndefined: 'hello' });
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'hello');
    this.assert.strictEqual(this.readDOMAttr('title', firstElement), '');
    this.assert.strictEqual(
      this.readDOMAttr('title', firstElement),
      this.nativeValueForElementProperty('div', 'title', '')
    );
    this.assertHTML('<div></div><div title="hello"></div>');
  }

  @test
  'does not set null properties initially'() {
    this.render('<div title={{this.isNull}} /><div title={{this.isNotNull}} />', {
      isNull: undefined,
      isNotNull: 'hello',
    });

    const firstElement = assertingElement(this.element.firstChild);
    const secondElement = assertingElement(this.element.lastChild);

    this.assert.notOk(hasAttribute(firstElement, 'title'));
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'hello');
    this.assertHTML('<div></div><div title="hello"></div>');
    this.assertStableRerender();

    this.rerender({ isNull: 'hey', isNotNull: 'hello' });
    this.assert.strictEqual(this.readDOMAttr('title', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'hello');
    this.assertHTML('<div title="hey"></div><div title="hello"></div>');
    this.assertStableNodes();

    this.rerender({ isNull: 'hey', isNotNull: 'world' });
    this.assert.strictEqual(this.readDOMAttr('title', firstElement), 'hey');
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'world');
    this.assertHTML('<div title="hey"></div><div title="world"></div>');
    this.assertStableNodes();

    this.rerender({ isNull: undefined, isNotNull: 'hello' });
    this.assert.strictEqual(this.readDOMAttr('title', secondElement), 'hello');
    this.assert.strictEqual(this.readDOMAttr('title', firstElement), '');
    this.assert.strictEqual(
      this.readDOMAttr('title', firstElement),
      this.nativeValueForElementProperty('div', 'title', '')
    );
    this.assertHTML('<div></div><div title="hello"></div>');
  }

  @test
  'input list attribute updates properly'() {
    this.render('<input list="{{this.foo}}" />', { foo: 'bar' });
    this.assertHTML('<input list="bar" />');
    this.assertStableRerender();

    this.rerender({ foo: 'baz' });
    this.assertHTML('<input list="baz" />');
    this.assertStableNodes();

    this.rerender({ foo: 'bar' });
    this.assertHTML('<input list="bar" />');
    this.assertStableNodes();
  }

  @test
  'normalizes lowercase dynamic properties correctly'() {
    this.render('<div tiTle={{this.foo}} />', { foo: 'bar' });
    this.assertHTML('<div title="bar" />');
    this.assertStableRerender();

    this.rerender({ foo: 'baz' });
    this.assertHTML('<div title="baz" />');
    this.assertStableNodes();

    this.rerender({ foo: 'bar' });
    this.assertHTML('<div title="bar" />');
    this.assertStableNodes();
  }

  @test
  'normalizes mix-case dynamic properties correctly'() {
    this.render('<svg viewBox={{this.foo}} />', { foo: '0 0 100 100' });
    this.assertHTML('<svg viewBox="0 0 100 100" />');
    this.assertStableRerender();

    this.rerender({ foo: '0 0 100 200' });
    this.assertHTML('<svg viewBox="0 0 100 200" />');
    this.assertStableNodes();

    this.rerender({ foo: '0 0 100 100' });
    this.assertHTML('<svg viewBox="0 0 100 100" />');
    this.assertStableNodes();
  }
}

jitSuite(AttributesTests);

abstract class BoundValuesToSpecialAttributeTests extends RenderTest {
  protected abstract tag: string;
  protected abstract attr: string;
  protected isEmptyElement = false;
  protected selfClosing = true;

  @test
  'marks javascript: protocol as unsafe'() {
    this.render(this.tmplt('{{this.foo}}'), {
      foo: 'javascript:foo()',
    });
    this.assertHTML(this.tmplt('unsafe:javascript:foo()'));
    this.assertStableRerender();

    this.rerender({ foo: 'example.com' });
    this.assertHTML(this.tmplt('example.com'));
    this.assertStableNodes();

    this.rerender({ foo: 'javascript:foo()' });
    this.assertHTML(this.tmplt('unsafe:javascript:foo()'));
    this.assertStableNodes();
  }

  @test
  'marks javascript: protocol as unsafe, http as safe'() {
    this.render(this.tmplt('{{this.foo}}'), { foo: 'javascript:foo()' });
    this.assertHTML(this.tmplt('unsafe:javascript:foo()'));
    this.assertStableRerender();

    this.rerender({ foo: 'http://foo.bar' });
    this.assertHTML(this.tmplt('http://foo.bar'));
    this.assertStableNodes();

    this.rerender({ foo: 'javascript:foo()' });
    this.assertHTML(this.tmplt('unsafe:javascript:foo()'));
    this.assertStableNodes();
  }

  @test
  'marks javascript: protocol as unsafe on updates'() {
    this.render(this.tmplt('{{this.foo}}'), { foo: 'http://foo.bar' });
    this.assertHTML(this.tmplt('http://foo.bar', true));
    this.assertStableRerender();

    this.rerender({ foo: 'javascript:foo()' });
    this.assertHTML(this.tmplt('unsafe:javascript:foo()'));
    this.assertStableNodes();

    this.rerender({ foo: 'http://foo.bar' });
    this.assertHTML(this.tmplt('http://foo.bar'));
    this.assertStableNodes();
  }

  @test
  'marks vbscript: protocol as unsafe'() {
    this.render(this.tmplt('{{this.foo}}'), { foo: 'vbscript:foo()' });
    this.assertHTML(this.tmplt('unsafe:vbscript:foo()', true));
    this.assertStableRerender();

    this.rerender({ foo: 'example.com' });
    this.assertHTML(this.tmplt('example.com', true));
    this.assertStableNodes();

    this.rerender({ foo: 'vbscript:foo()' });
    this.assertHTML(this.tmplt('unsafe:vbscript:foo()', true));
    this.assertStableNodes();
  }

  @test
  'can be removed by setting to `null`'() {
    this.render(this.tmplt('{{this.foo}}', false), { foo: 'http://foo.bar/derp.jpg' });
    this.assertHTML(this.tmplt('http://foo.bar/derp.jpg'));
    this.assertStableRerender();

    this.rerender({ foo: null });
    this.assertHTML(this.emptyElementTemplate());
    this.assertStableNodes();

    this.rerender({ foo: 'http://foo.bar/derp.jpg' });
    this.assertHTML(this.tmplt('http://foo.bar/derp.jpg'));
    this.assertStableNodes();
  }

  @test
  'can be removed by setting to `undefined`'() {
    this.render(this.tmplt('{{this.foo}}', false), { foo: 'http://foo.bar/derp.jpg' });
    this.assertHTML(this.tmplt('http://foo.bar/derp.jpg'));
    this.assertStableRerender();

    this.rerender({ foo: undefined });
    this.assertHTML(this.emptyElementTemplate());
    this.assertStableNodes();

    this.rerender({ foo: 'http://foo.bar/derp.jpg' });
    this.assertHTML(this.tmplt('http://foo.bar/derp.jpg'));
    this.assertStableNodes();
  }

  protected emptyElementTemplate(): string {
    let template = `<${this.tag}>`;
    if (!this.isEmptyElement) {
      template += `</${this.tag}>`;
    }

    return template;
  }

  protected tmplt(valueForAttr: string, quoteValue = true): string {
    let value = valueForAttr;
    if (quoteValue) {
      value = `"${value}"`;
    }
    let template = `<${this.tag} ${this.attr}=${value}`;
    if (this.isEmptyElement) {
      if (this.selfClosing) {
        template += ` />`;
      }
    } else {
      template += `></${this.tag}>`;
    }

    return template;
  }
}

jitSuite(
  class extends BoundValuesToSpecialAttributeTests {
    static suiteName = 'a[href] attribute';
    tag = 'a';
    attr = 'href';
  }
);

jitSuite(
  class extends BoundValuesToSpecialAttributeTests {
    static suiteName = 'img[src] attribute';
    protected tag = 'img';
    protected attr = 'src';
    protected override isEmptyElement = true;
    protected isSelfClosing = false;
  }
);
