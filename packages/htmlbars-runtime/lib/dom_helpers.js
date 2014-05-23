import { merge } from "./utils";

export function domHelpers(extensions) {
  var base = {
    appendText: function(element, text) {
      element.appendChild(document.createTextNode(text));
    },

    setAttribute: function(element, name, value) {
      element.setAttribute(name, value);
    },

    createElement: function(tagName) {
      return document.createElement(tagName);
    },

    createDocumentFragment: function() {
      return document.createDocumentFragment();
    },

    createTextNode: function(text) {
      return document.createTextNode(text);
    }
  };

  return extensions ? merge(extensions, base) : base;
}
