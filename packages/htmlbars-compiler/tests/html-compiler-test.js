import { compile } from "htmlbars-compiler";
import { forEach } from "htmlbars-util";
import { DOMHelper } from "htmlbars-runtime";
import { normalizeInnerHTML, getTextContent, equalTokens } from "htmlbars-test-helpers";
import { TestEnvironment, TestBaseReference } from "./support";
var xhtmlNamespace = "http://www.w3.org/1999/xhtml", svgNamespace = "http://www.w3.org/2000/svg";
var env, dom, root;
function registerYieldingHelper(name) {
    env.registerHelper(name, function (params, hash, blocks) { return blocks.template.yield(); });
}
function compilesTo(html, expected, context) {
    var template = compile(html);
    root = rootElement();
    render(template, context);
    equalTokens(root, expected === undefined ? html : expected);
}
function rootElement() {
    return dom.createElement('div');
}
function commonSetup() {
    dom = new DOMHelper();
    env = new TestEnvironment({ dom, BaseReference: TestBaseReference });
    root = rootElement();
}
function render(template, self) {
    return template.render(self, env, { appendTo: root });
}
QUnit.module("HTML-based compiler (output)", {
    beforeEach: commonSetup
});
test("Simple content gets appended properly", function () {
    var template = compile("content");
    render(template, {});
    equalTokens(root, "content");
});
test("Simple elements are created", function () {
    var template = compile("<h1>hello!</h1><div>content</div>");
    render(template, {});
    equalTokens(root, "<h1>hello!</h1><div>content</div>");
});
test("Simple elements can be re-rendered", function () {
    var template = compile("<h1>hello!</h1><div>content</div>");
    let result = render(template, {});
    var oldFirstChild = root.firstChild;
    result.revalidate(env);
    strictEqual(root.firstChild, oldFirstChild);
    equalTokens(root, "<h1>hello!</h1><div>content</div>");
});
test("Simple elements can have attributes", function () {
    var template = compile("<div class='foo' id='bar'>content</div>");
    render(template, {});
    equalTokens(root, '<div class="foo" id="bar">content</div>');
});
test("Simple elements can have an empty attribute", function () {
    var template = compile("<div class=''>content</div>");
    render(template, {});
    equalTokens(root, '<div class="">content</div>');
});
test("presence of `disabled` attribute without value marks as disabled", function () {
    var template = compile('<input disabled>');
    render(template, {});
    ok(root.firstChild.disabled, 'disabled without value set as property is true');
});
test("Null quoted attribute value calls toString on the value", function () {
    var template = compile('<input disabled="{{isDisabled}}">');
    render(template, { isDisabled: null });
    ok(root.firstChild.disabled, 'string of "null" set as property is true');
});
test("Null unquoted attribute value removes that attribute", function () {
    var template = compile('<input disabled={{isDisabled}}>');
    render(template, { isDisabled: null });
    equalTokens(root, '<input>');
});
test("unquoted attribute string is just that", function () {
    var template = compile('<input value=funstuff>');
    render(template, {});
    var inputNode = root.firstChild;
    equal(inputNode.tagName, 'INPUT', 'input tag');
    equal(inputNode.value, 'funstuff', 'value is set as property');
});
test("unquoted attribute expression is string", function () {
    var template = compile('<input value={{funstuff}}>');
    render(template, { funstuff: "oh my" });
    var inputNode = root.firstChild;
    equal(inputNode.tagName, 'INPUT', 'input tag');
    equal(inputNode.value, 'oh my', 'string is set to property');
});
test("unquoted attribute expression works when followed by another attribute", function () {
    var template = compile('<div foo={{funstuff}} name="Alice"></div>');
    render(template, { funstuff: "oh my" });
    equalTokens(root, '<div name="Alice" foo="oh my"></div>');
});
test("Unquoted attribute value with multiple nodes throws an exception", function () {
    expect(4);
    QUnit.throws(function () { compile('<img class=foo{{bar}}>'); }, expectedError(1));
    QUnit.throws(function () { compile('<img class={{foo}}{{bar}}>'); }, expectedError(1));
    QUnit.throws(function () { compile('<img \nclass={{foo}}bar>'); }, expectedError(2));
    QUnit.throws(function () { compile('<div \nclass\n=\n{{foo}}&amp;bar ></div>'); }, expectedError(4));
    function expectedError(line) {
        return new Error(`An unquoted attribute value must be a string or a mustache, ` +
            `preceeded by whitespace or a '=' character, and ` +
            `followed by whitespace or a '>' character (on line ${line})`);
    }
});
test("Simple elements can have arbitrary attributes", function () {
    var template = compile("<div data-some-data='foo'>content</div>");
    render(template, {});
    equalTokens(root, '<div data-some-data="foo">content</div>');
});
test("checked attribute and checked property are present after clone and hydrate", function () {
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
test("Void elements are self-closing", function () {
    var voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";
    forEach(voidElements.split(" "), function (tagName) {
        shouldBeVoid(tagName);
    });
});
test("The compiler can handle nesting", function () {
    var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div>&nbsp;More content';
    var template = compile(html);
    render(template, {});
    equalTokens(root, html);
});
test("The compiler can handle quotes", function () {
    compilesTo('<div>"This is a title," we\'re on a boat</div>');
});
test("The compiler can handle backslashes", function () {
    compilesTo('<div>This is a backslash: \\</div>');
});
test("The compiler can handle newlines", function () {
    compilesTo("<div>common\n\nbro</div>");
});
test("The compiler can handle comments", function () {
    compilesTo("<div>{{! Better not break! }}content</div>", '<div>content</div>', {});
});
test("The compiler can handle HTML comments", function () {
    compilesTo('<div><!-- Just passing through --></div>');
});
test("The compiler can handle HTML comments with mustaches in them", function () {
    compilesTo('<div><!-- {{foo}} --></div>', '<div><!-- {{foo}} --></div>', { foo: 'bar' });
});
test("The compiler can handle HTML comments with complex mustaches in them", function () {
    compilesTo('<div><!-- {{foo bar baz}} --></div>', '<div><!-- {{foo bar baz}} --></div>', { foo: 'bar' });
});
test("The compiler can handle HTML comments with multi-line mustaches in them", function () {
    compilesTo('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
});
test('The compiler can handle comments with no parent element', function () {
    compilesTo('<!-- {{foo}} -->');
});
// TODO: Revisit partial syntax.
// test("The compiler can handle partials in handlebars partial syntax", function() {
//   registerPartial('partial_name', "<b>Partial Works!</b>");
//   compilesTo('<div>{{>partial_name}} Plaintext content</div>', '<div><b>Partial Works!</b> Plaintext content</div>', {});
// });
test("The compiler can handle simple handlebars", function () {
    compilesTo('<div>{{title}}</div>', '<div>hello</div>', { title: 'hello' });
});
test("The compiler can handle escaping HTML", function () {
    compilesTo('<div>{{title}}</div>', '<div>&lt;strong&gt;hello&lt;/strong&gt;</div>', { title: '<strong>hello</strong>' });
});
test("The compiler can handle unescaped HTML", function () {
    compilesTo('<div>{{{title}}}</div>', '<div><strong>hello</strong></div>', { title: '<strong>hello</strong>' });
});
test("The compiler can handle top-level unescaped HTML", function () {
    compilesTo('{{{html}}}', '<strong>hello</strong>', { html: '<strong>hello</strong>' });
});
// REFACTOR TODO: This exists because if we add back boundary nodes (which we
// likely will for now), I don't want to have to change it in a bunch of places
// again.
function firstChild(fragment) {
    return fragment.firstChild;
}
test("The compiler can handle top-level unescaped tr", function () {
    var template = compile('{{{html}}}');
    var context = { html: '<tr><td>Yo</td></tr>' };
    root = dom.createElement('table');
    render(template, context);
    equal(root.firstChild.tagName, 'TBODY', "root tbody is present");
});
test("The compiler can handle top-level unescaped td inside tr contextualElement", function () {
    var template = compile('{{{html}}}');
    var context = { html: '<td>Yo</td>' };
    root = dom.createElement('tr');
    render(template, context);
    equal(root.firstChild.tagName, 'TD', "root td is returned");
});
test("The compiler can handle unescaped tr in top of content", function () {
    env.registerHelper('test', function (params, hash, blocks) {
        return blocks.template.yield();
    });
    var template = compile('{{#test}}{{{html}}}{{/test}}');
    var context = { html: '<tr><td>Yo</td></tr>' };
    root = dom.createElement('table');
    render(template, context);
    equal(root.firstChild.tagName, 'TBODY', "root tbody is present");
});
test("The compiler can handle unescaped tr inside fragment table", function () {
    env.registerHelper('test', function (params, hash, blocks) {
        return blocks.template.yield();
    });
    var template = compile('<table>{{#test}}{{{html}}}{{/test}}</table>');
    var context = { html: '<tr><td>Yo</td></tr>' };
    render(template, context);
    var tableNode = root.firstChild;
    equal(tableNode.firstChild.tagName, 'TBODY', "root tbody is present");
});
test("The compiler can handle simple helpers", function () {
    env.registerHelper('testing', function (params) {
        return params[0];
    });
    compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});
QUnit.skip("Helpers propagate the owner render node", function () {
    env.registerHelper('id', function (params, hash, blocks) {
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
test("The compiler can handle sexpr helpers", function () {
    env.registerHelper('testing', function (params) {
        return params[0] + "!";
    });
    compilesTo('<div>{{testing (testing "hello")}}</div>', '<div>hello!!</div>', {});
});
test("The compiler can handle multiple invocations of sexprs", function () {
    env.registerHelper('testing', function (params) {
        return "" + params[0] + params[1];
    });
    compilesTo('<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>', '<div>helloFOOBARlolBAZ</div>', { foo: "FOO", bar: "BAR", baz: "BAZ" });
});
test("The compiler passes along the hash arguments", function () {
    env.registerHelper('testing', function (params, hash) {
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
test("Morphs are escaped correctly", function () {
    env.registerHelper('testing-unescaped', function (params) {
        return params[0];
    });
    env.registerHelper('testing-escaped', function (params, hash, blocks) {
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
test("Attributes can use computed values", function () {
    compilesTo('<a href="{{url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});
test("Mountain range of nesting", function () {
    var context = { foo: "FOO", bar: "BAR", baz: "BAZ", boo: "BOO", brew: "BREW", bat: "BAT", flute: "FLUTE", argh: "ARGH" };
    compilesTo('{{foo}}<span></span>', 'FOO<span></span>', context);
    compilesTo('<span></span>{{foo}}', '<span></span>FOO', context);
    compilesTo('<span>{{foo}}</span>{{foo}}', '<span>FOO</span>FOO', context);
    compilesTo('{{foo}}<span>{{foo}}</span>{{foo}}', 'FOO<span>FOO</span>FOO', context);
    compilesTo('{{foo}}<span></span>{{foo}}', 'FOO<span></span>FOO', context);
    compilesTo('{{foo}}<span></span>{{bar}}<span><span><span>{{baz}}</span></span></span>', 'FOO<span></span>BAR<span><span><span>BAZ</span></span></span>', context);
    compilesTo('{{foo}}<span></span>{{bar}}<span>{{argh}}<span><span>{{baz}}</span></span></span>', 'FOO<span></span>BAR<span>ARGH<span><span>BAZ</span></span></span>', context);
    compilesTo('{{foo}}<span>{{bar}}<a>{{baz}}<em>{{boo}}{{brew}}</em>{{bat}}</a></span><span><span>{{flute}}</span></span>{{argh}}', 'FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH', context);
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
test("Attributes can be populated with helpers that generate a string", function () {
    env.registerHelper('testing', function (params) {
        return params[0];
    });
    compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});
/*
test("A helper can return a stream for the attribute", function() {
  env.registerHelper('testing', function(path, options) {
    return streamValue(this[path]);
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
*/
test("Attribute helpers take a hash", function () {
    env.registerHelper('testing', function (params, hash) {
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
test("Attributes containing multiple helpers are treated like a block", function () {
    env.registerHelper('testing', function (params) {
        return params[0];
    });
    compilesTo('<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>', '<a href="http://foo.com/bar/baz">linky</a>', { foo: 'foo.com', bar: 'bar' });
});
test("Attributes containing a helper are treated like a block", function () {
    expect(2);
    env.registerHelper('testing', function (params) {
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
test("A simple block helper can return the default document fragment", function () {
    registerYieldingHelper('testing');
    compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});
// TODO: NEXT
test("A simple block helper can return text", function () {
    registerYieldingHelper('testing');
    compilesTo('{{#testing}}test{{else}}not shown{{/testing}}', 'test');
});
test("A block helper can have an else block", function () {
    env.registerHelper('testing', function (params, hash, options) {
        return options.inverse.yield();
    });
    compilesTo('{{#testing}}Nope{{else}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});
test("A block helper can pass a context to be used in the child", function () {
    env.registerHelper('testing', function (params, hash, blocks) {
        var context = { title: 'Rails is omakase' };
        return blocks.template.yield(null, context);
    });
    compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});
test("Block helpers receive hash arguments", function () {
    env.registerHelper('testing', function (params, hash, blocks) {
        if (hash.truth) {
            return blocks.template.yield();
        }
    });
    compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p><!---->');
});
QUnit.skip("Node helpers can modify the node", function () {
    env.registerHelper('testing', function (params, hash, options) {
        options.element.setAttribute('zomg', 'zomg');
    });
    compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
});
QUnit.skip("Node helpers can modify the node after one node appended by top-level helper", function () {
    env.registerHelper('top-helper', function () {
        return document.createElement('span');
    });
    env.registerHelper('attr-helper', function (params, hash, options) {
        options.element.setAttribute('zomg', 'zomg');
    });
    compilesTo('<div {{attr-helper}}>Node helpers</div>{{top-helper}}', '<div zomg="zomg">Node helpers</div><span></span>');
});
QUnit.skip("Node helpers can modify the node after one node prepended by top-level helper", function () {
    env.registerHelper('top-helper', function () {
        return document.createElement('span');
    });
    env.registerHelper('attr-helper', function (params, hash, options) {
        options.element.setAttribute('zomg', 'zomg');
    });
    compilesTo('{{top-helper}}<div {{attr-helper}}>Node helpers</div>', '<span></span><div zomg="zomg">Node helpers</div>');
});
QUnit.skip("Node helpers can modify the node after many nodes returned from top-level helper", function () {
    env.registerHelper('top-helper', function () {
        var frag = document.createDocumentFragment();
        frag.appendChild(document.createElement('span'));
        frag.appendChild(document.createElement('span'));
        return frag;
    });
    env.registerHelper('attr-helper', function (params, hash, options) {
        options.element.setAttribute('zomg', 'zomg');
    });
    compilesTo('{{top-helper}}<div {{attr-helper}}>Node helpers</div>', '<span></span><span></span><div zomg="zomg">Node helpers</div>');
});
QUnit.skip("Node helpers can be used for attribute bindings", function () {
    env.registerHelper('testing', function (params, hash, options) {
        var value = hash.href, element = options.element;
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
    env.registerHelper('x-append', function (params, hash, blocks) {
        equalHash(hash, { text: 'de' });
        blocks.template.yield();
    });
    var object = { bar: 'e', baz: 'c' };
    compilesTo('a<x-append text="d{{bar}}">b{{baz}}</x-append>f', 'abcf', object);
});
test('Components - Unknown helpers fall back to elements', function () {
    var object = { size: 'med', foo: 'b' };
    compilesTo('<x-bar class="btn-{{size}}">a{{foo}}c</x-bar>', '<x-bar class="btn-med">abc</x-bar>', object);
});
test('Components - Text-only attributes work', function () {
    var object = { foo: 'qux' };
    compilesTo('<x-bar id="test">{{foo}}</x-bar>', '<x-bar id="test">qux</x-bar>', object);
});
test('Components - Empty components work', function () {
    compilesTo('<x-bar></x-bar>', '<x-bar></x-bar>', {});
});
test('Components - Text-only dashed attributes work', function () {
    var object = { foo: 'qux' };
    compilesTo('<x-bar aria-label="foo" id="test">{{foo}}</x-bar>', '<x-bar aria-label="foo" id="test">qux</x-bar>', object);
});
test('Repaired text nodes are ensured in the right place', function () {
    var object = { a: "A", b: "B", c: "C", d: "D" };
    compilesTo('{{a}} {{b}}', 'A B', object);
    compilesTo('<div>{{a}}{{b}}{{c}}wat{{d}}</div>', '<div>ABCwatD</div>', object);
    compilesTo('{{a}}{{b}}<img><img><img><img>', 'AB<img><img><img><img>', object);
});
test("Simple elements can have dashed attributes", function () {
    var template = compile("<div aria-label='foo'>content</div>");
    render(template, {});
    equalTokens(root, '<div aria-label="foo">content</div>');
});
test('Block params in HTML syntax - Throws exception if given zero parameters', function () {
    expect(2);
    QUnit.throws(function () {
        compile('<x-bar as ||>foo</x-bar>');
    }, /Cannot use zero block parameters: 'as \|\|'/);
    QUnit.throws(function () {
        compile('<x-bar as | |>foo</x-bar>');
    }, /Cannot use zero block parameters: 'as \| \|'/);
});
test('Block params in HTML syntax - Works with a single parameter', function () {
    env.registerHelper('x-bar', function (params, hash, blocks) {
        return blocks.template.yield(['Xerxes']);
    });
    compilesTo('<x-bar as |x|>{{x}}</x-bar>', 'Xerxes', {});
});
test('Block params in HTML syntax - Works with other attributes', function () {
    env.registerHelper('x-bar', function (params, hash) {
        equalHash(hash, { firstName: 'Alice', lastName: 'Smith' });
    });
    let template = compile('<x-bar firstName="Alice" lastName="Smith" as |x y|></x-bar>');
    render(template, {});
});
test('Block params in HTML syntax - Ignores whitespace', function () {
    expect(3);
    env.registerHelper('x-bar', function (params, hash, blocks) {
        return blocks.template.yield(['Xerxes', 'York']);
    });
    compilesTo('<x-bar as |x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
    compilesTo('<x-bar as | x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
    compilesTo('<x-bar as | x y |>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
});
test('Block params in HTML syntax - Helper should know how many block params it was called with', function () {
    expect(4);
    env.registerHelper('count-block-params', function (params, hash, options) {
        equal(options.template.arity, parseInt(hash.count, 10), 'Helpers should receive the correct number of block params in options.template.blockParams.');
    });
    render(compile('<count-block-params count="0"></count-block-params>'), { count: 0 });
    render(compile('<count-block-params count="1" as |x|></count-block-params>'), { count: 1 });
    render(compile('<count-block-params count="2" as |x y|></count-block-params>'), { count: 2 });
    render(compile('<count-block-params count="3" as |x y z|></count-block-params>'), { count: 3 });
});
test("Block params in HTML syntax - Throws an error on invalid block params syntax", function () {
    expect(3);
    QUnit.throws(function () {
        compile('<x-bar as |x y>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as |x y'/);
    QUnit.throws(function () {
        compile('<x-bar as |x| y>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as \|x\| y'/);
    QUnit.throws(function () {
        compile('<x-bar as |x| y|>{{x}},{{y}}</x-bar>');
    }, /Invalid block parameters syntax: 'as \|x\| y\|'/);
});
test("Block params in HTML syntax - Throws an error on invalid identifiers for params", function () {
    expect(3);
    QUnit.throws(function () {
        compile('<x-bar as |x foo.bar|></x-bar>');
    }, /Invalid identifier for block parameters: 'foo\.bar' in 'as \|x foo\.bar|'/);
    QUnit.throws(function () {
        compile('<x-bar as |x "foo"|></x-bar>');
    }, /Invalid identifier for block parameters: '"foo"' in 'as \|x "foo"|'/);
    QUnit.throws(function () {
        compile('<x-bar as |foo[bar]|></x-bar>');
    }, /Invalid identifier for block parameters: 'foo\[bar\]' in 'as \|foo\[bar\]\|'/);
});
QUnit.module("HTML-based compiler (invalid HTML errors)", {
    beforeEach: commonSetup
});
test("A helpful error message is provided for unclosed elements", function () {
    expect(2);
    QUnit.throws(function () {
        compile('\n<div class="my-div" \n foo={{bar}}>\n<span>\n</span>\n');
    }, /Unclosed element `div` \(on line 2\)\./);
    QUnit.throws(function () {
        compile('\n<div class="my-div">\n<span>\n');
    }, /Unclosed element `span` \(on line 3\)\./);
});
test("A helpful error message is provided for unmatched end tags", function () {
    expect(2);
    QUnit.throws(function () {
        compile("</p>");
    }, /Closing tag `p` \(on line 1\) without an open tag\./);
    QUnit.throws(function () {
        compile("<em>{{ foo }}</em> \n {{ bar }}\n</div>");
    }, /Closing tag `div` \(on line 3\) without an open tag\./);
});
test("A helpful error message is provided for end tags for void elements", function () {
    expect(3);
    QUnit.throws(function () {
        compile("<input></input>");
    }, /Invalid end tag `input` \(on line 1\) \(void elements cannot have end tags\)./);
    QUnit.throws(function () {
        compile("<div>\n  <input></input>\n</div>");
    }, /Invalid end tag `input` \(on line 2\) \(void elements cannot have end tags\)./);
    QUnit.throws(function () {
        compile("\n\n</br>");
    }, /Invalid end tag `br` \(on line 3\) \(void elements cannot have end tags\)./);
});
test("A helpful error message is provided for end tags with attributes", function () {
    QUnit.throws(function () {
        compile('<div>\nSomething\n\n</div foo="bar">');
    }, /Invalid end tag: closing tag must not have attributes, in `div` \(on line 4\)\./);
});
test("A helpful error message is provided for mismatched start/end tags", function () {
    QUnit.throws(function () {
        compile("<div>\n<p>\nSomething\n\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});
test("error line numbers include comment lines", function () {
    QUnit.throws(function () {
        compile("<div>\n<p>\n{{! some comment}}\n\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});
test("error line numbers include mustache only lines", function () {
    QUnit.throws(function () {
        compile("<div>\n<p>\n{{someProp}}\n\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});
test("error line numbers include block lines", function () {
    QUnit.throws(function () {
        compile("<div>\n<p>\n{{#some-comment}}\n{{/some-comment}}\n</div>");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});
test("error line numbers include whitespace control mustaches", function () {
    QUnit.throws(function () {
        compile("<div>\n<p>\n{{someProp~}}\n\n</div>{{some-comment}}");
    }, /Closing tag `div` \(on line 5\) did not match last open tag `p` \(on line 2\)\./);
});
test("error line numbers include multiple mustache lines", function () {
    QUnit.throws(function () {
        compile("<div>\n<p>\n{{some-comment}}</div>{{some-comment}}");
    }, /Closing tag `div` \(on line 3\) did not match last open tag `p` \(on line 2\)\./);
});
if (document.createElement('div').namespaceURI) {
    QUnit.module("HTML-based compiler (output, svg)", {
        beforeEach: commonSetup
    });
    test("Simple elements can have namespaced attributes", function () {
        var template = compile("<svg xlink:title='svg-title'>content</svg>");
        var svgNode = render(template, {}).fragment.firstChild;
        equalTokens(svgNode, '<svg xlink:title="svg-title">content</svg>');
        equal(svgNode.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
    });
    test("Simple elements can have bound namespaced attributes", function () {
        var template = compile("<svg xlink:title={{title}}>content</svg>");
        var svgNode = render(template, { title: 'svg-title' }, env).fragment.firstChild;
        equalTokens(svgNode, '<svg xlink:title="svg-title">content</svg>');
        equal(svgNode.attributes[0].namespaceURI, 'http://www.w3.org/1999/xlink');
    });
    test("SVG element can have capitalized attributes", function () {
        var template = compile("<svg viewBox=\"0 0 0 0\"></svg>");
        var svgNode = render(template, {}).fragment.firstChild;
        equalTokens(svgNode, '<svg viewBox=\"0 0 0 0\"></svg>');
    });
    test("The compiler can handle namespaced elements", function () {
        var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
        var template = compile(html);
        var svgNode = render(template, {}).fragment.firstChild;
        equal(svgNode.namespaceURI, svgNamespace, "creates the svg element with a namespace");
        equalTokens(svgNode, html);
    });
    test("The compiler sets namespaces on nested namespaced elements", function () {
        var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
        var template = compile(html);
        var svgNode = render(template, {}).fragment.firstChild;
        equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "creates the path element with a namespace");
        equalTokens(svgNode, html);
    });
    test("The compiler sets a namespace on an HTML integration point", function () {
        var html = '<svg><foreignObject>Hi</foreignObject></svg>';
        var template = compile(html);
        var svgNode = render(template, {}).fragment.firstChild;
        equal(svgNode.namespaceURI, svgNamespace, "creates the svg element with a namespace");
        equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "creates the foreignObject element with a namespace");
        equalTokens(svgNode, html);
    });
    test("The compiler does not set a namespace on an element inside an HTML integration point", function () {
        var html = '<svg><foreignObject><div></div></foreignObject></svg>';
        var template = compile(html);
        var svgNode = render(template, {}).fragment.firstChild;
        equal(svgNode.childNodes[0].childNodes[0].namespaceURI, xhtmlNamespace, "creates the div inside the foreignObject without a namespace");
        equalTokens(svgNode, html);
    });
    test("The compiler pops back to the correct namespace", function () {
        var html = '<svg></svg><svg></svg><div></div>';
        var template = compile(html);
        var fragment = render(template, {}).fragment;
        equal(fragment.childNodes[0].namespaceURI, svgNamespace, "creates the first svg element with a namespace");
        equal(fragment.childNodes[1].namespaceURI, svgNamespace, "creates the second svg element with a namespace");
        equal(fragment.childNodes[2].namespaceURI, xhtmlNamespace, "creates the div element without a namespace");
        equalTokens(fragment, html);
    });
    test("The compiler pops back to the correct namespace even if exiting last child", function () {
        var html = '<div><svg></svg></div><div></div>';
        var fragment = render(compile(html), {}).fragment;
        equal(fragment.firstChild.namespaceURI, xhtmlNamespace, "first div's namespace is xhtmlNamespace");
        equal(fragment.firstChild.firstChild.namespaceURI, svgNamespace, "svg's namespace is svgNamespace");
        equal(fragment.lastChild.namespaceURI, xhtmlNamespace, "last div's namespace is xhtmlNamespace");
    });
    test("The compiler preserves capitalization of tags", function () {
        var html = '<svg><linearGradient id="gradient"></linearGradient></svg>';
        var template = compile(html);
        var fragment = render(template, {}).fragment;
        equalTokens(fragment, html);
    });
    test("svg can live with hydration", function () {
        var template = compile('<svg></svg>{{name}}');
        var fragment = render(template, { name: 'Milly' }, env, { contextualElement: document.body }).fragment;
        equal(fragment.childNodes[0].namespaceURI, svgNamespace, "svg namespace inside a block is present");
    });
    test("top-level unsafe morph uses the correct namespace", function () {
        var template = compile('<svg></svg>{{{foo}}}');
        var fragment = render(template, { foo: '<span>FOO</span>' }).fragment;
        equal(getTextContent(fragment), 'FOO', 'element from unsafe morph is displayed');
        equal(fragment.childNodes[1].namespaceURI, xhtmlNamespace, 'element from unsafe morph has correct namespace');
    });
    test("nested unsafe morph uses the correct namespace", function () {
        var template = compile('<svg>{{{foo}}}</svg><div></div>');
        var fragment = render(template, { foo: '<path></path>' }).fragment;
        equal(fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace, 'element from unsafe morph has correct namespace');
    });
    test("svg can take some hydration", function () {
        var template = compile('<div><svg>{{name}}</svg></div>');
        var fragment = render(template, { name: 'Milly' }).fragment;
        equal(fragment.firstChild.childNodes[0].namespaceURI, svgNamespace, "svg namespace inside a block is present");
        equalTokens(fragment.firstChild, '<div><svg>Milly</svg></div>', "html is valid");
    });
    test("root svg can take some hydration", function () {
        var template = compile('<svg>{{name}}</svg>');
        var fragment = render(template, { name: 'Milly' }, env).fragment;
        var svgNode = fragment.firstChild;
        equal(svgNode.namespaceURI, svgNamespace, "svg namespace inside a block is present");
        equalTokens(svgNode, '<svg>Milly</svg>', "html is valid");
    });
    test("Block helper allows interior namespace", function () {
        var isTrue = true;
        env.registerHelper('testing', function (params, hash, blocks) {
            if (isTrue) {
                return blocks.template.yield();
            }
            else {
                return blocks.inverse.yield();
            }
        });
        var template = compile('{{#testing}}<svg></svg>{{else}}<div><svg></svg></div>{{/testing}}');
        var fragment = render(template, { isTrue: true }, env, { contextualElement: document.body }).fragment;
        equal(firstChild(fragment).namespaceURI, svgNamespace, "svg namespace inside a block is present");
        isTrue = false;
        fragment = render(template, { isTrue: false }, env, { contextualElement: document.body }).fragment;
        equal(firstChild(fragment).namespaceURI, xhtmlNamespace, "inverse block path has a normal namespace");
        equal(firstChild(fragment).firstChild.namespaceURI, svgNamespace, "svg namespace inside an element inside a block is present");
    });
    test("Block helper allows namespace to bleed through", function () {
        registerYieldingHelper('testing');
        var template = compile('<div><svg>{{#testing}}<circle />{{/testing}}</svg></div>');
        var fragment = render(template, { isTrue: true }, env).fragment;
        var svgNode = fragment.firstChild.firstChild;
        equal(svgNode.namespaceURI, svgNamespace, "svg tag has an svg namespace");
        equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "circle tag inside block inside svg has an svg namespace");
    });
    test("Block helper with root svg allows namespace to bleed through", function () {
        registerYieldingHelper('testing');
        var template = compile('<svg>{{#testing}}<circle />{{/testing}}</svg>');
        var fragment = render(template, { isTrue: true }, env).fragment;
        var svgNode = fragment.firstChild;
        equal(svgNode.namespaceURI, svgNamespace, "svg tag has an svg namespace");
        equal(svgNode.childNodes[0].namespaceURI, svgNamespace, "circle tag inside block inside svg has an svg namespace");
    });
    test("Block helper with root foreignObject allows namespace to bleed through", function () {
        registerYieldingHelper('testing');
        var template = compile('<foreignObject>{{#testing}}<div></div>{{/testing}}</foreignObject>');
        var fragment = render(template, { isTrue: true }, env, { contextualElement: document.createElementNS(svgNamespace, 'svg') }).fragment;
        var svgNode = fragment.firstChild;
        equal(svgNode.namespaceURI, svgNamespace, "foreignObject tag has an svg namespace");
        equal(svgNode.childNodes[0].namespaceURI, xhtmlNamespace, "div inside morph and foreignObject has xhtml namespace");
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbC1jb21waWxlci10ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2h0bWxiYXJzLWNvbXBpbGVyL3Rlc3RzL2h0bWwtY29tcGlsZXItdGVzdC50cyJdLCJuYW1lcyI6WyJyZWdpc3RlcllpZWxkaW5nSGVscGVyIiwiY29tcGlsZXNUbyIsInJvb3RFbGVtZW50IiwiY29tbW9uU2V0dXAiLCJyZW5kZXIiLCJleHBlY3RlZEVycm9yIiwic2hvdWxkQmVWb2lkIiwiZmlyc3RDaGlsZCIsImVxdWFsSGFzaCJdLCJtYXBwaW5ncyI6Ik9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQkFBbUI7T0FDcEMsRUFBRSxPQUFPLEVBQUUsTUFBTSxlQUFlO09BQ2hDLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0JBQWtCO09BQ3JDLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVCQUF1QjtPQUNoRixFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLFdBQVc7QUFFOUQsSUFBSSxjQUFjLEdBQUcsOEJBQThCLEVBQy9DLFlBQVksR0FBSyw0QkFBNEIsQ0FBQztBQUVsRCxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDO0FBRW5CLGdDQUFnQyxJQUFJO0lBQ2xDQSxHQUFHQSxDQUFDQSxjQUFjQSxDQUFDQSxJQUFJQSxFQUFFQSxVQUFTQSxNQUFNQSxFQUFFQSxJQUFJQSxFQUFFQSxNQUFNQSxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDQSxDQUFDQTtBQUMvRkEsQ0FBQ0E7QUFHRCxvQkFBb0IsSUFBSSxFQUFFLFFBQVEsRUFBRSxPQUFPO0lBQ3pDQyxJQUFJQSxRQUFRQSxHQUFHQSxPQUFPQSxDQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtJQUM3QkEsSUFBSUEsR0FBR0EsV0FBV0EsRUFBRUEsQ0FBQ0E7SUFDckJBLE1BQU1B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