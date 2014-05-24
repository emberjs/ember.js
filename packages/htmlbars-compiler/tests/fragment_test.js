import { FragmentOpcodeCompiler } from "htmlbars-compiler/compiler/fragment_opcode";
import { HydrationOpcodeCompiler } from "htmlbars-compiler/compiler/hydration_opcode";
import { FragmentCompiler } from "htmlbars-compiler/compiler/fragment";
import { HydrationCompiler } from "htmlbars-compiler/compiler/hydration";
import { domHelpers } from "htmlbars-runtime/dom_helpers";
import { Placeholder } from "htmlbars-runtime/placeholder";
import { preprocess } from "htmlbars-compiler/parser";

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

  equal(fragment.getAttribute('title'), '"Foo & Bar"');
  equal(fragment.textContent, "lol < << < < ≧̸ &Borksnorlax;");
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
  equal(foo.placeholder.parent(), fragment);
  equal(foo.context, context);
  equal(foo.path, 'foo');
  deepEqual(foo.params, ["foo",3,"blah"]);
  deepEqual(foo.options.types, ["string","number","id"]);
  deepEqual(foo.options.hash, {ack:"syn",bar:"baz"});
  deepEqual(foo.options.hashTypes, {ack:"string",bar:"id"});
  equal(foo.options.escaped, true);

  var baz = contentResolves[1];
  equal(baz.placeholder.parent(), fragment);
  equal(baz.context, context);
  equal(baz.path, 'baz');
  equal(baz.params.length, 0);
  equal(baz.options.escaped, true);

  foo.placeholder.update('A');
  baz.placeholder.update('B');

  equalHTML(fragment, "<div>A bar B</div>");
});

test('test auto insertion of text nodes for needed edges a fragment with placeholder mustaches', function () {
  var ast = preprocess("{{first}}<p>{{second}}</p>{{third}}");
  var fragment = fragmentFor(ast).cloneNode(true);
  var hydrate = hydratorFor(ast);

  var placeholders = [];
  var FakePlaceholder = {
    create: function (start, startIndex, endIndex) {
      var placeholder = Placeholder.create(start, startIndex, endIndex);
      placeholders.push(placeholder);
      return placeholder;
    }
  };

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

  equal(placeholders[2].start, placeholders[1].parent());
  equal(placeholders[2].end.nodeType, 3);
  equal(placeholders[2].end.textContent, '');

  placeholders[0].update('A');
  placeholders[1].update('B');
  placeholders[2].update('C');

  equalHTML(fragment, "A<p>B</p>C");
});
