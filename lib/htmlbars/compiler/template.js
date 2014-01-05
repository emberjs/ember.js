import { Fragment } from "htmlbars/compiler/fragment_opcode";
import { HydrationCompiler } from "htmlbars/compiler/hydration_opcode";
import { Hydration2 } from "htmlbars/compiler/hydration2";
import { Fragment2 } from "htmlbars/compiler/fragment2";
import { preprocess } from "htmlbars/parser";
import { domHelpers } from "htmlbars/runtime";
import { Range } from "htmlbars/runtime/range";

function compileAST(ast, options) {
  var fragmentCompiler = new Fragment(options),
      hydrationCompiler = new HydrationCompiler(compileAST, options),
      fragment2 = new Fragment2(),
      hydration2 = new Hydration2();

  var fragmentOpcodeTree = fragmentCompiler.compile(ast);
  var hydrationOpcodeTree = hydrationCompiler.compile(ast);

  var dom = domHelpers({});
  function closeOverDOM(tree) {
    var children = tree.children;
    tree.fn = tree.fn(dom);
    for (var i=0; i<children.length; i++) {
      closeOverDOM(children[i]);
    }
  }

  var fragmentFnTree = fragment2.compile(fragmentOpcodeTree);
  closeOverDOM(fragmentFnTree);

  function closeOverRange(tree) {
    var children = tree.children;
    tree.fn = tree.fn(Range);
    for (var i=0; i<children.length; i++) {
      closeOverRange(children[i]);
    }
  }
  var hydrationFnTree = hydration2.compile(hydrationOpcodeTree);
  closeOverRange(hydrationFnTree);

  function buildTemplate(fragmentFnTree, hydrationFnTree) {
    var childTemplates = [];
    for (var i=0, l=fragmentFnTree.children.length; i<l; i++) {
      childTemplates.push(buildTemplate(fragmentFnTree.children[i], hydrationFnTree.children[i]));
    }

    var cachedFragment;
    return function templateFunction(context, options) {
      if (!cachedFragment) {
        cachedFragment = fragmentFnTree.fn(context, options);
      }

      var clone = cachedFragment.cloneNode(true);
      var mustacheInfos = hydrationFnTree.fn(clone, childTemplates);
      var helpers = options && options.helpers || {};

      var mustacheInfo;
      for (var i = 0, l = mustacheInfos.length; i < l; i++) {
        mustacheInfo = mustacheInfos[i];
        var name = mustacheInfo[0],
            params = mustacheInfo[1],
            helperOptions = mustacheInfo[2];
        helperOptions.helpers = helpers;
        if (!helperOptions.element) { helperOptions.element = helperOptions.range; }

        if (name === 'ATTRIBUTE') {
          helpers.ATTRIBUTE(context, helperOptions.name, params, helperOptions);
        } else {
          helpers.RESOLVE(context, name, params, helperOptions);
        }
      }

      return clone;
    };
  }

  return buildTemplate(fragmentFnTree, hydrationFnTree);
}

function TemplateCompiler(options) {

}

TemplateCompiler.prototype = {
  compile: function(html, options) {
    var ast = preprocess(html, options);
    return compileAST(ast);
  }
};

export { TemplateCompiler };
