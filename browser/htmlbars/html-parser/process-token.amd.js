define(
  ["htmlbars/ast","simple-html-tokenizer","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var HTMLElement = __dependency1__.HTMLElement;
    var BlockElement = __dependency1__.BlockElement;
    var Chars = __dependency2__.Chars;
    var StartTag = __dependency2__.StartTag;
    var EndTag = __dependency2__.EndTag;

    function processToken(processor, stack, token) {
      // EOF
      if (token === undefined) { return; }
      return handlers[token.type](token, currentElement(stack), stack);
    }

    function currentElement(stack) {
      return stack[stack.length - 1];
    }

    var handlers = {
      Chars: function(token, current) {
        current.appendChild(token.chars);
      },

      StartTag: function(tag, current, stack) {
        var element = new HTMLElement(tag.tagName, tag.attributes, [], tag.helpers);
        stack.push(element);
      },

      block: function(block, current, stack) {
        stack.push(new BlockElement(block.mustache));
      },

      EndTag: function(tag, current, stack) {
        if (current.tag !== tag.tagName) {
          throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + current.tag);
        }

        var value = config.processHTMLMacros(current)
        stack.pop();

        if (value === 'veto') { return; }

        var parent = currentElement(stack);
        parent.appendChild(value || currentElement);
      }
    };


    var config = {
      processHTMLMacros: function() {}
    };

    __exports__.processToken = processToken;
    __exports__.config = config;
  });
