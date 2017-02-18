import { TestEnvironment, TestDynamicScope, normalizeInnerHTML, getTextContent, equalTokens } from "@glimmer/test-helpers";
import { Template, Simple, AttributeManager } from '@glimmer/runtime';
import { UpdatableReference } from '@glimmer/object-reference';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let env: TestEnvironment, root: HTMLElement;

function compile(template: string) {
  return env.compile(template);
}

function compilesTo(html: string, expected: string=html, context: any={}) {
  let template = compile(html);
  root = rootElement();
  render(template, context);
  equalTokens(root, expected);
}

function rootElement(): HTMLDivElement {
  return env.getDOM().createElement('div') as HTMLDivElement;
}

function commonSetup(customEnv = new TestEnvironment()) {
  env = customEnv; // TODO: Support SimpleDOM
  root = rootElement();
}

function render<T>(template: Template<T>, self: any) {
  let result;
  env.begin();
  let templateIterator = template.render(new UpdatableReference(self), root, new TestDynamicScope());

  do {
    result = templateIterator.next();
  } while (!result.done);

  result = result.value;
  env.commit();
  return result;
}

function module(name: string) {
  return QUnit.module(name, {
    setup() { commonSetup(); }
  });
}

module("Initial render - Simple HTML, inline expressions");

test("HTML text content", function() {
  let template = compile("content");
  render(template, {});

  equalTokens(root, "content");
});

test("HTML tags", function() {
  let template = compile("<h1>hello!</h1><div>content</div>");
  render(template, {});

  equalTokens(root, "<h1>hello!</h1><div>content</div>");
});

test("HTML tags re-rendered", function() {
  let template = compile("<h1>hello!</h1><div>content</div>");
  let result = render(template, {});

  let oldFirstChild = root.firstChild;

  env.begin();
  result.rerender();
  env.commit();

  strictEqual(root.firstChild, oldFirstChild);
  equalTokens(root, "<h1>hello!</h1><div>content</div>");
});

test("HTML attributes", function() {
  let template = compile("<div class='foo' id='bar'>content</div>");
  render(template, {});

  equalTokens(root, '<div class="foo" id="bar">content</div>');
});

test("HTML tag with empty attribute", function() {
  let template = compile("<div class=''>content</div>");
  render(template, {});

  equalTokens(root, "<div class=''>content</div>");
});

test("HTML boolean attribute 'disabled'", function() {
  let template = compile('<input disabled>');
  render(template, {});

  ok(root.firstChild['disabled'], 'disabled without value set as property is true');
});

test("Quoted attribute null values do not disable", function() {
  let template = compile('<input disabled="{{isDisabled}}">');
  render(template, { isDisabled: null });

  equal(root.firstChild['disabled'], false);
  equalTokens(root, '<input />');
});

test("Unquoted attribute expression with null value is not coerced", function() {
  let template = compile('<input disabled={{isDisabled}}>');
  render(template, { isDisabled: null });

  equalTokens(root, '<input>');
});

test("Unquoted attribute values", function() {
  let template = compile('<input value=funstuff>');
  render(template, {});

  let inputNode: any = root.firstChild;

  equal(inputNode.tagName, 'INPUT', 'input tag');
  equal(inputNode.value, 'funstuff', 'value is set as property');
});

test("Unquoted attribute expression with string value is not coerced", function() {
  let template = compile('<input value={{funstuff}}>');
  render(template, {funstuff: "oh my"});

  let inputNode: any = root.firstChild;

  equal(inputNode.tagName, 'INPUT', 'input tag');
  equal(inputNode.value, 'oh my', 'string is set to property');
});

test("Unquoted img src attribute is rendered", function() {
  let template = compile('<img src={{someURL}}>');
  render(template, { someURL: "http://foo.com/foo.png"});

  let imgNode: any = root.firstChild;

  equalTokens(root, '<img src="http://foo.com/foo.png">');
  equal(imgNode.tagName, 'IMG', 'img tag');
  equal(imgNode.src, 'http://foo.com/foo.png', 'string is set to property');
});

test("Unquoted img src attribute is not rendered when set to `null`", function() {
  let template = compile('<img src={{someURL}}>');
  render(template, { someURL: null});

  equalTokens(root, '<img>');
});

test("Unquoted img src attribute is not rendered when set to `undefined`", function() {
  let template = compile('<img src={{someURL}}>');
  render(template, { someURL: undefined });

  equalTokens(root, '<img>');
});

