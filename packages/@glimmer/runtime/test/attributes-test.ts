import { UpdatableReference } from "@glimmer/object-reference";
import { IteratorResult } from '@glimmer/runtime';
import { equalTokens, TestDynamicScope, TestEnvironment } from "@glimmer/test-helpers";
import { SVG_NAMESPACE, RenderResult, Template, normalizeProperty, clientBuilder } from "@glimmer/runtime";

const { assert, test } = QUnit;

let root: HTMLElement;
let env: TestEnvironment;
let self: UpdatableReference<any>;
let result: RenderResult;

function compile(template: string) {
  return env.compile(template);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = document.createElement('div');
  root.setAttribute('debug-root', 'true');
}

function readDOMAttr(element: Element, attr: string) {
  let isSVG = element.namespaceURI === SVG_NAMESPACE;
  let { type, normalized } = normalizeProperty(element, attr);

  if (isSVG) {
    return element.getAttribute(normalized);
  }

  if (type === 'attr') {
    return element.getAttribute(normalized);
  } {
    return element[normalized];
  }
};

function render(template: Template, context = {}) {
  self = new UpdatableReference(context);
  env.begin();
  let cursor = { element: root, nextSibling: null };
  let templateIterator = template.renderLayout({
    env,
    self,
    cursor,
    builder: clientBuilder(env, cursor),
    dynamicScope: new TestDynamicScope()
  });
  let iteratorResult: IteratorResult<RenderResult>;
  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  env.commit();
  assertInvariants(result);
  return result;
}

function assertInvariants(result: RenderResult, msg?: string) {
  assert.strictEqual(result.firstNode(), root.firstChild, `The firstNode of the result is the same as the root's firstChild${msg ? ': ' + msg : ''}`);
  assert.strictEqual(result.lastNode(), root.lastChild, `The lastNode of the result is the same as the root's lastChild${msg ? ': ' + msg : ''}`);
}

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  env.begin();
  result.rerender();
  env.commit();
}

// used to obtain the resulting property value after assignment
function nativeValueForElementProperty<T extends keyof HTMLElementTagNameMap, P extends keyof HTMLElementTagNameMap[T]>(tagName: T, property: P, value: HTMLElementTagNameMap[T][P]) {
  let element = document.createElement<T>(tagName);
  element[property] = value;
  return element[property];
}

QUnit.module("Attributes", {
  beforeEach: commonSetup
});

test("helpers shadow self", () => {
  env.registerHelper('foo', function() {
    return "hello";
  });

  let template = compile('<div data-test="{{foo}}"></div>');

  let context = { foo: 'bye' };
  render(template, context);

  equalTokens(root, '<div data-test="hello"></div>');

  rerender();

  equalTokens(root, '<div data-test="hello"></div>');

  rerender({ foo: 'bar' });

  equalTokens(root, '<div data-test="hello"></div>');

  rerender({ foo: 'bye' });

  equalTokens(root, '<div data-test="hello"></div>');
});

test("disable updates properly", () => {
  let template = compile('<input disabled={{enabled}} />');

  let context = { enabled: true };
  render(template, context);

  equalTokens(root, '<input disabled />');

  rerender({ enabled: false });

  equalTokens(root, '<input />');

  rerender({ enabled: 'wat' });

  equalTokens(root, '<input disabled />');

  rerender({ enabled: null });

  equalTokens(root, '<input />');

  rerender({ enabled: true });

  equalTokens(root, '<input disabled />');

  rerender({ enabled: undefined });

  equalTokens(root, '<input />');

  rerender({ enabled: true });

  equalTokens(root, '<input disabled />');
});

test("quoted disable is always disabled", () => {
  let template = compile('<input disabled="{{enabled}}" />');

  let context = { enabled: true };
  render(template, context);

  equalTokens(root, '<input disabled />');

  rerender({ enabled: false });

  equalTokens(root, '<input disabled />');

  rerender({ enabled: 'wat' });

  equalTokens(root, '<input disabled />');

  rerender({ enabled: null });

  equalTokens(root, '<input />');

  rerender({ enabled: true });

  equalTokens(root, '<input disabled />');

  rerender({ enabled: undefined });

  equalTokens(root, '<input />');

  rerender({ enabled: true });

  equalTokens(root, '<input disabled />');
});

test("disable without an explicit value is truthy", assert => {
  let template = compile('<input disabled />');

  render(template, {});

  equalTokens(root, '<input disabled />');

  assert.ok(readDOMAttr(root.firstChild as Element, 'disabled'));

  rerender();

  equalTokens(root, '<input disabled />');

  assert.ok(readDOMAttr(root.firstChild as Element, 'disabled'));
});

