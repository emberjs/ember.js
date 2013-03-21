define(
  ["htmlbars/parser","htmlbars/ast","htmlbars/compiler","htmlbars/macros","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var HTMLElement = __dependency2__.HTMLElement;
    var BlockElement = __dependency2__.BlockElement;
    var compile = __dependency3__.compile;
    var removeHelper = __dependency3__.removeHelper;
    var registerHelper = __dependency3__.registerHelper;
    var registerMacro = __dependency4__.registerMacro;
    var removeMacro = __dependency4__.removeMacro;

    __exports__.preprocess = preprocess;
    __exports__.compile = compile;
    __exports__.HTMLElement = HTMLElement;
    __exports__.BlockElement = BlockElement;
    __exports__.removeHelper = removeHelper;
    __exports__.registerHelper = registerHelper;
    __exports__.removeMacro = removeMacro;
    __exports__.registerMacro = registerMacro;
  });
