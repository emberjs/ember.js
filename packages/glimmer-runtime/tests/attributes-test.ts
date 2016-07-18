import { Template, RenderResult, readDOMAttr } from "glimmer-runtime";
import { TestEnvironment, TestDynamicScope, equalTokens } from "glimmer-test-helpers";
import { PathReference } from "glimmer-reference";
import { UpdatableReference } from "glimmer-object-reference";
import { Opaque } from "glimmer-util";

let root: Element;
let env: TestEnvironment;
let self: UpdatableReference<any>;
let result: RenderResult;

function compile(template: string) {
  return env.compile(template);
}

function rootElement() {
  return env.getDOM().createElement('div', document.body);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = rootElement();
  root.setAttribute('debug-root', 'true');
}

function render(template: Template, context = {}, view: PathReference<Opaque> = null) {
  let options = { appendTo: root, dynamicScope: new TestDynamicScope(view) };
  self = new UpdatableReference(context);
  result = template.render(self, env, options);
  assertInvariants(result);
  return result;
}

function assertInvariants(result, msg?) {
  strictEqual(result.firstNode(), root.firstChild, `The firstNode of the result is the same as the root's firstChild${msg ? ': ' + msg : ''}`);
  strictEqual(result.lastNode(), root.lastChild, `The lastNode of the result is the same as the root's lastChild${msg ? ': ' + msg : ''}`);
}

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  result.rerender();
}

QUnit.module("Attributes", {
  setup: commonSetup
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

test("a[href] marks vbscript: protocol as unsafe", () => {
  let template = compile('<a href="{{foo}}"></a>');

  let context = { foo: 'vbscript:foo()' };
  render(template, context);

  equalTokens(root, '<a href="unsafe:vbscript:foo()"></a>');

  rerender();

  equalTokens(root, '<a href="unsafe:vbscript:foo()"></a>');
});

test("div[href] is not not marked as unsafe", () => {
  let template = compile('<div href="{{foo}}"></div>');

  let context = { foo: 'javascript:foo()' };
  render(template, context);

  equalTokens(root, '<div href="javascript:foo()"></div>');

  rerender();

  equalTokens(root, '<div href="javascript:foo()"></div>');
});

test("triple curlies in attribute position", assert => {

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