test("a[href] marks javascript: protocol as unsafe", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');

  rerender();

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');
});

test("a[href] marks javascript: protocol as unsafe, http as safe", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');

  rerender({ foo: 'http://foo.bar' });

  equalTokens(root, '<a href="http://foo.bar"></a>');

  rerender({ foo: 'javascript:foo()' });

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');
});

test("a[href] marks javascript: protocol as unsafe on updates", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'http://foo.bar' };
  render(template, context);

  equalTokens(root, '<a href="http://foo.bar"></a>');

  rerender({ foo: 'javascript:foo()' });

  equalTokens(root, '<a href="unsafe:javascript:foo()"></a>');

  rerender({ foo: 'http://foo.bar' });

  equalTokens(root, '<a href="http://foo.bar"></a>');
});

test("a[href] marks vbscript: protocol as unsafe", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'vbscript:foo()' };
  render(template, context);

  equalTokens(root, '<a href="unsafe:vbscript:foo()"></a>');

  rerender();

  equalTokens(root, '<a href="unsafe:vbscript:foo()"></a>');
});

test("a[href] can be removed by setting to `null`", () => {
  let template = compile('<a href={{foo}}></a>');

  let context = { foo: 'http://foo.bar/derp.jpg' };
  render(template, context);

  equalTokens(root, '<a href="http://foo.bar/derp.jpg"></a>');

  rerender({ foo: null });

  equalTokens(root, '<a></a>');
});

test("a[href] can be removed by setting to `undefined`", () => {
  let template = compile('<a href={{foo}}></a>');

  let context = { foo: 'http://foo.bar/derp.jpg' };
  render(template, context);

  equalTokens(root, '<a href="http://foo.bar/derp.jpg"></a>');

  rerender({ foo: undefined });

  equalTokens(root, '<a></a>');
});

test("img[src] marks javascript: protocol as unsafe", () => {
  let template = compile('<img src="{{foo}}">');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<img src="unsafe:javascript:foo()">');

  rerender();

  equalTokens(root, '<img src="unsafe:javascript:foo()">');
});

test("img[src] marks javascript: protocol as unsafe on updates", () => {
  let template = compile('<img src="{{foo}}">');

  let context = { foo: 'http://foo.bar/derp.jpg' };
  render(template, context);

  equalTokens(root, '<img src="http://foo.bar/derp.jpg">');

  rerender({ foo: 'javascript:foo()' });

  equalTokens(root, '<img src="unsafe:javascript:foo()">');

  rerender();

  equalTokens(root, '<img src="unsafe:javascript:foo()">');
});

test("img[src] marks javascript: protocol as unsafe, http as safe", () => {
  let template = compile('<img src="{{foo}}">');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<img src="unsafe:javascript:foo()">');

  rerender({ foo: 'http://foo.bar' });

  equalTokens(root, '<img src="http://foo.bar">');

  rerender({ foo: 'javascript:foo()' });

  equalTokens(root, '<img src="unsafe:javascript:foo()">');
});

test("img[src] marks vbscript: protocol as unsafe", () => {
  let template = compile('<img src="{{foo}}">');

  let context = { foo: 'vbscript:foo()' };
  render(template, context);

  equalTokens(root, '<img src="unsafe:vbscript:foo()">');

  rerender();

  equalTokens(root, '<img src="unsafe:vbscript:foo()">');
});

test("img[src] can be removed by setting to `null`", () => {
  let template = compile('<img src={{foo}}>');

  let context = { foo: 'http://foo.bar/derp.jpg' };
  render(template, context);

  equalTokens(root, '<img src="http://foo.bar/derp.jpg">');

  rerender({ foo: null });

  equalTokens(root, '<img>');
});

test("img[src] can be removed by setting to `undefined`", () => {
  let template = compile('<img src={{foo}}>');

  let context = { foo: 'http://foo.bar/derp.jpg' };
  render(template, context);

  equalTokens(root, '<img src="http://foo.bar/derp.jpg">');

  rerender({ foo: undefined });

  equalTokens(root, '<img>');
});

test("div[href] is not not marked as unsafe", () => {
  let template = compile('<div href="{{foo}}"></div>');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<div href="javascript:foo()"></div>');

  rerender();

  equalTokens(root, '<div href="javascript:foo()"></div>');
});

