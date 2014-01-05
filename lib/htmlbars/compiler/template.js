import { Fragment } from "htmlbars/compiler/fragment";
import { HydrationCompiler } from "htmlbars/compiler/hydration";
import { Hydration2 } from "htmlbars/compiler/hydration2";
import { Fragment2 } from "htmlbars/compiler/fragment2";
import { preprocess } from "htmlbars/parser";
import { compileAST } from "htmlbars/compiler/compile";
import { domHelpers } from "htmlbars/runtime";
import { Range } from "htmlbars/runtime/range";

function TemplateCompiler(options) {

}

TemplateCompiler.prototype = {
  compile: function(html, options) {
    var ast = preprocess(html, options),
        fragmentCompiler = new Fragment(options),
        hydrationCompiler = new HydrationCompiler(compileAST, options),
        compiler2 = new Fragment2(compileAST, options),
        hydration2 = new Hydration2(compileAST, options);

    fragmentCompiler.compile(ast);
    hydrationCompiler.compile(ast);

    var fragmentFn = compiler2.compile(fragmentCompiler.opcodes, {
      children: fragmentCompiler.children
    })(domHelpers({}));

    var hydrationFn = hydration2.compile(hydrationCompiler.opcodes, {
      children: hydrationCompiler.children
    })(Range);

    var cachedFragment;

    return function templateFunction(context, options) {
      if (!cachedFragment) {
        cachedFragment = fragmentFn(context, options);
      }

      var clone = cachedFragment.cloneNode(true);
      var mustacheInfos = hydrationFn(clone);
      var helpers = options && options.helpers || {};

      var mustacheInfo;
      for (var i = 0, l = mustacheInfos.length; i < l; i++) {
        mustacheInfo = mustacheInfos[i];

        var helperOptions = mustacheInfo[2];
        helperOptions.helpers = helpers;
        if (!helperOptions.element) { helperOptions.element = helperOptions.range; }

        helpers.RESOLVE(context, mustacheInfo[0], mustacheInfo[1], helperOptions);
      }

      return clone;
    };
  }
};

export { TemplateCompiler };
