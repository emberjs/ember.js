define(
  ["htmlbars/ast","simple-html-tokenizer","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var HTMLElement = __dependency1__.HTMLElement;
    var BlockElement = __dependency1__.BlockElement;
    var Chars = __dependency2__.Chars;
    var StartTag = __dependency2__.StartTag;
    var EndTag = __dependency2__.EndTag;

    /**
      @param {String} state the current state of the tokenizer
      @param {Array} stack the element stack
      @token {Token} token the current token being built
      @child {Token|Mustache|Block} child the new token to insert into the AST
    */
    function processToken(state, stack, token, child) {
      // EOF
      if (child === undefined) { return; }
      return handlers[child.type](child, currentElement(stack), stack, token, state);
    }

    function currentElement(stack) {
      return stack[stack.length - 1];
    }

    // This table maps from the state names in the tokenizer to a smaller
    // number of states that control how mustaches are handled
    var states = {
      "attributeValueDoubleQuoted": "attr",
      "attributeValueSingleQuoted": "attr",
      "attributeValueUnquoted": "attr",
      "beforeAttributeName": "in-tag"
    }

    // Except for `mustache`, all tokens are only allowed outside of
    // a start or end tag.
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

      mustache: function(mustache, current, stack, token, state) {
        switch(states[state]) {
          case "attr":
            token.addToAttributeValue(mustache);
            return;
          case "in-tag":
            token.addTagHelper(mustache);
            return;
          default:
            current.appendChild(mustache);
        }
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
