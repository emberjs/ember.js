define(
  ["htmlbars/html-parser","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var HTMLElement = __dependency1__.HTMLElement;

    var htmlMacros = {};

    function registerMacro(name, test, mutate) {
      htmlMacros[name] = { test: test, mutate: mutate };
    };

    function removeMacro(name) {
      delete htmlMacros[name];
    }


    function processHTMLMacros(element) {
      var mutated, newElement;

      for (var prop in htmlMacros) {
        var macro = htmlMacros[prop];
        if (macro.test(element)) {
          newElement = macro.mutate(element);
          if (newElement === undefined) { newElement = element; }
          mutated = true;
          break;
        }
      }

      if (!mutated) {
        return element;
      } else if (newElement instanceof HTMLElement) {
        return processHTMLMacros(newElement);
      } else {
        return newElement;
      }
    }

    // configure the HTML Parser
    config.processHTMLMacros = processHTMLMacros;
    __exports__.registerMacro = registerMacro;
    __exports__.removeMacro = removeMacro;
  });
