import { FragmentOpcodeCompiler } from "htmlbars-compiler/compiler/fragment_opcode";
import { HydrationOpcodeCompiler } from "htmlbars-compiler/compiler/hydration_opcode";
import { FragmentCompiler } from "htmlbars-compiler/compiler/fragment";
import { HydrationCompiler } from "htmlbars-compiler/compiler/hydration";
import { DOMHelper } from "morph";
import { preprocess } from "htmlbars-compiler/parser";
import { equalHTML } from "test/support/assertions";

var dom = new DOMHelper(null, document);

function fragmentFor(ast) {
  /* jshint evil: true */
  var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
      fragmentCompiler = new FragmentCompiler();

  var opcodes = fragmentOpcodeCompiler.compile(ast);
  var program = fragmentCompiler.compile(opcodes);

  var fn = new Function("dom0", 'return ' + program)(dom);

  return fn();
}

function hydratorFor(ast) {
  /* jshint evil: true */
  var hydrate = new HydrationOpcodeCompiler();
  var opcodes = hydrate.compile(ast);
  var hydrate2 = new HydrationCompiler();
  var program = hydrate2.compile(opcodes, []);
  return new Function("fragment", "context", "hooks", "env", "dom0", program);
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

test('hydrates a fragment with morph mustaches', function () {
  var ast = preprocess("<div>{{foo \"foo\" 3 blah bar=baz ack=\"syn\"}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast).cloneNode(true);
  var hydrate = hydratorFor(ast);

  var contentResolves = [];
  var context = {};
  var helpers = {};
  var hooks = {
    content: function(morph, path, context, params, options) {
      contentResolves.push({
        morph: morph,
        context: context,
        path: path,
        params: params,
        options: options
      });
    }
  };

  hydrate(fragment, context, hooks, helpers, dom);

  equal(contentResolves.length, 2);

  var foo = contentResolves[0];
  equal(foo.morph.parent(), fragment);
  equal(foo.context, context);
  equal(foo.path, 'foo');
  deepEqual(foo.params, ["foo",3,"blah"]);
  deepEqual(foo.options.types, ["string","number","id"]);
  deepEqual(foo.options.hash, {ack:"syn",bar:"baz"});
  deepEqual(foo.options.hashTypes, {ack:"string",bar:"id"});
  equal(foo.options.escaped, true);

  var baz = contentResolves[1];
  equal(baz.morph.parent(), fragment);
  equal(baz.context, context);
  equal(baz.path, 'baz');
  equal(baz.params.length, 0);
  equal(baz.options.escaped, true);

  foo.morph.update('A');
  baz.morph.update('B');

  equalHTML(fragment, "<div>A bar B</div>");
});

test('test auto insertion of text nodes for needed edges a fragment with morph mustaches', function () {
  var ast = preprocess("{{first}}<p>{{second}}</p>{{third}}");
  var fragment = fragmentFor(ast).cloneNode(true);
  var hydrate = hydratorFor(ast);

  var morphs = [];
  var fakeMorphDOM = new DOMHelper(null, document);
  fakeMorphDOM.createMorph = function(start, startIndex, endIndex){
    var morph = DOMHelper.prototype.createMorph.call(
      this, start, startIndex, endIndex);
    morphs.push(morph);
    return morph;
  };

  var contentResolves = [];
  var context = {};
  var helpers = {};
  var hooks = {
    content: function(morph, path, context, params, options) {
      contentResolves.push({
        morph: morph,
        context: context,
        path: path,
        params: params,
        options: options
      });
    }
  };

  hydrate(fragment, context, hooks, helpers, fakeMorphDOM);

  equal(morphs.length, 3);

  var t = morphs[0].start;
  equal(t.nodeType, 3);
  equal(t.textContent , '');
  equal(morphs[1].start, null);
  equal(morphs[1].end, null);

  equal(morphs[2].start, morphs[1].parent());
  equal(morphs[2].end.nodeType, 3);
  equal(morphs[2].end.textContent, '');

  morphs[0].update('A');
  morphs[1].update('B');
  morphs[2].update('C');

  equalHTML(fragment, "A<p>B</p>C");
});
