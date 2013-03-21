define(
  ["htmlbars/parser","htmlbars/ast","htmlbars/compiler-pass1","htmlbars/compiler-pass2","htmlbars/compiler-utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var Compiler1 = __dependency3__.Compiler1;
    var Compiler2 = __dependency4__.Compiler2;
    var processOpcodes = __dependency5__.processOpcodes;
    var prepareHelper = __dependency5__.prepareHelper;
    var compileAST = __dependency5__.compileAST;
    var invokeMethod = __dependency5__.invokeMethod;
    var invokeFunction = __dependency5__.invokeFunction;
    var helper = __dependency5__.helper;
    var escapeString = __dependency5__.escapeString;
    var quotedString = __dependency5__.quotedString;
    var quotedArray = __dependency5__.quotedArray;
    var array = __dependency5__.array;
    var hash = __dependency5__.hash;
    var pushElement = __dependency5__.pushElement;
    var popElement = __dependency5__.popElement;
    var topElement = __dependency5__.topElement;
    var pushStack = __dependency5__.pushStack;
    var pushStackLiteral = __dependency5__.pushStackLiteral;
    var popStack = __dependency5__.popStack;
    var topStack = __dependency5__.topStack;

    function compile(string, options) {
      var ast = preprocess(string);
      return compileAST(ast, options);
    }


    __exports__.compile = compile;
  });
