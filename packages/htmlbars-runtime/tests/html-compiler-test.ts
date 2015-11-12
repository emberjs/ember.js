import { compile as rawCompile } from "htmlbars-compiler";
import { forEach } from "htmlbars-util";
import { normalizeInnerHTML, getTextContent, equalTokens } from "htmlbars-test-helpers";
import { TestEnvironment } from "./support";
import { Template } from 'htmlbars-runtime';

var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace   = "http://www.w3.org/2000/svg";

let env: TestEnvironment, root: Element;

function registerYieldingHelper(name) {
  env.registerHelper(name, function(params, hash, blocks) { return blocks.template.yield(); });
}

function compile(template: string) {
  return rawCompile(template, { disableComponentGeneration: true });
}

function compilesTo(html: string, expected: string=html, context: any={}) {
  var template = compile(html);
  root = rootElement();
  render(template, context);
  equalTokens(root, expected);
}

function rootElement() {
  return env.getDOM().createElement('div', document.body);
}

function commonSetup() {
  env = new TestEnvironment(window.document); // TODO: Support SimpleDOM
  root = rootElement();
}

function render(template: Template, self: any) {
  return template.render(self, env, { appendTo: root });
}

QUnit.module("HTML-based compiler (output)", {
  beforeEach: commonSetup
});

test("Simple content gets appended properly", function() {
  var template = compile("content");
  render(template, {});

  equalTokens(root, "content");
});

test("Simple elements are created", function() {
  var template = compile("<h1>hello!</h1><div>content</div>");
  render(template, {});

  equalTokens(root, "<h1>hello!</h1><div>content</div>");
});

test("Simple elements can be re-rendered", function() {
  var template = compile("<h1>hello!</h1><div>content</div>");
  let result = render(template, {});

  var oldFirstChild = root.firstChild;

  result.rerender();

  strictEqual(root.firstChild, oldFirstChild);
  equalTokens(root, "<h1>hello!</h1><div>content</div>");
});

test("Simple elements can have attributes", function() {
  var template = compile("<div class='foo' id='bar'>content</div>");
  render(template, {});

  equalTokens(root, '<div class="foo" id="bar">content</div>');
});

test("Simple elements can have an empty attribute", function() {
  var template = compile("<div class=''>content</div>");
  render(template, {});

  equalTokens(root, '<div class="">content</div>');
});

test("presence of `disabled` attribute without value marks as disabled", function() {
  var template = compile('<input disabled>');
  render(template, {});

  ok(root.firstChild.disabled, 'disabled without value set as property is true');
});

test("Null quoted attribute value calls toString on the value", function() {
  var template = compile('<input disabled="{{isDisabled}}">');
  render(template, { isDisabled: null });

  ok(root.firstChild.disabled, 'string of "null" set as property is true');
});

test("Null unquoted attribute value removes that attribute", function() {
  var template = compile('<input disabled={{isDisabled}}>');
  render(template, { isDisabled: null });

  equalTokens(root, '<input>');
});

test("unquoted attribute string is just that", function() {
  var template = compile('<input value=funstuff>');
  render(template, {});

  var inputNode = root.firstChild;

  equal(inputNode.tagName, 'INPUT', 'input tag');
  equal(inputNode.value, 'funstuff', 'value is set as property');
});

test("unquoted attribute expression is string", function() {
  var template = compile('<input value={{funstuff}}>');
  render(template, {funstuff: "oh my"});

  var inputNode = root.firstChild;

  equal(inputNode.tagName, 'INPUT', 'input tag');
  equal(inputNode.value, 'oh my', 'string is set to property');
});

test("unquoted attribute expression works when followed by another attribute", function() {
  var template = compile('<div foo="{{funstuff}}" name="Alice"></div>');
  render(template, {funstuff: "oh my"});

  equalTokens(root, '<div name="Alice" foo="oh my"></div>');
});

