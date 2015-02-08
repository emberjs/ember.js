import { forEach } from "../htmlbars-util/array-utils";
import { buildProgram, buildComponent, buildElement, buildComment, buildText } from "./builders";
import {
  appendChild,
  parseComponentBlockParams
} from "./utils";

// The HTML elements in this list are speced by
// http://www.w3.org/TR/html-markup/syntax.html#syntax-elements,
// and will be forced to close regardless of if they have a
// self-closing /> at the end.
var voidTagNames = "area base br col command embed hr img input keygen link meta param source track wbr";
var voidMap = {};

forEach(voidTagNames.split(" "), function(tagName) {
  voidMap[tagName] = true;
});

// Except for `mustache`, all tokens are only allowed outside of
// a start or end tag.
var tokenHandlers = {
  Comment: function(token) {
    var current = this.currentElement();
    var comment = buildComment(token.chars);
    appendChild(current, comment);
  },

  Chars: function(token) {
    var current = this.currentElement();
    var text = buildText(token.chars);
    appendChild(current, text);
  },

  StartTag: function(tag) {
    var element = buildElement(tag.tagName, tag.attributes, tag.helpers || [], []);
    element.loc = {
      start: { line: tag.firstLine, column: tag.firstColumn},
      end: { line: null, column: null}
    };

    this.elementStack.push(element);
    if (voidMap.hasOwnProperty(tag.tagName) || tag.selfClosing) {
      tokenHandlers.EndTag.call(this, tag);
    }
  },

  BlockStatement: function(/*block*/) {
    if (this.tokenizer.state === 'comment') {
      return;
    } else if (this.tokenizer.state !== 'data') {
      throw new Error("A block may only be used inside an HTML element or another block.");
    }
  },

  MustacheStatement: function(mustache) {
    var tokenizer = this.tokenizer;

    switch(tokenizer.state) {
      // Tag helpers
      case "tagName":
        tokenizer.addTagHelper(mustache);
        tokenizer.state = "beforeAttributeName";
        return;
      case "beforeAttributeName":
        tokenizer.addTagHelper(mustache);
        return;
      case "attributeName":
      case "afterAttributeName":
        tokenizer.finalizeAttributeValue();
        tokenizer.addTagHelper(mustache);
        tokenizer.state = "beforeAttributeName";
        return;
      case "afterAttributeValueQuoted":
        tokenizer.addTagHelper(mustache);
        tokenizer.state = "beforeAttributeName";
        return;

      // Attribute values
      case "beforeAttributeValue":
        tokenizer.markAttributeQuoted(false);
        tokenizer.addToAttributeValue(mustache);
        tokenizer.state = 'attributeValueUnquoted';
        return;
      case "attributeValueDoubleQuoted":
      case "attributeValueSingleQuoted":
      case "attributeValueUnquoted":
        tokenizer.addToAttributeValue(mustache);
        return;

      // TODO: Only append child when the tokenizer state makes
      // sense to do so, otherwise throw an error.
      default:
        appendChild(this.currentElement(), mustache);
    }
  },

  EndTag: function(tag) {
    var element = this.elementStack.pop();
    var parent = this.currentElement();
    var disableComponentGeneration = this.options.disableComponentGeneration === true;

    validateEndTag(tag, element);

    if (disableComponentGeneration || element.tag.indexOf("-") === -1) {
      appendChild(parent, element);
    } else {
      var program = buildProgram(element.children);
      parseComponentBlockParams(element, program);
      var component = buildComponent(element.tag, element.attributes, program);
      appendChild(parent, component);
    }

  }

};

function validateEndTag(tag, element) {
  var error;

  if (voidMap[tag.tagName] && element.tag === undefined) {
    // For void elements, we check element.tag is undefined because endTag is called by the startTag token handler in
    // the normal case, so checking only voidMap[tag.tagName] would lead to an error being thrown on the opening tag.
    error = "Invalid end tag " + formatEndTagInfo(tag) + " (void elements cannot have end tags).";
  } else if (element.tag === undefined) {
    error = "Closing tag " + formatEndTagInfo(tag) + " without an open tag.";
  } else if (element.tag !== tag.tagName) {
    error = "Closing tag " + formatEndTagInfo(tag) + " did not match last open tag `" + element.tag + "` (on line " +
            element.loc.start.line + ").";
  }

  if (error) { throw new Error(error); }
}

function formatEndTagInfo(tag) {
  return "`" + tag.tagName + "` (on line " + tag.lastLine + ")";
}

export default tokenHandlers;
