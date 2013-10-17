import { config } from "htmlbars/html-parser/process-token";
import { HTMLElement } from "htmlbars/ast";

var htmlMacros = {};

export function registerMacro(name, test, mutate) {
  htmlMacros[name] = { test: test, mutate: mutate };
}

export function removeMacro(name) {
  delete htmlMacros[name];
}

function processHTMLMacros(element, macros) {
  var mutated, newElement;

  macros = macros || htmlMacros;

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