test("Quoted img src attribute is rendered", function() {
  let template = compile('<img src="{{someURL}}">');
  render(template, { someURL: "http://foo.com/foo.png"});

  let imgNode: any = root.firstChild;

  equal(imgNode.tagName, 'IMG', 'img tag');
  equal(imgNode.src, 'http://foo.com/foo.png', 'string is set to property');
});

test("Quoted img src attribute is not rendered when set to `null`", function() {
  let template = compile('<img src="{{someURL}}">');
  render(template, { someURL: null});

  equalTokens(root, '<img>');
});

test("Quoted img src attribute is not rendered when set to `undefined`", function() {
  let template = compile('<img src="{{someURL}}">');
  render(template, { someURL: undefined });

  equalTokens(root, '<img>');
});

test("Unquoted a href attribute is not rendered when set to `null`", function() {
  let template = compile('<a href={{someURL}}></a>');
  render(template, { someURL: null});

  equalTokens(root, '<a></a>');
});

test("Unquoted img src attribute is not rendered when set to `undefined`", function() {
  let template = compile('<a href={{someURL}}></a>');
  render(template, { someURL: undefined});

  equalTokens(root, '<a></a>');
});

test("Attribute expression can be followed by another attribute", function() {
  let template = compile('<div foo="{{funstuff}}" name="Alice"></div>');
  render(template, {funstuff: "oh my"});

  equalTokens(root, '<div name="Alice" foo="oh my"></div>');
});

test("Unquoted attribute with expression throws an exception", function () {
  expect(4);

  QUnit.throws(function() { compile('<img class=foo{{bar}}>'); }, expectedError(1));
  QUnit.throws(function() { compile('<img class={{foo}}{{bar}}>'); }, expectedError(1));
  QUnit.throws(function() { compile('<img \nclass={{foo}}bar>'); }, expectedError(2));
  QUnit.throws(function() { compile('<div \nclass\n=\n{{foo}}&amp;bar ></div>'); }, expectedError(4));

  function expectedError(line) {
    return new Error(
      `An unquoted attribute value must be a string or a mustache, ` +
      `preceeded by whitespace or a '=' character, and ` +
      `followed by whitespace, a '>' character, or '/>' (on line ${line})`
    );
  }
});

test("HTML tag with data- attribute", function() {
  let template = compile("<div data-some-data='foo'>content</div>");
  render(template, {});
  equalTokens(root, '<div data-some-data="foo">content</div>');
});

test("<input> tag with 'checked' attribute", function() {
  let template = compile("<input checked=\"checked\">");
  render(template, {});

  let inputNode = root.firstChild as HTMLInputElement;

  equal(inputNode.tagName, 'INPUT', 'input tag');
  equal(inputNode.checked, true, 'input tag is checked');
});

function shouldBeVoid(tagName) {
  root.innerHTML = "";
  let html = "<" + tagName + " data-foo='bar'><p>hello</p>";
  let template = compile(html);
  render(template, {});

  let tag = '<' + tagName + ' data-foo="bar">';
  let closing = '</' + tagName + '>';
  let extra = "<p>hello</p>";
  html = normalizeInnerHTML(root.innerHTML);

  root = rootElement();

  QUnit.push((html === tag + extra) || (html === tag + closing + extra), html, tag + closing + extra, tagName + " should be a void element");
}

test("Void elements are self-closing", function() {
  let voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";

  voidElements.split(" ").forEach((tagName) => shouldBeVoid(tagName));
});

test("The compiler can handle nesting", function() {
  let html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content';
  let template = compile(html);
  render(template, {});

  equalTokens(root, html);
});

test("The compiler can handle quotes", function() {
  compilesTo('<div>"This is a title," we\'re on a boat</div>');
});

test("The compiler can handle backslashes", function() {
  compilesTo('<div>This is a backslash: \\</div>');
});

test("The compiler can handle newlines", function() {
  compilesTo("<div>common\n\nbro</div>");
});

test("The compiler can handle comments", function() {
  compilesTo("<div>{{! Better not break! }}content</div>", '<div>content</div>', {});
});

test("The compiler can handle HTML comments", function() {
  compilesTo('<div><!-- Just passing through --></div>');
});

test("The compiler can handle HTML comments with mustaches in them", function() {
  compilesTo('<div><!-- {{foo}} --></div>', '<div><!-- {{foo}} --></div>', { foo: 'bar' });
});

