define(
  ["htmlbars/ast","simple-html-tokenizer","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var HTMLElement = __dependency1__.HTMLElement;
    var BlockElement = __dependency1__.BlockElement;
    var Chars = __dependency2__.Chars;
    var StartTag = __dependency2__.StartTag;
    var EndTag = __dependency2__.EndTag;

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


    var config = {
      processHTMLMacros: function() {}
    };

    __exports__.processToken = processToken;
    __exports__.config = config;
  });
