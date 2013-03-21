define(
  ["htmlbars/parser","htmlbars/compiler","htmlbars/macros","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __exports__) {
    "use strict";
    var preprocess = __dependency1__.preprocess;
    var HTMLElement = __dependency1__.HTMLElement;
    var BlockElement = __dependency1__.BlockElement;
    var compile = __dependency2__.compile;
    var removeHelper = __dependency2__.removeHelper;
    var registerHelper = __dependency2__.registerHelper;
    var registerMacro = __dependency3__.registerMacro;
    var removeMacro = __dependency3__.removeMacro;

    __exports__.preprocess = preprocess;
    __exports__.compile = compile;
    __exports__.HTMLElement = HTMLElement;
    __exports__.BlockElement = BlockElement;
    __exports__.removeHelper = removeHelper;
    __exports__.registerHelper = registerHelper;
    __exports__.removeMacro = removeMacro;
    __exports__.registerMacro = registerMacro;
  });