test("The compiler can handle HTML comments with complex mustaches in them", function() {
  compilesTo('<div><!-- {{foo bar baz}} --></div>', '<div><!-- {{foo bar baz}} --></div>', { foo: 'bar' });
});

test("The compiler can handle HTML comments with multi-line mustaches in them", function() {
  compilesTo('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
});

test('The compiler can handle comments with no parent element', function() {
  compilesTo('<!-- {{foo}} -->');
});

// TODO: Revisit partial syntax.
// test("The compiler can handle partials in handlebars partial syntax", function() {
//   registerPartial('partial_name', "<b>Partial Works!</b>");
//   compilesTo('<div>{{>partial_name}} Plaintext content</div>', '<div><b>Partial Works!</b> Plaintext content</div>', {});
// });

test("The compiler can handle simple handlebars", function() {
  compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler can handle escaping HTML", function() {
  compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle unescaped HTML", function() {
  compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
});

test("The compiler can handle top-level unescaped HTML", function() {
  compilesTo('{{{html}}}', '<strong>hello</strong>', { html: '<strong>hello</strong>' });
});

function createElement(tag) {
  return env.getDOM().createElement(tag);
}

test("The compiler can handle top-level unescaped tr", function() {
  let template = compile('{{{html}}}');
  let context = { html: '<tr><td>Yo</td></tr>' };
  root = createElement('table') as HTMLTableElement;
  render(template, context);

  equal(root.firstChild['tagName'], 'TBODY', "root tbody is present");
});

test("The compiler can handle top-level unescaped td inside tr contextualElement", function() {
  let template = compile('{{{html}}}');
  let context = { html: '<td>Yo</td>' };
  root = createElement('tr') as HTMLTableRowElement;
  render(template, context);

  equal(root.firstChild['tagName'], 'TD', "root td is returned");
});

test("second render respects whitespace", function () {
  let template = compile('Hello {{ foo }} ');
  render(template, {});

  root = rootElement();
  render(template, {});
  equal(root.childNodes.length, 3, 'fragment contains 3 text nodes');
  equal(getTextContent(root.childNodes[0]), 'Hello ', 'first text node ends with one space character');
  equal(getTextContent(root.childNodes[2]), ' ', 'last text node contains one space character');
});

test("Morphs are escaped correctly", function() {
  env.registerHelper('testing-unescaped', function(params) {
    return params[0];
  });

  env.registerHelper('testing-escaped', function(params, hash) {
    return params[0];
  });

  compilesTo('<div>{{{testing-unescaped "<span>hi</span>"}}}</div>', '<div><span>hi</span></div>');
  compilesTo('<div>{{testing-escaped "<hi>"}}</div>', '<div>&lt;hi&gt;</div>');
});

test("Attributes can use computed values", function() {
  compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});

test("Mountain range of nesting", function() {
  let context = { foo: "FOO", bar: "BAR", baz: "BAZ", boo: "BOO", brew: "BREW", bat: "BAT", flute: "FLUTE", argh: "ARGH" };
  compilesTo('{{foo}}<span></span>', 'FOO<span></span>', context);
  compilesTo('<span></span>{{foo}}', '<span></span>FOO', context);
  compilesTo('<span>{{foo}}</span>{{foo}}', '<span>FOO</span>FOO', context);
  compilesTo('{{foo}}<span>{{foo}}</span>{{foo}}', 'FOO<span>FOO</span>FOO', context);
  compilesTo('{{foo}}<span></span>{{foo}}', 'FOO<span></span>FOO', context);
  compilesTo('{{foo}}<span></span>{{bar}}<span><span><span>{{baz}}</span></span></span>',
             'FOO<span></span>BAR<span><span><span>BAZ</span></span></span>', context);
  compilesTo('{{foo}}<span></span>{{bar}}<span>{{argh}}<span><span>{{baz}}</span></span></span>',
             'FOO<span></span>BAR<span>ARGH<span><span>BAZ</span></span></span>', context);
  compilesTo('{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}',
             'FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH', context);
});

test("Static <div class> is preserved properly", function() {
  compilesTo(`
    <div class="hello world">1</div>
    <div class="goodbye world">2</div>
  `, `
    <div class="hello world">1</div>
    <div class="goodbye world">2</div>
  `);
});

test("Static <option selected> is preserved properly", function() {
  let template = compile(`
    <select>
      <option>1</option>
      <option selected>2</option>
      <option>3</option>
    </select>
  `);
  render(template, {});

  let selectNode: any = root.childNodes[1];

  equal(selectNode.selectedIndex, 1, 'second item is selected');
});

test("Static <option selected> for multi-select is preserved properly", function() {
  let template = compile(`
    <select multiple>
      <option selected>1</option>
      <option selected>2</option>
      <option>3</option>
    </select>
  `);
  render(template, {});

  let selectNode: any = root.childNodes[1];

  let options = selectNode.querySelectorAll('option[selected]');

  equal(options.length, 2, 'two options are selected');
});

test("Dynamic <option selected> is preserved properly", function() {
  let template = compile(`
    <select>
      <option>1</option>
      <option selected={{selected}}>2</option>
      <option>3</option>
    </select>
  `);
  render(template, { selected: true });

  let selectNode: any = root.childNodes[1];

  equal(selectNode.selectedIndex, 1, 'second item is selected');
});

test("Dynamic <option selected> for multi-select is preserved properly", function() {
  let template = compile(`
    <select multiple>
      <option>0</option>
      <option selected={{somethingTrue}}>1</option>
      <option selected={{somethingTruthy}}>2</option>
      <option selected={{somethingUndefined}}>3</option>
      <option selected={{somethingNull}}>4</option>
      <option selected={{somethingFalse}}>5</option>
    </select>
  `);

  render(template, {
    somethingTrue: true,
    somethingTruthy: 'is-true',
    somethingUndefined: undefined,
    somethingNull: null,
    somethingFalse: false
  });

  let selectNode: any = root.childNodes[1];
  let options = Array.prototype.slice.call(selectNode.querySelectorAll('option'));
  let selected = options.filter(option => option.selected);

  equal(selected.length, 2, 'two options are selected');
  equal(selected[0].value, '1', 'first selected item is "1"');
  equal(selected[1].value, '2', 'second selected item is "2"');
});

module("Initial render - simple blocks");

test("The compiler can handle unescaped tr in top of content", function() {
  let template = compile('{{#identity}}{{{html}}}{{/identity}}');
  let context = { html: '<tr><td>Yo</td></tr>' };
  root = createElement('table') as HTMLTableElement;
  render(template, context);

  equal(root.firstChild['tagName'], 'TBODY', "root tbody is present" );
});

test("The compiler can handle unescaped tr inside fragment table", function() {
  let template = compile('<table>{{#identity}}{{{html}}}{{/identity}}</table>');
  let context = { html: '<tr><td>Yo</td></tr>' };
  render(template, context);
  let tableNode = root.firstChild;

  equal( tableNode.firstChild['tagName'], 'TBODY', "root tbody is present" );
});

module("Initial render - inline helpers");

test("The compiler can handle simple helpers", function() {
  env.registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("GH#13999 The compiler can handle simple helpers with inline null parameter", function() {
  let value;
  env.registerHelper('say-hello', function(params) {
    value = params[0];
    return 'hello';
  });

  compilesTo('<div>{{say-hello null}}</div>', '<div>hello</div>');
  strictEqual(value, null, 'is null');
});

test("GH#13999 The compiler can handle simple helpers with inline string literal null parameter", function() {
  let value;
  env.registerHelper('say-hello', function(params) {
    value = params[0];
    return 'hello';
  });

  compilesTo('<div>{{say-hello "null"}}</div>', '<div>hello</div>');
  strictEqual(value, 'null', 'is null string literal');
});

test("GH#13999 The compiler can handle simple helpers with inline undefined parameter", function() {
  let value = 'PLACEHOLDER';
  let length;
  env.registerHelper('say-hello', function(params) {
    length = params.length;
    value = params[0];
    return 'hello';
  });

  compilesTo('<div>{{say-hello undefined}}</div>', '<div>hello</div>');
  strictEqual(length, 1);
  strictEqual(value, undefined, 'is undefined');
});

test("GH#13999 The compiler can handle simple helpers with positional parameter undefined string literal", function() {
  let value = 'PLACEHOLDER';
  let length;
  env.registerHelper('say-hello', function(params) {
    length = params.length;
    value = params[0];
    return 'hello';
  });

  compilesTo('<div>{{say-hello "undefined"}} undefined</div>', '<div>hello undefined</div>');
  strictEqual(length, 1);
  strictEqual(value, 'undefined', 'is undefined string literal');
});

test("GH#13999 The compiler can handle components with undefined named arguments", function() {
  let value = 'PLACEHOLDER';
  env.registerHelper('say-hello', function(_, hash) {
    value = hash['foo'];
    return 'hello';
  });

  compilesTo('<div>{{say-hello foo=undefined}}</div>', '<div>hello</div>');
  strictEqual(value, undefined, 'is undefined');
});

test("GH#13999 The compiler can handle components with undefined string literal named arguments", function() {
  let value = 'PLACEHOLDER';
  env.registerHelper('say-hello', function(_, hash) {
    value = hash['foo'];
    return 'hello';
  });

  compilesTo('<div>{{say-hello foo="undefined"}}</div>', '<div>hello</div>');
  strictEqual(value, 'undefined', 'is undefined string literal');
});

test("GH#13999 The compiler can handle components with null named arguments", function() {
  let value;
  env.registerHelper('say-hello', function(_, hash) {
    value = hash['foo'];
    return 'hello';
  });

  compilesTo('<div>{{say-hello foo=null}}</div>', '<div>hello</div>');
  strictEqual(value, null, 'is null');
});

test("GH#13999 The compiler can handle components with null string literal named arguments", function() {
  let value;
  env.registerHelper('say-hello', function(_, hash) {
    value = hash['foo'];
    return 'hello';
  });

  compilesTo('<div>{{say-hello foo="null"}}</div>', '<div>hello</div>');
  strictEqual(value, 'null', 'is null string literal');
});

test("GH#13999 The compiler can handle components with undefined named arguments", function() {
  env.registerHelper('say-hello', function() {
    return 'hello';
  });

  compilesTo('<div>{{say-hello foo=undefined}}</div>', '<div>hello</div>');
});

test("Null curly in attributes", function() {
  compilesTo('<div class="foo {{null}}">hello</div>', '<div class="foo ">hello</div>');
});

test("Null in primitive syntax", function() {
  compilesTo('{{#if null}}NOPE{{else}}YUP{{/if}}', 'YUP');
});

test("The compiler can handle sexpr helpers", function() {
  env.registerHelper('testing', function(params) {
    return params[0] + "!";
  });

  compilesTo('<div>{{testing (testing "hello")}}</div>', '<div>hello!!</div>', {});
});

test("The compiler can handle multiple invocations of sexprs", function() {
  env.registerHelper('testing', function(params) {
    return "" + params[0] + params[1];
  });

  compilesTo(
    '<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>',
    '<div>helloFOOBARlolBAZ</div>',
    { foo: "FOO", bar: "BAR", baz: "BAZ" }
  );
});

test("The compiler passes along the hash arguments", function() {
  env.registerHelper('testing', function(params, hash) {
    return hash['first'] + '-' + hash['second'];
  });

  compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
});

// test("Attributes can use computed paths", function() {
//   compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
// });

/*

test("It is possible to use RESOLVE_IN_ATTR for data binding", function() {
  let callback;

  registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
    return boundValue(function(c) {
      callback = c;
      return this[parts[0]];
    }, this);
  });

  let object = { url: 'linky.html' };
  let fragment = compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', object);

  object.url = 'clippy.html';
  callback();

  equalTokens(fragment, '<a href="clippy.html">linky</a>');

  object.url = 'zippy.html';
  callback();

  equalTokens(fragment, '<a href="zippy.html">linky</a>');
});
*/

test("Attributes can be populated with helpers that generate a string", function() {
  env.registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
/*
test("A helper can return a stream for the attribute", function() {
  env.registerHelper('testing', function(path, options) {
    return streamValue(this[path]);
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
*/
test("Attribute helpers take a hash", function() {
  env.registerHelper('testing', function(params, hash) {
    return hash['path'];
  });

  compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});
/*
test("Attribute helpers can use the hash for data binding", function() {
  let callback;

  env.registerHelper('testing', function(path, hash, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path] ? hash.truthy : hash.falsy;
    }, this);
  });

  let object = { on: true };
  let fragment = compilesTo('<div class="{{testing on truthy="yeah" falsy="nope"}}">hi</div>', '<div class="yeah">hi</div>', object);

  object.on = false;
  callback();
  equalTokens(fragment, '<div class="nope">hi</div>');
});
*/
test("Attributes containing multiple helpers are treated like a block", function() {
  env.registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo(
    '<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>',
    '<a href="http://foo.com/bar/baz">linky</a>',
    { foo: 'foo.com', bar: 'bar' }
  );
});

test("Attributes containing a helper are treated like a block", function() {
  expect(2);

  env.registerHelper('testing', function(params) {
    deepEqual(params, [123]);
    return "example.com";
  });

  compilesTo(
    '<a href="http://{{testing 123}}/index.html">linky</a>',
    '<a href="http://example.com/index.html">linky</a>',
    { person: { url: 'example.com' } }
  );
});
/*
test("It is possible to trigger a re-render of an attribute from a child resolution", function() {
  let callback;

  env.registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  let context = { url: "example.com" };
  let fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("A child resolution can pass contextual information to the parent", function() {
  let callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  let context = { url: "example.com" };
  let fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("Attribute runs can contain helpers", function() {
  let callbacks = [];

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callbacks.push(c);
      return this[path];
    }, this);
  });

  registerHelper('testing', function(path, options) {
    return boundValue(function(c) {
      callbacks.push(c);

      if (options.paramTypes[0] === 'id') {
        return this[path] + '.html';
      } else {
        return path;
      }
    }, this);
  });

  let context = { url: "example.com", path: 'index' };
  let fragment = compilesTo(
    '<a href="http://{{url}}/{{testing path}}/{{testing "linky"}}">linky</a>',
    '<a href="http://example.com/index.html/linky">linky</a>',
    context
  );

  context.url = "www.example.com";
  context.path = "yep";
  forEach(callbacks, function(callback) { callback(); });

  equalTokens(fragment, '<a href="http://www.example.com/yep.html/linky">linky</a>');

  context.url = "nope.example.com";
  context.path = "nope";
  forEach(callbacks, function(callback) { callback(); });

  equalTokens(fragment, '<a href="http://nope.example.com/nope.html/linky">linky</a>');
});
*/
test("Elements inside a yielded block", function() {
  compilesTo('{{#identity}}<div id="test">123</div>{{/identity}}', '<div id="test">123</div>');
});

test("A simple block helper can return text", function() {
  compilesTo('{{#identity}}test{{else}}not shown{{/identity}}', 'test');
});

test("A block helper can have an else block", function() {
  compilesTo('{{#render-inverse}}Nope{{else}}<div id="test">123</div>{{/render-inverse}}', '<div id="test">123</div>');
});

module("Initial render - miscellaneous");

test('Components - Unknown helpers fall back to elements', function () {
  let object = { size: 'med', foo: 'b' };
  compilesTo('<x-bar class="btn-{{size}}">a{{foo}}c</x-bar>','<x-bar class="btn-med">abc</x-bar>', object);
});

test('Components - Text-only attributes work', function () {
  let object = { foo: 'qux' };
  compilesTo('<x-bar id="test">{{foo}}</x-bar>','<x-bar id="test">qux</x-bar>', object);
});

test('Components - Empty components work', function () {
  compilesTo('<x-bar></x-bar>','<x-bar></x-bar>', {});
});

test('Components - Text-only dashed attributes work', function () {
  let object = { foo: 'qux' };
  compilesTo('<x-bar aria-label="foo" id="test">{{foo}}</x-bar>','<x-bar aria-label="foo" id="test">qux</x-bar>', object);
});

test('Repaired text nodes are ensured in the right place', function () {
  let object = { a: "A", b: "B", c: "C", d: "D" };
  compilesTo('{{a}} {{b}}', 'A B', object);
  compilesTo('<div>{{a}}{{b}}{{c}}wat{{d}}</div>', '<div>ABCwatD</div>', object);
  compilesTo('{{a}}{{b}}<img><img><img><img>', 'AB<img><img><img><img>', object);
});

test("Simple elements can have dashed attributes", function() {
  let template = compile("<div aria-label='foo'>content</div>");
  render(template, {});

  equalTokens(root, '<div aria-label="foo">content</div>');
});

test('Block params in HTML syntax - Throws exception if given zero parameters', function () {
  expect(2);

  QUnit.throws(function() {
    compile('<x-bar as ||>foo</x-bar>');
  }, /Cannot use zero block parameters: 'as \|\|'/);
  QUnit.throws(function() {
    compile('<x-bar as | |>foo</x-bar>');
  }, /Cannot use zero block parameters: 'as \| \|'/);
});

test("Block params in HTML syntax - Throws an error on invalid block params syntax", function() {
  expect(3);

  QUnit.throws(function() {
    compile('<x-bar as |x y>{{x}},{{y}}</x-bar>');
  }, /Invalid block parameters syntax: 'as |x y'/);
  QUnit.throws(function() {
    compile('<x-bar as |x| y>{{x}},{{y}}</x-bar>');
  }, /Invalid block parameters syntax: 'as \|x\| y'/);
  QUnit.throws(function() {
    compile('<x-bar as |x| y|>{{x}},{{y}}</x-bar>');
  }, /Invalid block parameters syntax: 'as \|x\| y\|'/);
});

test("Block params in HTML syntax - Throws an error on invalid identifiers for params", function() {
  expect(3);

  QUnit.throws(function() {
    compile('<x-bar as |x foo.bar|></x-bar>');
  }, /Invalid identifier for block parameters: 'foo\.bar' in 'as \|x foo\.bar|'/);
  QUnit.throws(function() {
    compile('<x-bar as |x "foo"|></x-bar>');
  }, /Syntax error at line 1 col 17: " is not a valid character within attribute names/);
  QUnit.throws(function() {
    compile('<x-bar as |foo[bar]|></x-bar>');
  }, /Invalid identifier for block parameters: 'foo\[bar\]' in 'as \|foo\[bar\]\|'/);
});

module("Initial render (invalid HTML)");

test("A helpful error message is provided for unclosed elements", function() {
  expect(2);

  QUnit.throws(function() {
    compile('\n<div class="my-div" \n foo={{bar}}>\n<span>\n</span>\n');
  }, /Unclosed element `div` \(on line 2\)\./);
  QUnit.throws(function() {
    compile('\n<div class="my-div">\n<span>\n');
  }, /Unclosed element `span` \(on line 3\)\./);
});

test("A helpful error message is provided for unmatched end tags", function() {
  expect(2);

  QUnit.throws(function() {
    compile("</p>");
  }, /Closing tag `p` \(on line 1\) without an open tag\./);
  QUnit.throws(function() {
    compile("<em>{{ foo }}</em> \n {{ bar }}\n</div>");
  }, /Closing tag `div` \(on line 3\) without an open tag\./);
});

test("A helpful error message is provided for end tags for void elements", function() {
  expect(3);

  QUnit.throws(function() {
    compile("<input></input>");
  }, /Invalid end tag `input` \(on line 1\) \(void elements cannot have end tags\)./);
  QUnit.throws(function() {
    compile("<div>\n  <input></input>\n</div>");
  }, /Invalid end tag `input` \(on line 2\) \(void elements cannot have end tags\)./);
  QUnit.throws(function() {
    compile("\n\n</br>");
  }, /Invalid end tag `br` \(on line 3\) \(void elements cannot have end tags\)./);
});

test("A helpful error message is provided for end tags with attributes", function() {
  QUnit.throws(function() {
    compile('<div>\nSomething\n\n</div foo="bar">');
  }, /Invalid end tag: closing tag must not have attributes, in `div` \(on line 4\)\./);
});

test("A helpful error message is provided for mismatched start/end tags", function() {
  QUnit.throws(function() {
    compile("<div>\n<p>\nSomething\n\n</div>");
  }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});

test("error line numbers include comment lines", function() {
  QUnit.throws(function() {
    compile("<div>\n<p>\n{{! some comment}}\n\n</div>");
  }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});

test("error line numbers include mustache only lines", function() {
  QUnit.throws(function() {
    compile("<div>\n<p>\n{{someProp}}\n\n</div>");
  }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});

test("error line numbers include block lines", function() {
  QUnit.throws(function() {
    compile("<div>\n<p>\n{{#some-comment}}\n{{/some-comment}}\n</div>");
  }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});

test("error line numbers include whitespace control mustaches", function() {
  QUnit.throws(function() {
    compile("<div>\n<p>\n{{someProp~}}\n\n</div>{{some-comment}}");
  }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});

test("error line numbers include multiple mustache lines", function() {
  QUnit.throws(function() {
    compile("<div>\n<p>\n{{some-comment}}</div>{{some-comment}}");
  }, /Closing tag `div` \(on line 3\) did not match last open tag `p` \(on line 2\)\./);
});

module("Initial render of namespaced HTML");

test("Namespaced attribute", function() {
  compilesTo("<svg xlink:title='svg-title'>content</svg>");
  let svg = root.firstChild;
  equal(svg.namespaceURI, SVG_NAMESPACE);
  equal(svg.attributes[0].namespaceURI, XLINK_NAMESPACE);
});

test("<svg> tag with case-sensitive attribute", function() {
  let viewBox = '0 0 0 0';
  compilesTo(`<svg viewBox="${viewBox}"></svg>`);
  let svg = root.firstChild as SVGSVGElement;
  equal(svg.namespaceURI, SVG_NAMESPACE);
  equal(svg.getAttribute('viewBox'), viewBox);
});

test("nested element in the SVG namespace", function() {
  let d = 'M 0 0 L 100 100';
  compilesTo(`<svg><path d="${d}"></path></svg>`);
  let svg = root.firstChild as SVGSVGElement;
  let path = svg.firstChild as SVGPathElement;
  equal(svg.namespaceURI, SVG_NAMESPACE);
  equal(path.namespaceURI, SVG_NAMESPACE,
        "creates the path element with a namespace");
  equal(path.getAttribute('d'), d);
});

test("<foreignObject> tag has an SVG namespace", function() {
  compilesTo('<svg><foreignObject>Hi</foreignObject></svg>');
  let svg = root.firstChild;
  let foreignObject = svg.firstChild;
  equal(svg.namespaceURI, SVG_NAMESPACE);
  equal(foreignObject.namespaceURI, SVG_NAMESPACE,
        "creates the foreignObject element with a namespace");
});

test("Namespaced and non-namespaced elements as siblings", function() {
  compilesTo('<svg></svg><svg></svg><div></div>');
  equal(root.childNodes[0].namespaceURI, SVG_NAMESPACE,
        "creates the first svg element with a namespace");
  equal(root.childNodes[1].namespaceURI, SVG_NAMESPACE,
        "creates the second svg element with a namespace");
  equal(root.childNodes[2].namespaceURI, XHTML_NAMESPACE,
        "creates the div element without a namespace");
});

test("Namespaced and non-namespaced elements with nesting", function() {
  compilesTo('<div><svg></svg></div><div></div>');
  let firstDiv = root.firstChild;
  let secondDiv = root.lastChild;
  let svg = firstDiv.firstChild;
  equal(firstDiv.namespaceURI, XHTML_NAMESPACE,
        "first div's namespace is xhtmlNamespace");
  equal(svg.namespaceURI, SVG_NAMESPACE,
        "svg's namespace is svgNamespace");
  equal(secondDiv.namespaceURI, XHTML_NAMESPACE,
        "last div's namespace is xhtmlNamespace");
});

test("Case-sensitive tag has capitalization preserved", function() {
  compilesTo('<svg><linearGradient id="gradient"></linearGradient></svg>');
});

let warnings = 0;

class StyleAttribute extends AttributeManager {
  setAttribute(dom, element, value) {
    warnings++;
    super.setAttribute(dom, element, value);
  }

  updateAttribute() {}
}

const STYLE_ATTRIBUTE = new StyleAttribute('style');

QUnit.module('Style attributes', {
  setup() {
    class StyleEnv extends TestEnvironment {
      attributeFor(element: Simple.Element, attr: string, isTrusting: boolean, namespace?: string): AttributeManager {
        if (attr === 'style' && !isTrusting) {
          return STYLE_ATTRIBUTE;
        }

        return super.attributeFor(element, attr, isTrusting);
      }
    }

    commonSetup(new StyleEnv());

  },
  teardown() {
    warnings = 0;
  }
});

test(`using a static inline style on an element does not give you a warning`, function(assert) {
  let template = compile(`<div style="background: red">Thing</div>`);
  render(template, {});

  assert.strictEqual(warnings, 0);

  equalTokens(root, '<div style="background: red">Thing</div>', "initial render");
});

test(`triple curlies are trusted`, function(assert) {
  let template = compile(`<div foo={{foo}} style={{{styles}}}>Thing</div>`);
  render(template, {styles: 'background: red'});

  assert.strictEqual(warnings, 0);

  equalTokens(root, '<div style="background: red">Thing</div>', "initial render");
});

test(`using a static inline style on an namespaced element does not give you a warning`, function(assert) {
  let template = compile(`<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red" />`);

  render(template, {});

  assert.strictEqual(warnings, 0);

  equalTokens(root, '<svg xmlns:svg="http://www.w3.org/2000/svg" style="background: red"></svg>', "initial render");
});
