define(
  ["htmlbars/parser","htmlbars/compiler/utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var compileAST = __dependency2__.compileAST;

    function compile(string, options) {
      var ast = preprocess(string);
      return compileAST(ast, options);
    }
    __exports__.compile = compile;
  });