test("Unquoted attribute value with multiple nodes throws an exception", function () {
  expect(4);

  QUnit.throws(function() { compile('<img class=foo{{bar}}>'); }, expectedError(1));
  QUnit.throws(function() { compile('<img class={{foo}}{{bar}}>'); }, expectedError(1));
  QUnit.throws(function() { compile('<img \nclass={{foo}}bar>'); }, expectedError(2));
  QUnit.throws(function() { compile('<div \nclass\n=\n{{foo}}&amp;bar ></div>'); }, expectedError(4));

  function expectedError(line) {
    return new Error(
      `An unquoted attribute value must be a string or a mustache, ` +
      `preceeded by whitespace or a '=' character, and ` +
      `followed by whitespace or a '>' character (on line ${line})`
    );
  }
});

test("Simple elements can have arbitrary attributes", function() {
  var template = compile("<div data-some-data='foo'>content</div>");
  render(template, {});
  equalTokens(root, '<div data-some-data="foo">content</div>');
});

test("checked attribute and checked property are present after clone and hydrate", function() {
  var template = compile("<input checked=\"checked\">");
  render(template, {});

  var inputNode = root.firstChild;

  equal(inputNode.tagName, 'INPUT', 'input tag');
  equal(inputNode.checked, true, 'input tag is checked');
});


function shouldBeVoid(tagName) {
  root.innerHTML = "";
  var html = "<" + tagName + " data-foo='bar'><p>hello</p>";
  var template = compile(html);
  render(template, {});

  var tag = '<' + tagName + ' data-foo="bar">';
  var closing = '</' + tagName + '>';
  var extra = "<p>hello</p>";
  html = normalizeInnerHTML(root.innerHTML);

  root = rootElement();

  QUnit.push((html === tag + extra) || (html === tag + closing + extra), html, tag + closing + extra, tagName + " should be a void element");
}

test("Void elements are self-closing", function() {
  var voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";

  forEach(voidElements.split(" "), function(tagName) {
    shouldBeVoid(tagName);
  });
});

