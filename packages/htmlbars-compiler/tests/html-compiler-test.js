import { compile } from "../htmlbars-compiler/compiler";
import { forEach } from "../htmlbars-util/array-utils";
import { tokenize } from "../simple-html-tokenizer";
import defaultHooks from "../htmlbars-runtime/hooks";
import defaultHelpers from "../htmlbars-runtime/helpers";
import { merge } from "../htmlbars-util/object-utils";
import { DOMHelper } from "../morph";
import { normalizeInnerHTML } from "../htmlbars-test-helpers";

var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace   = "http://www.w3.org/2000/svg";

var hooks, helpers, partials, env;

function registerHelper(name, callback) {
  helpers[name] = callback;
}

function registerPartial(name, html) {
  partials[name] = compile(html);
}

function compilesTo(html, expected, context) {
  var template = compile(html);
  var fragment = template.render(context, env, document.body);
  equalTokens(fragment, expected === undefined ? html : expected);
  return fragment;
}

function equalTokens(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));
  var fragTokens = tokenize(div.innerHTML);

  div.removeChild(div.childNodes[0]);
  div.innerHTML = html;
  var htmlTokens = tokenize(div.innerHTML);

  function normalizeTokens(token) {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort(function(a,b){
        if (a.name > b.name) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }
        return 0;
      });
    }
  }

  forEach(fragTokens, normalizeTokens);
  forEach(htmlTokens, normalizeTokens);

  deepEqual(fragTokens, htmlTokens);
}

function commonSetup() {
  hooks = merge({}, defaultHooks);
  helpers = merge({}, defaultHelpers);
  partials = {};

  env = {
    dom: new DOMHelper(),
    hooks: hooks,
    helpers: helpers,
    partials: partials
  };
}

QUnit.module("HTML-based compiler (output)", {
  setup: commonSetup
});

test("Simple content produces a document fragment", function() {
  var template = compile("content");
  var fragment = template.render({}, env);

  equalTokens(fragment, "content");
});

test("Simple elements are created", function() {
  var template = compile("<h1>hello!</h1><div>content</div>");
  var fragment = template.render({}, env);

  equalTokens(fragment, "<h1>hello!</h1><div>content</div>");
});

test("Simple elements can have attributes", function() {
  var template = compile("<div class='foo' id='bar'>content</div>");
  var fragment = template.render({}, env);

  equalTokens(fragment, '<div class="foo" id="bar">content</div>');
});

test("Simple elements can have an empty attribute", function() {
  var template = compile("<div class=''>content</div>");
  var fragment = template.render({}, env);

  equalTokens(fragment, '<div class="">content</div>');
});

test("Null quoted attribute value calls toString on the value", function() {
  var template = compile('<input disabled="{{isDisabled}}">');
  var fragment = template.render({isDisabled: null}, env);

  equalTokens(fragment, '<input disabled="null">');
});

test("Null unquoted attribute value removes that attribute", function() {

  var template = compile('<input disabled={{isDisabled}}>');
  var fragment = template.render({isDisabled: null}, env);

  equalTokens(fragment, '<input>');
});

test("unquoted attribute string is just that", function() {

  var template = compile('<input value=funstuff>');
  var fragment = template.render({}, env);

  equalTokens(fragment, '<input value="funstuff">');
});

test("unquoted attribute expression is string", function() {

  var template = compile('<input value={{funstuff}}>');
  var fragment = template.render({funstuff: "oh my"}, env);

  equalTokens(fragment, '<input value="oh my">');
});

test("unquoted attribute expression works when followed by another attribute", function() {

  var template = compile('<input value={{funstuff}} name="Alice">');
  var fragment = template.render({funstuff: "oh my"}, env);

  equalTokens(fragment, '<input value="oh my" name="Alice">');
});

test("Unquoted attribute value with multiple nodes throws an exception", function () {
  expect(4);

  QUnit.throws(function() { compile('<img class=foo{{bar}}>'); }, expectedError(1));
  QUnit.throws(function() { compile('<img class={{foo}}{{bar}}>'); }, expectedError(1));
  QUnit.throws(function() { compile('<img \nclass={{foo}}bar>'); }, expectedError(2));
  QUnit.throws(function() { compile('<div \nclass\n=\n{{foo}}&amp;bar ></div>'); }, expectedError(4));

  function expectedError(line) {
    return new Error("Unquoted attribute value must be a single string or mustache (line " + line + ")");
  }
});

