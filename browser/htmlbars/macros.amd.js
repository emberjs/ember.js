define(
  ["htmlbars/html-parser/process-token","htmlbars/ast","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var config = __dependency1__.config;
    var HTMLElement = __dependency2__.HTMLElement;

    var htmlMacros = {};

    var __export1__ = function registerMacro(name, test, mutate) {
      htmlMacros[name] = { test: test, mutate: mutate };
    };

    var __export2__ = function removeMacro(name) {
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
    __exports__.registerMacro = __export1__;
    __exports__.removeMacro = __export2__;
  });