test("triple curlies in attribute position", () => {

  let template = compile('<div data-bar="bar" data-foo={{{rawString}}}>Hello</div>');

  render(template, { rawString: 'TRIPLE' });

  equalTokens(root, '<div data-foo="TRIPLE" data-bar="bar">Hello</div>', "initial render");

  rerender({ rawString: 'DOUBLE' });

  equalTokens(root, '<div data-foo="DOUBLE" data-bar="bar">Hello</div>', "initial render");
});

test('can read attributes', assert => {
  let template = compile('<div data-bar="bar"></div>');

  render(template);

  assert.equal(readDOMAttr(root.firstChild as Element, 'data-bar'), 'bar');
});

test('can read attributes from namespace elements', assert => {
  let template = compile('<svg viewBox="0 0 0 0"></svg>');

  render(template);

  assert.equal(readDOMAttr(root.firstChild as Element, 'viewBox'), '0 0 0 0');
});

test('can read properties', assert => {
  let template = compile('<input value="gnargnar" />');

  render(template);

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'gnargnar');
});

test('handles null input values', assert => {
  let template = compile('<input value={{isNull}} />');

  render(template, { isNull: null });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ isNull: 'hey' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'hey');

  rerender({ isNull: null });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});

test('handles undefined input values', assert => {
  let template = compile('<input value={{isUndefined}} />');

  render(template, { isUndefined: undefined });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ isUndefined: 'hey' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'hey');

  rerender({ isUndefined: undefined });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});

test('handles undefined `toString` input values', assert => {
  let obj = Object.create(null);
  let template = compile('<input value={{obj}} />');

  render(template, { obj });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ obj: 'hello' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'hello');

  rerender({ obj });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});

test('input[checked] prop updates when set to undefined', assert => {
  let template = compile('<input checked={{if foo true undefined}} />');

  env.registerHelper('if', (params) => {
    if (params[0]) {
      return params[1];
    } else {
      return params[2];
    }
  });

  render(template, { foo: true });

  assert.equal(readDOMAttr(root.firstChild as Element, 'checked'), true);

  rerender({ foo: false });

  assert.equal(readDOMAttr(root.firstChild as Element, 'checked'), false);

  rerender({ foo: true });

  assert.equal(readDOMAttr(root.firstChild as Element, 'checked'), true);
});

test('input[checked] prop updates when set to null', assert => {
  let template = compile('<input checked={{foo}} />');

  render(template, { foo: true });

  assert.equal(readDOMAttr(root.firstChild as Element, 'checked'), true);

  rerender({ foo: null });

  assert.equal(readDOMAttr(root.firstChild as Element, 'checked'), false);

  rerender({ foo: true });

  assert.equal(readDOMAttr(root.firstChild as Element, 'checked'), true);
});

test('select[value] prop updates when set to undefined', assert => {
  let template = compile('<select value={{foo}}><option></option><option value="us" selected>us</option></select>');

  // setting `select[value]` only works after initial render, just use `undefined` here but it doesn't really matter
  render(template, { foo: undefined });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'us');

  // now setting the `value` property will have an effect
  rerender({ foo: null });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ foo: 'us' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'us');
});

test('handles empty string textarea values', assert => {
  let template = compile('<textarea value={{name}} />');

  render(template, { name: '' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');

  rerender({ name: 'Alex' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), 'Alex');

  rerender({ name: '' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'value'), '');
});

test('handles empty string input placeholders', assert => {
  let template = compile('<input type="text" placeholder={{name}} />');

  render(template, { name: '' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'placeholder'), '');

  rerender({ name: 'Alex' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'placeholder'), 'Alex');

  rerender({ name: '' });

  assert.equal(readDOMAttr(root.firstChild as Element, 'placeholder'), '');
});

test('does not set undefined attributes', assert => {
  let template = compile('<div data-foo={{isUndefined}} /><div data-foo={{isNotUndefined}} />');

  render(template, { isUndefined: undefined, isNotUndefined: 'hello' });

  let firstElement = root.firstChild as Element;
  let secondElement = root.lastChild as Element;

  assert.ok(!firstElement.hasAttribute('data-foo'));
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'hello');

  rerender({ isUndefined: 'hey', isNotUndefined: 'hello' });

  assert.ok(firstElement.hasAttribute('data-foo'));
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'hello');

  rerender({ isUndefined: 'hey', isNotUndefined: 'world' });

  assert.ok(firstElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(firstElement, 'data-foo'), 'hey');
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'world');

  rerender({ isUndefined: undefined, isNotUndefined: 'hello' });

  assert.ok(!firstElement.hasAttribute('data-foo'));
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'hello');
});

