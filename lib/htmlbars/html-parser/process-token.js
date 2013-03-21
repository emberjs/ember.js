import { HTMLElement, BlockElement } from "htmlbars/ast";
import { Chars, StartTag, EndTag } from "simple-html-tokenizer";

function processToken(processor, elementStack, token) {
  var currentElement = elementStack[elementStack.length - 1];
  if (token instanceof Chars) {
    currentElement.children.push(token.chars);
  } else if (token instanceof EndTag) {
    if (currentElement.tag === token.tagName) {
      var value = config.processHTMLMacros(currentElement)
      elementStack.pop();

      if (value === undefined) {
        elementStack[elementStack.length - 1].children.push(currentElement);
      } else if (value instanceof HTMLElement) {
        elementStack[elementStack.length - 1].children.push(value);
      }
    } else {
      throw new Error("Closing tag " + token.tagName + " did not match last open tag " + currentElement.tag);
    }
  } else if (token instanceof StartTag) {
    var element = new HTMLElement(token.tagName, token.attributes);
    element.helpers = processor.pendingTagHelpers.slice();
    processor.pendingTagHelpers = [];
    elementStack.push(element);
  } else if (token instanceof Handlebars.AST.BlockNode) {
    elementStack.push(new BlockElement(token.mustache));
  }
}

export { processToken };

var config = {
  processHTMLMacros: function() {}
};

export { config };