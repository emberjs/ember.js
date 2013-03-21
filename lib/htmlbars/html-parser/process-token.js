import { HTMLElement, BlockElement } from "htmlbars/ast";
import { Chars, StartTag, EndTag } from "simple-html-tokenizer";

function processToken(processor, stack, token) {
  // EOF
  if (token === undefined) { return; }
  return handlers[token.type](token, currentElement(stack), stack);
}

var handlers = {
  Chars: function(token, current) {
    current.children.push(token.chars);
  },

  StartTag: function(tag, current, stack) {
    var element = new HTMLElement(tag.tagName, tag.attributes, [], tag.helpers);
    stack.push(element);
  },

  EndTag: function(tag, current, stack) {
    if (current.tag === tag.tagName) {
      var value = config.processHTMLMacros(current)
      stack.pop();

      if (value === 'veto') { return; }

      var parent = currentElement(stack);
      parent.appendChild(value || currentElement);
    } else {
      throw new Error("Closing tag " + token.tagName + " did not match last open tag " + currentElement.tag);
    }
  },

  block: function(block, current, stack) {
    stack.push(new BlockElement(block.mustache));
  }
}

function currentElement(stack) {
  return stack[stack.length - 1];
}

export { processToken };

var config = {
  processHTMLMacros: function() {}
};

export { config };