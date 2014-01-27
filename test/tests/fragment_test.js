import { FragmentOpcodeCompiler } from "htmlbars/compiler/fragment_opcode";
import { HydrationOpcodeCompiler } from "htmlbars/compiler/hydration_opcode";
import { FragmentCompiler } from "htmlbars/compiler/fragment";
import { HydrationCompiler } from "htmlbars/compiler/hydration";
import { domHelpers } from "htmlbars/runtime/dom_helpers";
import { Placeholder } from "htmlbars/runtime/placeholder";
import { preprocess } from "htmlbars/parser";

function equalHTML(fragment, html) {
  var div = document.createElement("div");
  div.appendChild(fragment.cloneNode(true));

  QUnit.push(div.innerHTML === html, div.innerHTML, html);
}

var dom = domHelpers();

function fragmentFor(ast) {
  /* jshint evil: true */
  var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
      fragmentCompiler = new FragmentCompiler();

  var opcodes = fragmentOpcodeCompiler.compile(ast);
  var program = fragmentCompiler.compile(opcodes);

  var fn = new Function('return ' + program)();

  return fn( dom );
}

function hydratorFor(ast) {
  /* jshint evil: true */
  var hydrate = new HydrationOpcodeCompiler();
  var opcodes = hydrate.compile(ast);
  var hydrate2 = new HydrationCompiler();
  var program = hydrate2.compile(opcodes, []);
  return new Function("Placeholder", "fragment", "context", "helpers", program);
}

module('fragment');

test('compiles a fragment', function () {
  var ast = preprocess("<div>{{foo}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast);

  equalHTML(fragment, "<div> bar </div>");
});

test('converts entities to their char/string equivalent', function () {
  var ast = preprocess("<div title=\"&quot;Foo &amp; Bar&quot;\">lol &lt; &#60;&#x3c; &#x3C; &LT; &NotGreaterFullEqual; &Borksnorlax;</div>");
  var fragment = fragmentFor(ast);

  equal(fragment.childNodes[0].getAttribute('title'), '"Foo & Bar"');
  equal(fragment.childNodes[0].textContent, "lol < << < < ≧̸ &Borksnorlax;");
});

test('hydrates a fragment with placeholder mustaches', function () {
  var ast = preprocess("<div>{{foo \"foo\" 3 blah bar=baz ack=\"syn\"}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast).cloneNode(true);
  var hydrate = hydratorFor(ast);

  var contentResolves = [];
  var context = {};
  var helpers = {
    CONTENT: function(placeholder, path, context, params, options) {
      contentResolves.push({
        placeholder: placeholder,
        context: context,
        path: path,
        params: params,
        options: options
      });
    }
  };

  hydrate(Placeholder, fragment, context, helpers);

  equal(contentResolves.length, 2);

  var foo = contentResolves[0];
  equal(foo.placeholder.parent, fragment.childNodes[0]);
  equal(foo.context, context);
  equal(foo.path, 'foo');
  deepEqual(foo.params, ["foo",3,"blah"]);
  deepEqual(foo.options.types, ["string","number","id"]);
  deepEqual(foo.options.hash, {ack:"syn",bar:"baz"});
  deepEqual(foo.options.hashTypes, {ack:"string",bar:"id"});
  equal(foo.options.escaped, true);

  var baz = contentResolves[1];
  equal(baz.placeholder.parent, fragment.childNodes[0]);
  equal(baz.context, context);
  equal(baz.path, 'baz');
  equal(baz.params.length, 0);
  equal(baz.options.escaped, true);

  foo.placeholder.appendChild(document.createTextNode('A'));
  baz.placeholder.appendChild(document.createTextNode('B'));

  equalHTML(fragment, "<div>A bar B</div>");
});

test('test auto insertion of text nodes for needed edges a fragment with placeholder mustaches', function () {
  var ast = preprocess("{{first}}<p>{{second}}</p>{{third}}");
  var fragment = fragmentFor(ast).cloneNode(true);
  var hydrate = hydratorFor(ast);

  var placeholders = [];
  function FakePlaceholder() {
    Placeholder.apply(this, arguments);
    placeholders.push(this);
  }
  FakePlaceholder.prototype = Object.create(Placeholder.prototype);

  var contentResolves = [];
  var context = {};
  var helpers = {
    CONTENT: function(placeholder, path, context, params, options) {
      contentResolves.push({
        placeholder: placeholder,
        context: context,
        path: path,
        params: params,
        options: options
      });
    }
  };

  hydrate(FakePlaceholder, fragment, context, helpers);

  equal(placeholders.length, 3);

  var t = placeholders[0].start;
  equal(t.nodeType, 3);
  equal(t.textContent , '');
  equal(placeholders[1].start, null);
  equal(placeholders[1].end, null);

  equal(placeholders[2].start, placeholders[1].parent);
  equal(placeholders[2].end.nodeType, 3);
  equal(placeholders[2].end.textContent, '');

  placeholders[0].appendText('A');
  placeholders[1].appendText('B');
  placeholders[2].appendText('C');

  equalHTML(fragment, "A<p>B</p>C");
});

// TODO move test to AST
test('test auto insertion of text nodes between blocks and mustaches', function () {
  var ast = preprocess("{{one}}{{two}}{{#three}}{{/three}}{{#four}}{{/four}}{{five}}");
  // "" {{one}} "" {{two}} "" {{#three}}{{/three}} "" {{#four}}{{/four}} "" {{five}} ""
  equal(ast.length, 11);
  equal(ast[0], '');
  equal(ast[2], '');
  equal(ast[4], '');
  equal(ast[6], '');
  equal(ast[8], '');
  equal(ast[10], '');
});