test("Simple elements can have arbitrary attributes", function() {
  var template = compile("<div data-some-data='foo'>content</div>");
  var fragment = template.render({}, env);
  equalTokens(fragment, '<div data-some-data="foo">content</div>');
});

test("checked attribute and checked property are present after clone and hydrate", function() {
  var template = compile("<input checked=\"checked\">");
  var fragment = template.render({}, env);
  ok(fragment.checked, 'input is checked');
  equalTokens(fragment, "<input checked='checked'>");
});

test("SVG element can have capitalized attributes", function() {
  var template = compile("<svg viewBox=\"0 0 0 0\"></svg>");
  var fragment = template.render({}, env);
  equalTokens(fragment, '<svg viewBox=\"0 0 0 0\"></svg>');
});

function shouldBeVoid(tagName) {
  var html = "<" + tagName + " data-foo='bar'><p>hello</p>";
  var template = compile(html);
  var fragment = template.render({}, env);


  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  var tag = '<' + tagName + ' data-foo="bar">';
  var closing = '</' + tagName + '>';
  var extra = "<p>hello</p>";
  html = normalizeInnerHTML(div.innerHTML);

  QUnit.push((html === tag + extra) || (html === tag + closing + extra), html, tag + closing + extra, tagName + "should be a void element");
}

test("Void elements are self-closing", function() {
  var voidElements = "area base br col command embed hr img input keygen link meta param source track wbr";

  forEach(voidElements.split(" "), function(tagName) {
    shouldBeVoid(tagName);
  });
});