test("The compiler can handle nesting", function() {
  var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content';
  var template = compile(html);
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

// REFACTOR TODO: This exists because if we add back boundary nodes (which we
// likely will for now), I don't want to have to change it in a bunch of places
// again.
function firstChild(fragment) {
  return fragment.firstChild;
}

function createElement(tag) {
  return env.getDOM().createElement(tag, document.body);
}

test("The compiler can handle top-level unescaped tr", function() {
  var template = compile('{{{html}}}');
  var context = { html: '<tr><td>Yo</td></tr>' };
  root = createElement('table');
  render(template, context);

  equal(root.firstChild.tagName, 'TBODY', "root tbody is present");
});

test("The compiler can handle top-level unescaped td inside tr contextualElement", function() {
  var template = compile('{{{html}}}');
  var context = { html: '<td>Yo</td>' };
  root = createElement('tr');
  render(template, context);

  equal(root.firstChild.tagName, 'TD', "root td is returned");
});

test("The compiler can handle unescaped tr in top of content", function() {
  env.registerHelper('test', function(params, hash, blocks) {
    return blocks.template.yield();
  });

  var template = compile('{{#test}}{{{html}}}{{/test}}');
  var context = { html: '<tr><td>Yo</td></tr>' };
  root = createElement('table');
  render(template, context);

  equal(root.firstChild.tagName, 'TBODY', "root tbody is present" );
});

test("The compiler can handle unescaped tr inside fragment table", function() {
  env.registerHelper('test', function(params, hash, blocks) {
    return blocks.template.yield();
  });

  var template = compile('<table>{{#test}}{{{html}}}{{/test}}</table>');
  var context = { html: '<tr><td>Yo</td></tr>' };
  render(template, context);
  var tableNode = root.firstChild;

  equal( tableNode.firstChild.tagName, 'TBODY', "root tbody is present" );
});

test("The compiler can handle simple helpers", function() {
  env.registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});

QUnit.skip("Helpers propagate the owner render node", function() {
  env.registerHelper('id', function(params, hash, blocks) {
    return blocks.template.yield();
  });

  var template = compile('<div>{{#id}}<p>{{#id}}<span>{{#id}}{{name}}{{/id}}</span>{{/id}}</p>{{/id}}</div>');
  var context = { name: "Tom Dale" };
  var result = render(template, context);

  equalTokens(root, '<div><p><span>Tom Dale</span></p></div>');

  var rootNode = result.root;
  strictEqual(rootNode, rootNode.childMorphs[0].ownerNode);
  strictEqual(rootNode, rootNode.childMorphs[0].childMorphs[0].ownerNode);
  strictEqual(rootNode, rootNode.childMorphs[0].childMorphs[0].childMorphs[0].ownerNode);
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

  compilesTo('<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>', '<div>helloFOOBARlolBAZ</div>', { foo: "FOO", bar: "BAR", baz: "BAZ" });
});

test("The compiler passes along the hash arguments", function() {
  env.registerHelper('testing', function(params, hash) {
    return hash.first + '-' + hash.second;
  });

  compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
});

test("second render respects whitespace", function () {
  var template = compile('Hello {{ foo }} ');
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

  env.registerHelper('testing-escaped', function(params, hash, blocks) {
    if (blocks && blocks.template) {
      return blocks.template.yield();
    }

    return params[0];
  });

  compilesTo('<div>{{{testing-unescaped "<span>hi</span>"}}}</div>', '<div><span>hi</span></div>');
  compilesTo('<div>{{testing-escaped "<hi>"}}</div>', '<div>&lt;hi&gt;</div>');
  compilesTo('<div>{{#testing-escaped}}<em></em>{{/testing-escaped}}</div>', '<div><em></em></div>');
  //compilesTo('<div><testing-escaped><em></em></testing-escaped></div>', '<div><em></em></div>');
});

test("Attributes can use computed values", function() {
  compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});

test("Mountain range of nesting", function() {
  var context = { foo: "FOO", bar: "BAR", baz: "BAZ", boo: "BOO", brew: "BREW", bat: "BAT", flute: "FLUTE", argh: "ARGH" };
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

// test("Attributes can use computed paths", function() {
//   compilesTo('<a href="{{post.url}}">linky</a>', '<a href="linky.html">linky</a>', { post: { url: 'linky.html' }});
// });

/*

test("It is possible to use RESOLVE_IN_ATTR for data binding", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(parts, options) {
    return boundValue(function(c) {
      callback = c;
      return this[parts[0]];
    }, this);
  });

  var object = { url: 'linky.html' };
  var fragment = compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', object);

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
    return hash.path;
  });

  compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});
/*
test("Attribute helpers can use the hash for data binding", function() {
  var callback;

  env.registerHelper('testing', function(path, hash, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path] ? hash.truthy : hash.falsy;
    }, this);
  });

  var object = { on: true };
  var fragment = compilesTo('<div class="{{testing on truthy="yeah" falsy="nope"}}">hi</div>', '<div class="yeah">hi</div>', object);

  object.on = false;
  callback();
  equalTokens(fragment, '<div class="nope">hi</div>');
});
*/
test("Attributes containing multiple helpers are treated like a block", function() {
  env.registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo('<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>', '<a href="http://foo.com/bar/baz">linky</a>', { foo: 'foo.com', bar: 'bar' });
});

test("Attributes containing a helper are treated like a block", function() {
  expect(2);

  env.registerHelper('testing', function(params) {
    deepEqual(params, [123]);
    return "example.com";
  });

  compilesTo('<a href="http://{{testing 123}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { person: { url: 'example.com' } });
});
/*
test("It is possible to trigger a re-render of an attribute from a child resolution", function() {
  var callback;

  env.registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  var context = { url: "example.com" };
  var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("A child resolution can pass contextual information to the parent", function() {
  var callback;

  registerHelper('RESOLVE_IN_ATTR', function(path, options) {
    return boundValue(function(c) {
      callback = c;
      return this[path];
    }, this);
  });

  var context = { url: "example.com" };
  var fragment = compilesTo('<a href="http://{{url}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', context);

  context.url = "www.example.com";
  callback();

  equalTokens(fragment, '<a href="http://www.example.com/index.html">linky</a>');
});

test("Attribute runs can contain helpers", function() {
  var callbacks = [];

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

  var context = { url: "example.com", path: 'index' };
  var fragment = compilesTo('<a href="http://{{url}}/{{testing path}}/{{testing "linky"}}">linky</a>', '<a href="http://example.com/index.html/linky">linky</a>', context);

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
test("A simple block helper can return the default document fragment", function() {
  registerYieldingHelper('testing');

  compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

// TODO: NEXT
test("A simple block helper can return text", function() {
  registerYieldingHelper('testing');

  compilesTo('{{#testing}}test{{else}}not shown{{/testing}}', 'test');
});

test("A block helper can have an else block", function() {
  env.registerHelper('testing', function(params, hash, options) {
    return options.inverse.yield();
  });

  compilesTo('{{#testing}}Nope{{else}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A block helper can pass a context to be used in the child", function() {
  env.registerHelper('testing', function(params, hash, blocks) {
    var context = { title: 'Rails is omakase' };
    return blocks.template.yield(null, context);
  });

  compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});

test("Block helpers receive hash arguments", function() {
  env.registerHelper('testing', function(params, hash, blocks) {
    if (hash.truth) {
      return blocks.template.yield();
    }
  });

  compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p><!---->');
});

QUnit.skip("Node helpers can modify the node", function() {
  env.registerHelper('testing', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
});

QUnit.skip("Node helpers can modify the node after one node appended by top-level helper", function() {
  env.registerHelper('top-helper', function() {
    return document.createElement('span');
  });
  env.registerHelper('attr-helper', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('<div {{attr-helper}}>Node helpers</div>{{top-helper}}', '<div zomg="zomg">Node helpers</div><span></span>');
});

QUnit.skip("Node helpers can modify the node after one node prepended by top-level helper", function() {
  env.registerHelper('top-helper', function() {
    return document.createElement('span');
  });
  env.registerHelper('attr-helper', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('{{top-helper}}<div {{attr-helper}}>Node helpers</div>', '<span></span><div zomg="zomg">Node helpers</div>');
});

QUnit.skip("Node helpers can modify the node after many nodes returned from top-level helper", function() {
  env.registerHelper('top-helper', function() {
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createElement('span'));
    frag.appendChild(document.createElement('span'));
    return frag;
  });
  env.registerHelper('attr-helper', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo(
    '{{top-helper}}<div {{attr-helper}}>Node helpers</div>',
    '<span></span><span></span><div zomg="zomg">Node helpers</div>' );
});

QUnit.skip("Node helpers can be used for attribute bindings", function() {
  env.registerHelper('testing', function(params, hash, options) {
    var value = hash.href,
        element = options.element;

    element.setAttribute('href', value);
  });

  var object = { url: 'linky.html' };
  var template = compile('<a {{testing href=url}}>linky</a>');
  var result = render(template, object);

  equalTokens(root, '<a href="linky.html">linky</a>');
  object.url = 'zippy.html';

  result.rerender();

  equalTokens(root, '<a href="zippy.html">linky</a>');
});

function equalHash(_actual, expected) {
  let actual = {};
  Object.keys(_actual).forEach(k => actual[k] = _actual[k]);

  QUnit.deepEqual(actual, expected);
}

test('Components - Called as helpers', function () {
  env.registerHelper('x-append', function(params, hash, blocks) {
    equalHash(hash, { text: 'de' });
    blocks.template.yield();
  });
  var object = { bar: 'e', baz: 'c' };
  compilesTo('a<x-append text="d{{bar}}">b{{baz}}</x-append>f','abcf', object);
});

test('Components - Unknown helpers fall back to elements', function () {
  var object = { size: 'med', foo: 'b' };
  compilesTo('<x-bar class="btn-{{size}}">a{{foo}}c</x-bar>','<x-bar class="btn-med">abc</x-bar>', object);
});

test('Components - Text-only attributes work', function () {
  var object = { foo: 'qux' };
  compilesTo('<x-bar id="test">{{foo}}</x-bar>','<x-bar id="test">qux</x-bar>', object);
});

test('Components - Empty components work', function () {
  compilesTo('<x-bar></x-bar>','<x-bar></x-bar>', {});
});

test('Components - Text-only dashed attributes work', function () {
  var object = { foo: 'qux' };
  compilesTo('<x-bar aria-label="foo" id="test">{{foo}}</x-bar>','<x-bar aria-label="foo" id="test">qux</x-bar>', object);
});

test('Repaired text nodes are ensured in the right place', function () {
  var object = { a: "A", b: "B", c: "C", d: "D" };
  compilesTo('{{a}} {{b}}', 'A B', object);
  compilesTo('<div>{{a}}{{b}}{{c}}wat{{d}}</div>', '<div>ABCwatD</div>', object);
  compilesTo('{{a}}{{b}}<img><img><img><img>', 'AB<img><img><img><img>', object);
});

test("Simple elements can have dashed attributes", function() {
  var template = compile("<div aria-label='foo'>content</div>");
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


test('Block params in HTML syntax - Works with a single parameter', function () {
  env.registerHelper('x-bar', function(params, hash, blocks) {
    return blocks.template.yield(['Xerxes']);
  });

  compilesTo('<x-bar as |x|>{{x}}</x-bar>', 'Xerxes', {});
});

test('Block params in HTML syntax - Works with other attributes', function () {
  env.registerHelper('x-bar', function(params, hash) {
    equalHash(hash, {firstName: 'Alice', lastName: 'Smith'});
  });
  let template = compile('<x-bar firstName="Alice" lastName="Smith" as |x y|></x-bar>');
  render(template, {});
});

test('Block params in HTML syntax - Ignores whitespace', function () {
  expect(3);

  env.registerHelper('x-bar', function(params, hash, blocks) {
    return blocks.template.yield(['Xerxes', 'York']);
  });

  compilesTo('<x-bar as |x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
  compilesTo('<x-bar as | x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
  compilesTo('<x-bar as | x y |>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
});

test('Block params in HTML syntax - Helper should know how many block params it was called with', function () {
  expect(4);

  env.registerHelper('count-block-params', function(params, hash, options) {
    equal(options.template.arity, parseInt(hash.count, 10), 'Helpers should receive the correct number of block params in options.template.blockParams.');
  });

  render(compile('<count-block-params count="0"></count-block-params>'), { count: 0 });
  render(compile('<count-block-params count="1" as |x|></count-block-params>'), { count: 1 });
  render(compile('<count-block-params count="2" as |x y|></count-block-params>'), { count: 2 });
  render(compile('<count-block-params count="3" as |x y z|></count-block-params>'), { count: 3 });
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
  }, /Invalid identifier for block parameters: '"foo"' in 'as \|x "foo"|'/);
  QUnit.throws(function() {
    compile('<x-bar as |foo[bar]|></x-bar>');
  }, /Invalid identifier for block parameters: 'foo\[bar\]' in 'as \|foo\[bar\]\|'/);
});

QUnit.module("HTML-based compiler (invalid HTML errors)", {
  beforeEach: commonSetup
});

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

if (document.createElement('div').namespaceURI) {

QUnit.module("HTML-based compiler (output, svg)", {
  beforeEach: commonSetup
});

test("Simple elements can have namespaced attributes", function() {
  var template = compile("<svg xlink:title='svg-title'>content</svg>");
  var svgNode = render(template, {}).fragment.firstChild;

  equalTokens(svgNode, '<svg xlink:title="svg-title">content</svg>');
  equal(svgNode.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
});

test("Simple elements can have bound namespaced attributes", function() {
  var template = compile("<svg xlink:title={{title}}>content</svg>");
  var svgNode = render(template, {title: 'svg-title'}, env).fragment.firstChild;

  equalTokens(svgNode, '<svg xlink:title="svg-title">content</svg>');
  equal(svgNode.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
});

test("SVG element can have capitalized attributes", function() {
  var template = compile("<svg viewBox=\"0 0 0 0\"></svg>");
  var svgNode = render(template, {}).fragment.firstChild;
  equalTokens(svgNode, '<svg viewBox=\"0 0 0 0\"></svg>');
});

test("The compiler can handle namespaced elements", function() {
  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
  var template = compile(html);
  var svgNode = render(template, {}).fragment.firstChild;

  equal(svgNode.namespaceURI, svgNamespace, "creates the svg element with a namespace");
  equalTokens(svgNode, html);
});

test("The compiler sets namespaces on nested namespaced elements", function() {
  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
  var template = compile(html);
  var svgNode = render(template, {}).fragment.firstChild;

  equal( svgNode.childNodes[0].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equalTokens(svgNode, html);
});

test("The compiler sets a namespace on an HTML integration point", function() {
  var html = '<svg><foreignObject>Hi</foreignObject></svg>';
  var template = compile(html);
  var svgNode = render(template, {}).fragment.firstChild;

  equal( svgNode.namespaceURI, svgNamespace,
         "creates the svg element with a namespace" );
  equal( svgNode.childNodes[0].namespaceURI, svgNamespace,
         "creates the foreignObject element with a namespace" );
  equalTokens(svgNode, html);
});

test("The compiler does not set a namespace on an element inside an HTML integration point", function() {
  var html = '<svg><foreignObject><div></div></foreignObject></svg>';
  var template = compile(html);
  var svgNode = render(template, {}).fragment.firstChild;

  equal( svgNode.childNodes[0].childNodes[0].namespaceURI, xhtmlNamespace,
         "creates the div inside the foreignObject without a namespace" );
  equalTokens(svgNode, html);
});

test("The compiler pops back to the correct namespace", function() {
  var html = '<svg></svg><svg></svg><div></div>';
  var template = compile(html);
  var fragment = render(template, {}).fragment;

  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "creates the first svg element with a namespace" );
  equal( fragment.childNodes[1].namespaceURI, svgNamespace,
         "creates the second svg element with a namespace" );
  equal( fragment.childNodes[2].namespaceURI, xhtmlNamespace,
         "creates the div element without a namespace" );
  equalTokens(fragment, html);
});

test("The compiler pops back to the correct namespace even if exiting last child", function () {
  var html = '<div><svg></svg></div><div></div>';
  var fragment = render(compile(html), {}).fragment;

  equal(fragment.firstChild.namespaceURI, xhtmlNamespace, "first div's namespace is xhtmlNamespace");
  equal(fragment.firstChild.firstChild.namespaceURI, svgNamespace, "svg's namespace is svgNamespace");
  equal(fragment.lastChild.namespaceURI, xhtmlNamespace, "last div's namespace is xhtmlNamespace");
});

test("The compiler preserves capitalization of tags", function() {
  var html = '<svg><linearGradient id="gradient"></linearGradient></svg>';
  var template = compile(html);
  var fragment = render(template, {}).fragment;

  equalTokens(fragment, html);
});

test("svg can live with hydration", function() {
  var template = compile('<svg></svg>{{name}}');

  var fragment = render(template, { name: 'Milly' }, env, { contextualElement: document.body }).fragment;

  equal(
    fragment.childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
});

test("top-level unsafe morph uses the correct namespace", function() {
  var template = compile('<svg></svg>{{{foo}}}');
  var fragment = render(template, { foo: '<span>FOO</span>' }).fragment;

  equal(getTextContent(fragment), 'FOO', 'element from unsafe morph is displayed');
  equal(fragment.childNodes[1].namespaceURI, xhtmlNamespace, 'element from unsafe morph has correct namespace');
});

test("nested unsafe morph uses the correct namespace", function() {
  var template = compile('<svg>{{{foo}}}</svg><div></div>');
  var fragment = render(template, { foo: '<path></path>' }).fragment;

  equal(fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace,
        'element from unsafe morph has correct namespace');
});

test("svg can take some hydration", function() {
  var template = compile('<div><svg>{{name}}</svg></div>');

  var fragment = render(template, { name: 'Milly' }).fragment;
  equal(
    fragment.firstChild.childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
  equalTokens( fragment.firstChild, '<div><svg>Milly</svg></div>',
             "html is valid" );
});

test("root svg can take some hydration", function() {
  var template = compile('<svg>{{name}}</svg>');
  var fragment = render(template, { name: 'Milly' }, env).fragment;
  var svgNode = fragment.firstChild;

  equal(
    svgNode.namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
  equalTokens( svgNode, '<svg>Milly</svg>',
             "html is valid" );
});

test("Block helper allows interior namespace", function() {
  var isTrue = true;

  env.registerHelper('testing', function(params, hash, blocks) {
    if (isTrue) {
      return blocks.template.yield();
    } else {
      return blocks.inverse.yield();
    }
  });

  var template = compile('{{#testing}}<svg></svg>{{else}}<div><svg></svg></div>{{/testing}}');

  var fragment = render(template, { isTrue: true }, env, { contextualElement: document.body }).fragment;
  equal(
    firstChild(fragment).namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );

  isTrue = false;
  fragment = render(template, { isTrue: false }, env, { contextualElement: document.body }).fragment;
  equal(
    firstChild(fragment).namespaceURI, xhtmlNamespace,
    "inverse block path has a normal namespace");
  equal(
    firstChild(fragment).firstChild.namespaceURI, svgNamespace,
    "svg namespace inside an element inside a block is present" );
});

test("Block helper allows namespace to bleed through", function() {
  registerYieldingHelper('testing');

  var template = compile('<div><svg>{{#testing}}<circle />{{/testing}}</svg></div>');

  var fragment = render(template, { isTrue: true }, env).fragment;
  var svgNode = fragment.firstChild.firstChild;
  equal( svgNode.namespaceURI, svgNamespace,
         "svg tag has an svg namespace" );
  equal( svgNode.childNodes[0].namespaceURI, svgNamespace,
         "circle tag inside block inside svg has an svg namespace" );
});

test("Block helper with root svg allows namespace to bleed through", function() {
  registerYieldingHelper('testing');

  var template = compile('<svg>{{#testing}}<circle />{{/testing}}</svg>');

  var fragment = render(template, { isTrue: true }, env).fragment;
  var svgNode = fragment.firstChild;
  equal( svgNode.namespaceURI, svgNamespace,
         "svg tag has an svg namespace" );
  equal( svgNode.childNodes[0].namespaceURI, svgNamespace,
         "circle tag inside block inside svg has an svg namespace" );
});

test("Block helper with root foreignObject allows namespace to bleed through", function() {
  registerYieldingHelper('testing');

  var template = compile('<foreignObject>{{#testing}}<div></div>{{/testing}}</foreignObject>');

  var fragment = render(template, { isTrue: true }, env, { contextualElement: document.createElementNS(svgNamespace, 'svg') }).fragment;
  var svgNode = fragment.firstChild;
  equal( svgNode.namespaceURI, svgNamespace,
         "foreignObject tag has an svg namespace" );
  equal( svgNode.childNodes[0].namespaceURI, xhtmlNamespace,
         "div inside morph and foreignObject has xhtml namespace" );
});

}
