import { buildProgram, buildComponent, buildElement, buildComment, buildText } from "./builders";
import {
  appendChild,
  parseComponentBlockParams
} from "./utils";
import voidMap from '../htmlbars-util/void-tag-names';

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
    var element = buildElement(tag.tagName, tag.attributes, tag.modifiers || [], []);
    element.loc = {
      start: { line: tag.firstLine, column: tag.firstColumn},
      end: { line: null, column: null}
    };

    this.elementStack.push(element);
    if (voidMap.hasOwnProperty(tag.tagName) || tag.selfClosing) {
      tokenHandlers.EndTag.call(this, tag, true);
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
        tokenizer.addElementModifier(mustache);
        tokenizer.state = "beforeAttributeName";
        return;
      case "beforeAttributeName":
        tokenizer.addElementModifier(mustache);
        return;
      case "attributeName":
      case "afterAttributeName":
        tokenizer.finalizeAttributeValue();
        tokenizer.addElementModifier(mustache);
        tokenizer.state = "beforeAttributeName";
        return;
      case "afterAttributeValueQuoted":
        tokenizer.addElementModifier(mustache);
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

  EndTag: function(tag, selfClosing) {
    var element = this.elementStack.pop();
    var parent = this.currentElement();
    var disableComponentGeneration = this.options.disableComponentGeneration === true;

    validateEndTag(tag, element, selfClosing);

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

function validateEndTag(tag, element, selfClosing) {
  var error;

  if (voidMap[tag.tagName] && !selfClosing) {
    // EngTag is also called by StartTag for void and self-closing tags (i.e.
    // <input> or <br />, so we need to check for that here. Otherwise, we would
    // throw an error for those cases.
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
