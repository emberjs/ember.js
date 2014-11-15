import { FragmentOpcodeCompiler } from "../htmlbars-compiler/compiler/fragment_opcode";
import { HydrationOpcodeCompiler } from "../htmlbars-compiler/compiler/hydration_opcode";
import { FragmentCompiler } from "../htmlbars-compiler/compiler/fragment";
import { HydrationCompiler } from "../htmlbars-compiler/compiler/hydration";
import { DOMHelper } from "../morph";
import { preprocess } from "../htmlbars-compiler/parser";
import { equalHTML } from "../htmlbars-test-helpers";

var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace = "http://www.w3.org/2000/svg";

function fragmentFor(ast) {
  /* jshint evil: true */
  var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
      fragmentCompiler = new FragmentCompiler();

  var opcodes = fragmentOpcodeCompiler.compile(ast);
  var program = fragmentCompiler.compile(opcodes);

  var fn = new Function("dom", 'return ' + program)();

  return fn(new DOMHelper());
}

function hydratorFor(ast) {
  /* jshint evil: true */
  var hydrate = new HydrationOpcodeCompiler();
  var opcodes = hydrate.compile(ast);
  var hydrate2 = new HydrationCompiler();
  var program = hydrate2.compile(opcodes, []);
  return new Function("fragment", "context", "dom", "hooks", "env", "contextualElement", program);
}

QUnit.module('fragment');

test('compiles a fragment', function () {
  var ast = preprocess("<div>{{foo}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast);

  equalHTML(fragment, "<div> bar </div>");
});

test('compiles an svg fragment', function () {
  var ast = preprocess("<div><svg><circle/><foreignObject><span></span></foreignObject></svg></div>");
  var fragment = fragmentFor(ast);

  equal( fragment.childNodes[0].namespaceURI, svgNamespace,
         'svg has the right namespace' );
  equal( fragment.childNodes[0].childNodes[0].namespaceURI, svgNamespace,
         'circle has the right namespace' );
  equal( fragment.childNodes[0].childNodes[1].namespaceURI, svgNamespace,
         'foreignObject has the right namespace' );
  equal( fragment.childNodes[0].childNodes[1].childNodes[0].namespaceURI, xhtmlNamespace,
         'span has the right namespace' );
});

test('compiles an svg element with classes', function () {
  var ast = preprocess('<svg class="red right hand"></svg>');
  var fragment = fragmentFor(ast);

  equal(fragment.getAttribute('class'), 'red right hand');
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
  var env = {
    dom: new DOMHelper(),
    hooks: {
      content: function(morph, path, context, params, hash, options) {
        contentResolves.push({
          morph: morph,
          context: context,
          path: path,
          params: params,
          hash: hash,
          options: options
        });
      }
    }
  };

  hydrate(fragment, context, env.dom, env.hooks, env);

  equal(contentResolves.length, 2);

  var foo = contentResolves[0];
  equal(foo.morph.parent(), fragment);
  equal(foo.context, context);
  equal(foo.path, 'foo');
  deepEqual(foo.params, ["foo",3,"blah"]);
  deepEqual(foo.hash, {ack:"syn",bar:"baz"});
  deepEqual(foo.options.types, ["string","number","id"]);
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
  var dom = new DOMHelper();
  var fragment = dom.cloneNode(fragmentFor(ast), true);
  var hydrate = hydratorFor(ast);

  var morphs = [];
  var fakeMorphDOM = new DOMHelper();
  fakeMorphDOM.createMorphAt = function(){
    var morph = dom.createMorphAt.apply(this, arguments);
    morphs.push(morph);
    return morph;
  };

  var contentResolves = [];
  var context = {};
  var env = {
    dom: fakeMorphDOM,
    hooks: {
      content: function(morph, path, context, params, options) {
        contentResolves.push({
          morph: morph,
          context: context,
          path: path,
          params: params,
          options: options
        });
      }
    }
  };

  hydrate(fragment, context, env.dom, env.hooks, env, document.body);

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
