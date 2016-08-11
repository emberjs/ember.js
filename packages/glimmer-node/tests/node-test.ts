import * as QUnit from 'qunitjs';
import * as SimpleDOM from 'simple-dom';

import { TestEnvironment, TestDynamicScope} from "glimmer-test-helpers/lib/environment";
import { Template } from 'glimmer-runtime';
import { UpdatableReference } from 'glimmer-object-reference';
import NodeDOMChanges from 'glimmer-node/lib/node-dom-helper';

let HTMLSerializer = SimpleDOM.HTMLSerializer;
let voidMap = SimpleDOM.voidMap;

let serializer = new HTMLSerializer(voidMap);

// const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
// const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
// const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let env: TestEnvironment, root: HTMLElement;
let helper: NodeDOMChanges;

function compile(template: string) {
  return env.compile(template);
}

function rootElement(): HTMLDivElement {
  return env.getDOM().createElement('div', new SimpleDOM.Document().body) as HTMLDivElement;
}

function commonSetup() {
  helper = new NodeDOMChanges();
  env = new TestEnvironment(helper); // TODO: Support SimpleDOM
  root = rootElement();
}

function render(template: Template, self: any) {
  return template.render(new UpdatableReference(self), env, { appendTo: root, dynamicScope: new TestDynamicScope(null) });
}

function module(name: string) {
  return QUnit.module(name, {
    beforeEach() { commonSetup(); }
  });
}

module("Server-side rendering in Node.js");

QUnit.test("HTML text content", function(assert) {
  let template = compile("content");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), 'content');
});

QUnit.test("HTML tags", function(assert) {
  let template = compile("<h1>hello!</h1><div>content</div>");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), "<h1>hello!</h1><div>content</div>");
});

QUnit.test("HTML tags re-rendered", function(assert) {
  let template = compile("<h1>hello!</h1><div>content</div>");
  let result = render(template, {});

  env.begin();
  result.rerender();
  env.commit();

  assert.equal(serializer.serializeChildren(root), "<h1>hello!</h1><div>content</div>");
});

QUnit.test("HTML attributes", function(assert) {
  let template = compile("<div class='foo' id='bar'>content</div>");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), '<div class="foo" id="bar">content</div>');
});

QUnit.test("HTML tag with empty attribute", function(assert) {
  let template = compile("<div class=''>content</div>");
  render(template, {});

  assert.equal(serializer.serializeChildren(root), "<div class>content</div>");
});

QUnit.test("HTML boolean attribute 'disabled'", function(assert) {
  let template = compile('<input disabled>');
  render(template, {});

  assert.equal(serializer.serializeChildren(root), '<input disabled>', 'disabled without value set as property is true');
});

QUnit.skip("Quoted attribute expression is coerced to a string", function(assert) {
  let template = compile('<input disabled="{{isDisabled}}">');
  render(template, { isDisabled: null });

  assert.equal(serializer.serializeChildren(root), '<input disabled="null">', 'string of "null" set as property');
});

QUnit.test("Unquoted attribute expression with null value is not coerced", function(assert) {
  let template = compile('<input disabled={{isDisabled}}>');
  render(template, { isDisabled: null });

  assert.equal(serializer.serializeChildren(root), '<input>');
});

QUnit.test("Attribute expression can be followed by another attribute", function(assert) {
  let template = compile('<div foo="{{funstuff}}" name="Alice"></div>');
  render(template, {funstuff: "oh my"});

  assert.equal(serializer.serializeChildren(root), '<div foo="oh my" name="Alice"></div>');
});

QUnit.test("HTML tag with data- attribute", function(assert) {
  let template = compile("<div data-some-data='foo'>content</div>");
  render(template, {});

  assert.ok(serializer.serializeChildren(root), '<div data-some-data="foo">content</div>');
});

QUnit.test("The compiler can handle nesting", function(assert) {
  let html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content';
  let template = compile(html);
  render(template, {});

  // Note that the space after the closing div tag is a non-breaking space (Unicode 0xA0)
  assert.equal(serializer.serializeChildren(root), '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content');
});

QUnit.test("The compiler can handle comments", function(assert) {
  let html = '<div><!-- Just passing through --></div>';
  let template = compile(html);
  render(template, {});
  assert.equal(serializer.serializeChildren(root), html);
});

QUnit.test("The compiler can handle HTML comments with mustaches in them", function(assert) {
  let template = compile('<div><!-- {{foo}} --></div>');
  render(template, { foo: 'bar' });

  assert.equal(serializer.serializeChildren(root), '<div><!-- {{foo}} --></div>');
});

QUnit.test("The compiler can handle HTML comments with complex mustaches in them", function(assert) {
  let template = compile('<div><!-- {{foo bar baz}} --></div>');
  render(template, { foo: 'bar' });

  assert.equal(serializer.serializeChildren(root), '<div><!-- {{foo bar baz}} --></div>');
});

QUnit.test("The compiler can handle HTML comments with multi-line mustaches in them", function(assert) {
  let html = '<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>';
  let template = compile(html);
  render(template, { foo: 'bar' });

  assert.equal(serializer.serializeChildren(root), html);
});

QUnit.test("The compiler can handle comments with no parent element", function(assert) {
  let html = '<!-- {{foo}} -->';
  let template = compile(html);
  render(template, { foo: 'bar' });

  assert.equal(serializer.serializeChildren(root), html);
});

QUnit.test("The compiler can handle simple handlebars", function(assert) {
  let template = compile('<div>{{title}}</div>');
  render(template, { title: 'hello' });

  assert.equal(serializer.serializeChildren(root), '<div>hello</div>');
});

QUnit.test("The compiler can handle escaping HTML", function(assert) {
  let template = compile('<div>{{title}}</div>');
  render(template, { title: '<strong>hello</strong>' });

  assert.equal(serializer.serializeChildren(root), '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>');
});

QUnit.test("The compiler can handle unescaped HTML", function(assert) {
  let template = compile('<div>{{{title}}}</div>');
  render(template, { title: '<strong>hello</strong>' });

  assert.equal(serializer.serializeChildren(root), '<div><strong>hello</strong></div>');
});

QUnit.test("Unescaped helpers render correctly", function(assert) {
  env.registerHelper('testing-unescaped', function(params) {
    return params[0];
  });

  let escapedTemplate = compile('{{{testing-unescaped "<span>hi</span>"}}}');

  render(escapedTemplate, {});

  assert.equal(serializer.serialize(root), '<div><span>hi</span></div>');
});

QUnit.test('Null literals do not have representation in DOM', function(assert) {
  let template = compile('{{null}}');

  render(template, {});

  assert.equal(serializer.serialize(root), '<div></div>');
});

QUnit.test("Attributes can be populated with helpers that generate a string", function(assert) {
  env.registerHelper('testing', function(params) {
    return params[0];
  });

  let escapedTemplate = compile('<a href="{{testing url}}">linky</a>');

  render(escapedTemplate, { url: 'linky.html' });

  assert.equal(serializer.serialize(root), '<div><a href="linky.html">linky</a></div>');
});

QUnit.test("Elements inside a yielded block", function(assert) {
  let template = compile('{{#if true}}<div id="test">123</div>{{/if}}');
  render(template, {});
  assert.equal(serializer.serialize(root), '<div><div id="test">123</div></div>');
});

QUnit.test("A simple block helper can return text", function(assert) {
  let template = compile('{{#if true}}test{{else}}not shown{{/if}}');
  render(template, {});
  assert.equal(serializer.serialize(root), '<div>test</div>');
});
