import voidMap from '../../htmlbars-util/void-tag-names';
import b from "../builders";
import { appendChild, parseComponentBlockParams, unwrapMustache } from "../utils";

export default {
  reset: function() {
    this.currentNode = null;
  },

  // Comment

  beginComment: function() {
    this.currentNode = b.comment("");
  },

  appendToCommentData: function(char) {
    this.currentNode.value += char;
  },

  finishComment: function() {
    appendChild(this.currentElement(), this.currentNode);
  },


  // Data

  beginData: function() {
    this.currentNode = b.text();
  },

  appendToData: function(char) {
    this.currentNode.chars += char;
  },

  finishData: function() {
    appendChild(this.currentElement(), this.currentNode);
  },

  // Tags - basic

  beginStartTag: function() {
    this.currentNode = {
      type: 'StartTag',
      name: "",
      attributes: [],
      modifiers: [],
      selfClosing: false,
      loc: null
    };
  },

  beginEndTag: function() {
    this.currentNode = {
      type: 'EndTag',
      name: "",
      attributes: [],
      modifiers: [],
      selfClosing: false,
      loc: null
    };
  },

  finishTag: function() {
    let { tagLine, tagColumn, line, column } = this.tokenizer;

    let tag = this.currentNode;
    tag.loc = b.loc(tagLine, tagColumn, line, column);
    
    if (tag.type === 'StartTag') {
      this.finishStartTag();

      if (voidMap.hasOwnProperty(tag.name) || tag.selfClosing) {
        this.finishEndTag(true);
      }
    } else if (tag.type === 'EndTag') {
      this.finishEndTag(false);
    }
  },

  finishStartTag: function() {
    let { name, attributes, modifiers } = this.currentNode;

    let loc = b.loc(this.tokenizer.tagLine, this.tokenizer.tagColumn);
    let element = b.element(name, attributes, modifiers, [], loc);
    this.elementStack.push(element);
  },

  finishEndTag: function(isVoid) {
    let tag = this.currentNode;

    let element = this.elementStack.pop();
    let parent = this.currentElement();
    let disableComponentGeneration = (this.options.disableComponentGeneration === true);

    validateEndTag(tag, element, isVoid);

    element.loc.end.line = this.tokenizer.line;
    element.loc.end.column = this.tokenizer.column;

    if (disableComponentGeneration || element.tag.indexOf("-") === -1) {
      appendChild(parent, element);
    } else {
      let program = b.program(element.children);
      parseComponentBlockParams(element, program);
      let component = b.component(element.tag, element.attributes, program, element.loc);
      appendChild(parent, component);
    }
  },

  markTagAsSelfClosing: function() {
    this.currentNode.selfClosing = true;
  },

  // Tags - name

  appendToTagName: function(char) {
    this.currentNode.name += char;
  },

  // Tags - attributes

  beginAttribute: function() {
    let tag = this.currentNode;
    if (tag.type === 'EndTag') {
       throw new Error(
        `Invalid end tag: closing tag must not have attributes, ` +
        `in \`${tag.name}\` (on line ${this.tokenizer.line}).`
      );
    }

    this.currentAttribute = {
      name: "",
      parts: [],
      isQuoted: false,
      isDynamic: false
    };
  },

  appendToAttributeName: function(char) {
    this.currentAttribute.name += char;
  },

  beginAttributeValue: function(isQuoted) {
    this.currentAttribute.isQuoted = isQuoted;
  },

  appendToAttributeValue: function(char) {
    let parts = this.currentAttribute.parts;

    if (typeof parts[parts.length - 1] === 'string') {
      parts[parts.length - 1] += char;
    } else {
      parts.push(char);
    }
  },

  finishAttributeValue: function() {
    let { name, parts, isQuoted, isDynamic } = this.currentAttribute;
    let value = assembleAttributeValue(parts, isQuoted, isDynamic, this.tokenizer.line);

    this.currentNode.attributes.push(b.attr(name, value));
  }
};

function assembleAttributeValue(parts, isQuoted, isDynamic, line) {
  if (isDynamic) {
    if (isQuoted) {
      return assembleConcatenatedValue(parts);
    } else {
      if (parts.length === 1) {
        return parts[0];
      } else {
        throw new Error(
          `An unquoted attribute value must be a string or a mustache, ` +
          `preceeded by whitespace or a '=' character, and ` +
          `followed by whitespace or a '>' character (on line ${line})`
        );
      }
    }
  } else {
    return b.text((parts.length > 0) ? parts[0] : "");
  }
}

function assembleConcatenatedValue(parts) {
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];

    if (typeof part === 'string') {
      parts[i] = b.string(parts[i]);
    } else {
      if (part.type === 'MustacheStatement') {
        parts[i] = unwrapMustache(part);
      } else {
        throw new Error("Unsupported node in quoted attribute value: " + part.type);
      }
    }
  }

  return b.concat(parts);
}

function validateEndTag(tag, element, selfClosing) {
  var error;

  if (voidMap[tag.name] && !selfClosing) {
    // EngTag is also called by StartTag for void and self-closing tags (i.e.
    // <input> or <br />, so we need to check for that here. Otherwise, we would
    // throw an error for those cases.
    error = "Invalid end tag " + formatEndTagInfo(tag) + " (void elements cannot have end tags).";
  } else if (element.tag === undefined) {
    error = "Closing tag " + formatEndTagInfo(tag) + " without an open tag.";
  } else if (element.tag !== tag.name) {
    error = "Closing tag " + formatEndTagInfo(tag) + " did not match last open tag `" + element.tag + "` (on line " +
            element.loc.start.line + ").";
  }

  if (error) { throw new Error(error); }
}

function formatEndTagInfo(tag) {
  return "`" + tag.name + "` (on line " + tag.loc.end.line + ")";
}
