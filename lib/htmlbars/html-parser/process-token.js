import { HTMLElement, BlockElement } from "htmlbars/ast";

/**
  @param {String} state the current state of the tokenizer
  @param {Array} stack the element stack
  @token {Token} token the current token being built
  @child {Token|Mustache|Block} child the new token to insert into the AST
*/
export function processToken(state, stack, token, child, macros) {
  // EOF
  if (child === undefined) { return; }
  return handlers[child.type](child, currentElement(stack), stack, token, state, macros);
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
};

var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
var voidMap = {};

voidTagNames.split(" ").forEach(function(tagName) {
  voidMap[tagName] = true;
});

// Except for `mustache`, all tokens are only allowed outside of
// a start or end tag.
var handlers = {
  Chars: function(token, current) {
    current.appendChild(token.chars);
  },

  StartTag: function(tag, current, stack) {
    var element = new HTMLElement(tag.tagName, tag.attributes, [], tag.helpers);
    stack.push(element);

    if (voidMap.hasOwnProperty(tag.tagName)) {
      this.EndTag(tag, element, stack);
    }
  },

  block: function(block, current, stack) {
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

  EndTag: function(tag, current, stack, token, state, macros) {
    if (current.tag !== tag.tagName) {
      throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + current.tag);
    }

    var value = config.processHTMLMacros(current, macros);
    stack.pop();

    if (value === 'veto') { return; }

    var parent = currentElement(stack);
    parent.appendChild(value || current);
  }
};

var config = {
  processHTMLMacros: function() {}
};

export { config };
