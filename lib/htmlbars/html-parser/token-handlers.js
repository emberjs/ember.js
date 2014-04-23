import { ElementNode, TextNode, appendChild } from "htmlbars/ast";

// This table maps from the state names in the tokenizer to a smaller
// number of states that control how mustaches are handled
var states = {
  "beforeAttributeValue": "before-attr",
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
var tokenHandlers = {

  Chars: function(token) {
    var current = this.currentElement();
    var text = new TextNode(token.chars);
    appendChild(current, text);
  },

  StartTag: function(tag) {
    var element = new ElementNode(tag.tagName, tag.attributes, tag.helpers || [], []);
    this.elementStack.push(element);
    if (voidMap.hasOwnProperty(tag.tagName)) {
      tokenHandlers.EndTag.call(this, tag);
    }
  },

  block: function(block) {
    if (this.tokenizer.state !== 'data') {
      throw new Error("A block may only be used inside an HTML element or another block.");
    }
  },

  mustache: function(mustache) {
    var state = this.tokenizer.state;
    var token = this.tokenizer.token;

    switch(states[state]) {
      case "before-attr":
        this.tokenizer.state = 'attributeValueUnquoted';
        token.addToAttributeValue(mustache);
        return;
      case "attr":
        token.addToAttributeValue(mustache);
        return;
      case "in-tag":
        token.addTagHelper(mustache);
        return;
      default:
        appendChild(this.currentElement(), mustache);
    }
  },

  EndTag: function(tag) {
    var current = this.currentElement();

    if (current.tag !== tag.tagName) {
      throw new Error("Closing tag " + tag.tagName + " did not match last open tag " + current.tag);
    }

    this.elementStack.pop();
    appendChild(this.currentElement(), current);
  }

};

export default tokenHandlers;
