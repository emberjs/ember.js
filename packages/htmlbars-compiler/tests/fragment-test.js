import FragmentOpcodeCompiler from "../htmlbars-compiler/fragment-opcode-compiler";
import FragmentJavaScriptCompiler from "../htmlbars-compiler/fragment-javascript-compiler";
import HydrationOpcodeCompiler from "../htmlbars-compiler/hydration-opcode-compiler";
import HydrationJavaScriptCompiler from "../htmlbars-compiler/hydration-javascript-compiler";
import { DOMHelper } from "../morph";
import { preprocess } from "../htmlbars-syntax/parser";
import { get } from "../htmlbars-runtime/hooks";
import { equalHTML } from "../htmlbars-test-helpers";

var xhtmlNamespace = "http://www.w3.org/1999/xhtml",
    svgNamespace = "http://www.w3.org/2000/svg";

function fragmentFor(ast) {
  /* jshint evil: true */
  var fragmentOpcodeCompiler = new FragmentOpcodeCompiler(),
      fragmentCompiler = new FragmentJavaScriptCompiler();

  var opcodes = fragmentOpcodeCompiler.compile(ast);
  var program = fragmentCompiler.compile(opcodes);

  var fn = new Function("dom", 'return ' + program)();

  return fn(new DOMHelper());
}

function hydratorFor(ast, cachedFragment) {
  /* jshint evil: true */
  var hydrate = new HydrationOpcodeCompiler();
  var opcodes = hydrate.compile(ast);
  var hydrate2 = new HydrationJavaScriptCompiler();
  var program = hydrate2.compile(opcodes, []);

  var hookVars = [];
  for (var hook in hydrate2.hooks) {
    hookVars.push(hook + ' = hooks.' + hook);
  }
  program =  'var ' + hookVars.join(', ') + ';\n' +
             'this.cachedFragment = ' + !!cachedFragment + ';\n' + program;
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
  var ast = preprocess("<div>{{foo \"bar\" 3 blah true bar=baz ack=\"syn\"}} bar {{baz}}</div>");
  var fragment = fragmentFor(ast).cloneNode(true);
  var hydrate = hydratorFor(ast);

  var contentResolves = [];
  function pushArgs(env, morph, context, path, params, hash) {
    contentResolves.push({
      morph: morph,
      context: context,
      path: path,
      params: params,
      hash: hash
    });
  }
  var context = { blah: "BLAH", baz: "BAZ" };
  var env = {
    dom: new DOMHelper(),
    hooks: {
      get: get,
      inline: pushArgs,
      content: pushArgs
    }
  };

  hydrate(fragment, context, env.dom, env.hooks, env);

  equal(contentResolves.length, 2);

  var foo = contentResolves[0];
  equal(foo.morph.escaped, true, 'morph escaped');
  equal(foo.morph.parent(), fragment, 'morph parent');
  equal(foo.context, context, 'context');
  equal(foo.path, 'foo', 'path');
  deepEqual(foo.params, ["bar",3,"BLAH", true], 'params');
  deepEqual(foo.hash, {ack:"syn",bar:"BAZ"}, 'hash');

  var baz = contentResolves[1];
  equal(baz.morph.escaped, true, 'morph escaped');
  equal(baz.morph.parent(), fragment, 'morph parent');
  equal(baz.context, context, 'context');
  equal(baz.path, 'baz', 'path');

  foo.morph.setContent('A');
  baz.morph.setContent('B');

  equalHTML(fragment, "<div>A bar B</div>");
});

test('test auto insertion of text nodes for needed edges a fragment with morph mustaches', function () {
  var ast = preprocess("{{first}}<p>{{second}}</p>{{third}}");
  var dom = new DOMHelper();
  var fragment = dom.cloneNode(fragmentFor(ast), true);
  var hydrate = hydratorFor(ast, true);

  var morphs = [];
  var fakeMorphDOM = new DOMHelper();
  fakeMorphDOM.createMorphAt = function(){
    var morph = dom.createMorphAt.apply(this, arguments);
    morphs.push(morph);
    return morph;
  };

  var contentResolves = [];
  function pushArgs(env, morph, context, path, params, hash) {
    contentResolves.push({
      morph: morph,
      context: context,
      path: path,
      params: params,
      hash: hash
    });
  }

  var context = {};
  var env = {
    dom: fakeMorphDOM,
    hooks: {
      get: get,
      inline: pushArgs,
      content: pushArgs
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

  morphs[0].setContent('A');
  morphs[1].setContent('B');
  morphs[2].setContent('C');

  equalHTML(fragment, "A<p>B</p>C");
});