test("The compiler can handle nesting", function() {
  var html = '<div class="foo"><p><span id="bar" data-foo="bar">hi!</span></p></div> More content';
  var template = compile(html);
  var fragment = template.render({}, env);

  equalTokens(fragment, html);
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

test("The compiler can handle partials in helper partial syntax", function() {
  registerPartial('partial_name', "<b>Partial Works!</b>");
  compilesTo('<div>{{partial "partial_name"}} Plaintext content</div>', '<div><b>Partial Works!</b> Plaintext content</div>', {});
});

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

test("The compiler can handle top-level unescaped tr", function() {
  var template = compile('{{{html}}}');
  var context = { html: '<tr><td>Yo</td></tr>' };
  var fragment = template.render(context, env, document.createElement('table'));

  equal(
    fragment.childNodes[1].tagName, 'TR',
    "root tr is present" );
});

test("The compiler can handle top-level unescaped td inside tr contextualElement", function() {
  var template = compile('{{{html}}}');
  var context = { html: '<td>Yo</td>' };
  var fragment = template.render(context, env, document.createElement('tr'));

  equal(
    fragment.childNodes[1].tagName, 'TD',
    "root td is returned" );
});

test("The compiler can handle unescaped tr in top of content", function() {
  registerHelper('test', function(params, hash, options, env) {
    return options.template.render(this, env, options.morph.contextualElement);
  });

  var template = compile('{{#test}}{{{html}}}{{/test}}');
  var context = { html: '<tr><td>Yo</td></tr>' };
  var fragment = template.render(context, env, document.createElement('table'));

  equal(
    fragment.childNodes[2].tagName, 'TR',
    "root tr is present" );
});

test("The compiler can handle unescaped tr inside fragment table", function() {
  registerHelper('test', function(params, hash, options, env) {
    return options.template.render(this, env, options.morph.contextualElement);
  });

  var template = compile('<table>{{#test}}{{{html}}}{{/test}}</table>');
  var context = { html: '<tr><td>Yo</td></tr>' };
  var fragment = template.render(context, env, document.createElement('div'));

  equal(
    fragment.childNodes[1].tagName, 'TR',
    "root tr is present" );
});

test("The compiler can handle simple helpers", function() {
  registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo('<div>{{testing title}}</div>', '<div>hello</div>', { title: 'hello' });
});

test("The compiler can handle sexpr helpers", function() {
  registerHelper('testing', function(params) {
    return params[0] + "!";
  });

  compilesTo('<div>{{testing (testing "hello")}}</div>', '<div>hello!!</div>', {});
});

test("The compiler can handle multiple invocations of sexprs", function() {
  registerHelper('testing', function(params) {
    return "" + params[0] + params[1];
  });

  compilesTo('<div>{{testing (testing "hello" foo) (testing (testing bar "lol") baz)}}</div>', '<div>helloFOOBARlolBAZ</div>', { foo: "FOO", bar: "BAR", baz: "BAZ" });
});

test("The compiler passes along the hash arguments", function() {
  registerHelper('testing', function(params, hash) {
    return hash.first + '-' + hash.second;
  });

  compilesTo('<div>{{testing first="one" second="two"}}</div>', '<div>one-two</div>');
});

test("Simple data binding using text nodes", function() {
  var callback;

  hooks.content = function(env, morph, context, path) {
    callback = function() {
      morph.update(context[path]);
    };
    callback();
  };

  var object = { title: 'hello' };
  var fragment = compilesTo('<div>{{title}} world</div>', '<div>hello world</div>', object);

  object.title = 'goodbye';
  callback();

  equalTokens(fragment, '<div>goodbye world</div>');

  object.title = 'brown cow';
  callback();

  equalTokens(fragment, '<div>brown cow world</div>');
});

test("Simple data binding on fragments", function() {
  var callback;

  hooks.content = function(env, morph, context, path) {
    morph.escaped = false;
    callback = function() {
      morph.update(context[path]);
    };
    callback();
  };

  var object = { title: '<p>hello</p> to the' };
  var fragment = compilesTo('<div>{{title}} world</div>', '<div><p>hello</p> to the world</div>', object);

  object.title = '<p>goodbye</p> to the';
  callback();

  equalTokens(fragment, '<div><p>goodbye</p> to the world</div>');

  object.title = '<p>brown cow</p> to the';
  callback();

  equalTokens(fragment, '<div><p>brown cow</p> to the world</div>');
});

test("morph receives escaping information", function() {
  expect(3);

  hooks.content = function(env, morph, context, path) {
    if (path === 'escaped') {
      equal(morph.escaped, true);
    } else if (path === 'unescaped') {
      equal(morph.escaped, false);
    }

    morph.update(path);
  };

  // so we NEED a reference to div. because it's passed in twice.
  // not divs childNodes.
  // the parent we need to save is fragment.childNodes
  compilesTo('<div>{{escaped}}-{{{unescaped}}}</div>', '<div>escaped-unescaped</div>');
});

test("Morphs are escaped correctly", function() {
  expect(10);

  registerHelper('testing-unescaped', function(params, hash, options) {
    equal(options.morph.escaped, false);

    return params[0];
  });

  registerHelper('testing-escaped', function(params, hash, options, env) {
    equal(options.morph.escaped, true);

    if (options.template) {
      return options.template.render({}, env, options.morph.contextualElement);
    }

    return params[0];
  });

  compilesTo('<div>{{{testing-unescaped}}}-{{{testing-unescaped "a"}}}</div>', '<div>-a</div>');
  compilesTo('<div>{{testing-escaped}}-{{testing-escaped "b"}}</div>', '<div>-b</div>');
  compilesTo('<div>{{#testing-escaped}}c{{/testing-escaped}}</div>', '<div>c</div>');
  compilesTo('<div><testing-escaped>c</testing-escaped></div>', '<div>c</div>');
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
  registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
/*
test("A helper can return a stream for the attribute", function() {
  registerHelper('testing', function(path, options) {
    return streamValue(this[path]);
  });

  compilesTo('<a href="{{testing url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html'});
});
*/
test("Attribute helpers take a hash", function() {
  registerHelper('testing', function(params, hash) {
    return hash.path;
  });

  compilesTo('<a href="{{testing path=url}}">linky</a>', '<a href="linky.html">linky</a>', { url: 'linky.html' });
});
/*
test("Attribute helpers can use the hash for data binding", function() {
  var callback;

  registerHelper('testing', function(path, hash, options) {
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
  registerHelper('testing', function(params) {
    return params[0];
  });

  compilesTo('<a href="http://{{foo}}/{{testing bar}}/{{testing "baz"}}">linky</a>', '<a href="http://foo.com/bar/baz">linky</a>', { foo: 'foo.com', bar: 'bar' });
});

test("Attributes containing a helper are treated like a block", function() {
  expect(2);

  registerHelper('testing', function(params) {
    deepEqual(params, [123]);
    return "example.com";
  });

  compilesTo('<a href="http://{{testing 123}}/index.html">linky</a>', '<a href="http://example.com/index.html">linky</a>', { person: { url: 'example.com' } });
});
/*
test("It is possible to trigger a re-render of an attribute from a child resolution", function() {
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
  registerHelper('testing', function(params, hash, options, env) {
    return options.template.render(this, env);
  });

  compilesTo('{{#testing}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A simple block helper can return text", function() {
  registerHelper('testing', function(params, hash, options, env) {
    return options.template.render(this, env);
  });

  compilesTo('{{#testing}}test{{else}}not shown{{/testing}}', 'test');
});

test("A block helper can have an else block", function() {
  registerHelper('testing', function(params, hash, options, env) {
    return options.inverse.render(this, env);
  });

  compilesTo('{{#testing}}Nope{{else}}<div id="test">123</div>{{/testing}}', '<div id="test">123</div>');
});

test("A block helper can pass a context to be used in the child", function() {
  registerHelper('testing', function(params, hash, options, env) {
    var context = { title: 'Rails is omakase' };
    return options.template.render(context, env);
  });

  compilesTo('{{#testing}}<div id="test">{{title}}</div>{{/testing}}', '<div id="test">Rails is omakase</div>');
});

test("Block helpers receive hash arguments", function() {
  registerHelper('testing', function(params, hash, options, env) {
    if (hash.truth) {
      return options.template.render(this, env);
    }
  });

  compilesTo('{{#testing truth=true}}<p>Yep!</p>{{/testing}}{{#testing truth=false}}<p>Nope!</p>{{/testing}}', '<p>Yep!</p>');
});

test("Node helpers can modify the node", function() {
  registerHelper('testing', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('<div {{testing}}>Node helpers</div>', '<div zomg="zomg">Node helpers</div>');
});

test("Node helpers can modify the node after one node appended by top-level helper", function() {
  registerHelper('top-helper', function() {
    return document.createElement('span');
  });
  registerHelper('attr-helper', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('<div {{attr-helper}}>Node helpers</div>{{top-helper}}', '<div zomg="zomg">Node helpers</div><span></span>');
});

test("Node helpers can modify the node after one node prepended by top-level helper", function() {
  registerHelper('top-helper', function() {
    return document.createElement('span');
  });
  registerHelper('attr-helper', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo('{{top-helper}}<div {{attr-helper}}>Node helpers</div>', '<span></span><div zomg="zomg">Node helpers</div>');
});

test("Node helpers can modify the node after many nodes returned from top-level helper", function() {
  registerHelper('top-helper', function() {
    var frag = document.createDocumentFragment();
    frag.appendChild(document.createElement('span'));
    frag.appendChild(document.createElement('span'));
    return frag;
  });
  registerHelper('attr-helper', function(params, hash, options) {
    options.element.setAttribute('zomg', 'zomg');
  });

  compilesTo(
    '{{top-helper}}<div {{attr-helper}}>Node helpers</div>',
    '<span></span><span></span><div zomg="zomg">Node helpers</div>' );
});

test("Node helpers can be used for attribute bindings", function() {
  var callback;

  registerHelper('testing', function(params, hash, options) {
    var path = hash.href,
        element = options.element;
    var context = this;

    callback = function() {
      var value = context[path];
      element.setAttribute('href', value);
    };

    callback();
  });

  var object = { url: 'linky.html' };
  var fragment = compilesTo('<a {{testing href="url"}}>linky</a>', '<a href="linky.html">linky</a>', object);

  object.url = 'zippy.html';
  callback();

  equalTokens(fragment, '<a href="zippy.html">linky</a>');
});


test('Components - Called as helpers', function () {
  registerHelper('x-append', function(params, hash, options, env) {
    var fragment = options.template.render(this, env, options.morph.contextualElement);
    fragment.appendChild(document.createTextNode(hash.text));
    return fragment;
  });
  var object = { bar: 'e', baz: 'c' };
  compilesTo('a<x-append text="d{{bar}}">b{{baz}}</x-append>f','abcdef', object);
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
  var fragment = template.render({}, env);

  equalTokens(fragment, '<div aria-label="foo">content</div>');
});

test("Block params", function() {
  registerHelper('a', function(params, hash, options, env) {
    var context = Object.create(this);
    var span = document.createElement('span');
    span.appendChild(options.template.render(context, env, document.body, ['W', 'X1']));
    return 'A(' + span.innerHTML + ')';
  });
  registerHelper('b', function(params, hash, options, env) {
    var context = Object.create(this);
    var span = document.createElement('span');
    span.appendChild(options.template.render(context, env, document.body, ['X2', 'Y']));
    return 'B(' + span.innerHTML + ')';
  });
  registerHelper('c', function(params, hash, options, env) {
    var context = Object.create(this);
    var span = document.createElement('span');
    span.appendChild(options.template.render(context, env, document.body, ['Z']));
    return 'C(' + span.innerHTML + ')';
    // return "C(" + options.template.render() + ")";
  });
  var t = '{{#a as |w x|}}{{w}},{{x}} {{#b as |x y|}}{{x}},{{y}}{{/b}} {{w}},{{x}} {{#c as |z|}}{{x}},{{z}}{{/c}}{{/a}}';
  compilesTo(t, 'A(W,X1 B(X2,Y) W,X1 C(X1,Z))', {});
});

test("Block params - Helper should know how many block params it was called with", function() {
  expect(4);

  registerHelper('count-block-params', function(params, hash, options) {
    equal(options.template.blockParams, this.count, 'Helpers should receive the correct number of block params in options.template.blockParams.');
  });

  compile('{{#count-block-params}}{{/count-block-params}}').render({ count: 0 }, env, document.body);
  compile('{{#count-block-params as |x|}}{{/count-block-params}}').render({ count: 1 }, env, document.body);
  compile('{{#count-block-params as |x y|}}{{/count-block-params}}').render({ count: 2 }, env, document.body);
  compile('{{#count-block-params as |x y z|}}{{/count-block-params}}').render({ count: 3 }, env, document.body);
});

test('Block params in HTML syntax', function () {
  registerHelper('x-bar', function(params, hash, options, env) {
    var context = Object.create(this);
    var span = document.createElement('span');
    span.appendChild(options.template.render(context, env, document.body, ['Xerxes', 'York', 'Zed']));
    return 'BAR(' + span.innerHTML + ')';
  });
  compilesTo('<x-bar as |x y zee|>{{zee}},{{y}},{{x}}</x-bar>', 'BAR(Zed,York,Xerxes)', {});
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
  registerHelper('x-bar', function(params, hash, options, env) {
    return options.template.render({}, env, document.body, ['Xerxes']);
  });
  compilesTo('<x-bar as |x|>{{x}}</x-bar>', 'Xerxes', {});
});

test('Block params in HTML syntax - Works with other attributes', function () {
  registerHelper('x-bar', function(params, hash) {
    deepEqual(hash, {firstName: 'Alice', lastName: 'Smith'});
  });
  compile('<x-bar firstName="Alice" lastName="Smith" as |x y|></x-bar>').render({}, env, document.body);
});

test('Block params in HTML syntax - Ignores whitespace', function () {
  expect(3);

  registerHelper('x-bar', function(params, hash, options) {
    return options.template.render({}, env, document.body, ['Xerxes', 'York']);
  });
  compilesTo('<x-bar as |x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
  compilesTo('<x-bar as | x y|>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
  compilesTo('<x-bar as | x y |>{{x}},{{y}}</x-bar>', 'Xerxes,York', {});
});

test('Block params in HTML syntax - Helper should know how many block params it was called with', function () {
  expect(4);

  registerHelper('count-block-params', function(params, hash, options) {
    equal(options.template.blockParams, this.count, 'Helpers should receive the correct number of block params in options.template.blockParams.');
  });

  compile('<count-block-params></count-block-params>').render({ count: 0 }, env, document.body);
  compile('<count-block-params as |x|></count-block-params>').render({ count: 1 }, env, document.body);
  compile('<count-block-params as |x y|></count-block-params>').render({ count: 2 }, env, document.body);
  compile('<count-block-params as |x y z|></count-block-params>').render({ count: 3 }, env, document.body);
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
  setup: commonSetup
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
  setup: commonSetup
});

test("The compiler can handle namespaced elements", function() {
  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
  var template = compile(html);
  var fragment = template.render({}, env);

  equal(fragment.namespaceURI, svgNamespace, "creates the svg element with a namespace");
  equalTokens(fragment, html);
});

test("The compiler sets namespaces on nested namespaced elements", function() {
  var html = '<svg><path stroke="black" d="M 0 0 L 100 100"></path></svg>';
  var template = compile(html);
  var fragment = template.render({}, env);

  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equalTokens(fragment, html);
});

test("The compiler sets a namespace on an HTML integration point", function() {
  var html = '<svg><foreignObject>Hi</foreignObject></svg>';
  var template = compile(html);
  var fragment = template.render({}, env);

  equal( fragment.namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equalTokens(fragment, html);
});

test("The compiler does not set a namespace on an element inside an HTML integration point", function() {
  var html = '<svg><foreignObject><div></div></foreignObject></svg>';
  var template = compile(html);
  var fragment = template.render({}, env);

  equal( fragment.childNodes[0].childNodes[0].namespaceURI, xhtmlNamespace,
         "creates the path element with a namespace" );
  equalTokens(fragment, html);
});

test("The compiler pops back to the correct namespace", function() {
  var html = '<svg></svg><svg></svg><div></div>';
  var template = compile(html);
  var fragment = template.render({}, env);

  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equal( fragment.childNodes[1].namespaceURI, svgNamespace,
         "creates the path element with a namespace" );
  equal( fragment.childNodes[2].namespaceURI, xhtmlNamespace,
         "creates the path element with a namespace" );
  equalTokens(fragment, html);
});

test("The compiler preserves capitalization of tags", function() {
  var html = '<svg><linearGradient id="gradient"></linearGradient></svg>';
  var template = compile(html);
  var fragment = template.render({}, env);

  equalTokens(fragment, html);
});

test("svg can live with hydration", function() {
  var template = compile('<svg></svg>{{name}}');

  var fragment = template.render({ name: 'Milly' }, env, document.body);
  equal(
    fragment.childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
});

test("svg can take some hydration", function() {
  var template = compile('<div><svg>{{name}}</svg></div>');

  var fragment = template.render({ name: 'Milly' }, env);
  equal(
    fragment.childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
  equalTokens( fragment, '<div><svg>Milly</svg></div>',
             "html is valid" );
});

test("root svg can take some hydration", function() {
  var template = compile('<svg>{{name}}</svg>');
  var fragment = template.render({ name: 'Milly' }, env);
  equal(
    fragment.namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );
  equalTokens( fragment, '<svg>Milly</svg>',
             "html is valid" );
});

test("Block helper allows interior namespace", function() {
  var isTrue = true;

  registerHelper('testing', function(params, hash, options, env) {
    var morph = options.morph;
    if (isTrue) {
      return options.template.render(this, env, morph.contextualElement);
    } else {
      return options.inverse.render(this, env, morph.contextualElement);
    }
  });

  var template = compile('{{#testing}}<svg></svg>{{else}}<div><svg></svg></div>{{/testing}}');

  var fragment = template.render({ isTrue: true }, env, document.body);
  equal(
    fragment.childNodes[1].namespaceURI, svgNamespace,
    "svg namespace inside a block is present" );

  isTrue = false;
  fragment = template.render({ isTrue: false }, env, document.body);
  equal(
    fragment.childNodes[1].namespaceURI, xhtmlNamespace,
    "inverse block path has a normal namespace");
  equal(
    fragment.childNodes[1].childNodes[0].namespaceURI, svgNamespace,
    "svg namespace inside an element inside a block is present" );
});

test("Block helper allows namespace to bleed through", function() {
  registerHelper('testing', function(params, hash, options, env) {
    var morph = options.morph;
    return options.template.render(this, env, morph.contextualElement);
  });

  var template = compile('<div><svg>{{#testing}}<circle />{{/testing}}</svg></div>');

  var fragment = template.render({ isTrue: true }, env);
  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "svg tag has an svg namespace" );
  equal( fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace,
         "circle tag inside block inside svg has an svg namespace" );
});

test("Block helper with root svg allows namespace to bleed through", function() {
  registerHelper('testing', function(params, hash, options, env) {
    var morph = options.morph;
    return options.template.render(this, env, morph.contextualElement);
  });

  var template = compile('<svg>{{#testing}}<circle />{{/testing}}</svg>');

  var fragment = template.render({ isTrue: true }, env);
  equal( fragment.namespaceURI, svgNamespace,
         "svg tag has an svg namespace" );
  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         "circle tag inside block inside svg has an svg namespace" );
});

test("Block helper with root foreignObject allows namespace to bleed through", function() {
  registerHelper('testing', function(params, hash, options, env) {
    var morph = options.morph;
    return options.template.render(this, env, morph.contextualElement);
  });

  var template = compile('<foreignObject>{{#testing}}<div></div>{{/testing}}</foreignObject>');

  var fragment = template.render({ isTrue: true }, env, document.createElementNS(svgNamespace, 'svg'));
  equal( fragment.namespaceURI, svgNamespace,
         "foreignObject tag has an svg namespace" );
  equal( fragment.childNodes[0].namespaceURI, xhtmlNamespace,
         "div inside morph and foreignObject has xhtml namespace" );
});

}