test('does not set null attributes', assert => {
  let template = compile('<div data-foo={{isNull}} /><div data-foo={{isNotNull}}></div>');

  render(template, { isNull: null, isNotNull: 'hello' });

  let firstElement = root.firstChild as Element;
  let secondElement = root.lastChild as Element;

  assert.ok(!firstElement.hasAttribute('data-foo'));
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'hello');

  rerender({ isNull: 'hey', isNotNull: 'hello' });

  assert.ok(firstElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(firstElement, 'data-foo'), 'hey');
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'hello');

  rerender({ isNull: 'hey', isNotNull: 'world' });

  assert.ok(firstElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(firstElement, 'data-foo'), 'hey');
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'world');

  rerender({ isNull: null, isNotNull: 'hello' });

  assert.ok(!firstElement.hasAttribute('data-foo'));
  assert.ok(secondElement.hasAttribute('data-foo'));
  assert.equal(readDOMAttr(secondElement, 'data-foo'), 'hello');
});

test('does not set undefined properties initially', assert => {
  let template = compile('<div title={{isUndefined}} /><div title={{isNotUndefined}}></div>');

  render(template, { isUndefined: undefined, isNotUndefined: 'hello' });

  let firstElement = root.firstChild as Element;
  let secondElement = root.lastChild as Element;

  assert.ok(!firstElement.hasAttribute('title'));
  assert.equal(readDOMAttr(secondElement, 'title'), 'hello');
  equalTokens(root, '<div></div><div title="hello"></div>');

  rerender({ isUndefined: 'hey', isNotUndefined: 'hello' });

  assert.equal(readDOMAttr(firstElement, 'title'), 'hey');
  assert.equal(readDOMAttr(secondElement, 'title'), 'hello');
  equalTokens(root, '<div title="hey"></div><div title="hello"></div>');

  rerender({ isUndefined: 'hey', isNotUndefined: 'world' });

  assert.equal(readDOMAttr(firstElement, 'title'), 'hey');
  assert.equal(readDOMAttr(secondElement, 'title'), 'world');
  equalTokens(root, '<div title="hey"></div><div title="world"></div>');

  rerender({ isUndefined: undefined, isNotUndefined: 'hello' });

  assert.equal(readDOMAttr(secondElement, 'title'), 'hello');
  assert.equal(readDOMAttr(firstElement, 'title'), '');
  assert.equal(readDOMAttr(firstElement, 'title'), nativeValueForElementProperty('div', 'title', ''));
  equalTokens(root, '<div></div><div title="hello"></div>');
});

test('does not set null properties initially', assert => {
  let template = compile('<div title={{isNull}} /><div title={{isNotNull}}></div>');

  render(template, { isNull: null, isNotNull: 'hello' });

  let firstElement = root.firstChild as Element;
  let secondElement = root.lastChild as Element;

  assert.ok(!firstElement.hasAttribute('title'));
  assert.equal(readDOMAttr(secondElement, 'title'), 'hello');
  equalTokens(root, '<div></div><div title="hello"></div>');

  rerender({ isNull: 'hey', isNotNull: 'hello' });

  assert.equal(readDOMAttr(firstElement, 'title'), 'hey');
  assert.equal(readDOMAttr(secondElement, 'title'), 'hello');
  equalTokens(root, '<div title="hey"></div><div title="hello"></div>');

  rerender({ isNull: 'hey', isNotNull: 'world' });

  assert.equal(readDOMAttr(firstElement, 'title'), 'hey');
  assert.equal(readDOMAttr(secondElement, 'title'), 'world');
  equalTokens(root, '<div title="hey"></div><div title="world"></div>');

  rerender({ isNull: null, isNotNull: 'hello' });

  assert.equal(readDOMAttr(secondElement, 'title'), 'hello');
  assert.equal(readDOMAttr(firstElement, 'title'), '');
  assert.equal(readDOMAttr(firstElement, 'title'), nativeValueForElementProperty('div', 'title', ''));
  equalTokens(root, '<div></div><div title="hello"></div>');
});

test("input list attribute updates properly", () => {
  let template = compile('<input list="{{foo}}" />');

  let context = { foo: "bar" };
  render(template, context);

  equalTokens(root, '<input list="bar" />');

  rerender({ foo: "baz" });

  equalTokens(root, '<input list="baz" />');

  rerender({ foo: "bar" });

  equalTokens(root, '<input list="bar" />');
});
