import { merge } from "htmlbars/utils";

export function domHelpers(helpers, extensions) {
  var base = {
    appendText: function(element, text) {
      element.appendChild(document.createTextNode(text));
    },

    setAttribute: function(element, name, value) {
      element.setAttribute(name, value);
    },

    createElement: function() {
      return document.createElement.apply(document, arguments);
    },

    createDocumentFragment: function() {
      return document.createDocumentFragment.apply(document, arguments);
    }
  };

  return extensions ? merge(extensions, base) : base;
}
