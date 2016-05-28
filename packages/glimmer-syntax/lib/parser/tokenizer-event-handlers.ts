import { voidMap } from 'glimmer-util';
import b from "../builders";
import { appendChild, parseElementBlockParams } from "../utils";

export default {
  reset: function() {
    this.currentNode = null;
  },

  // Comment

  beginComment: function() {
    this.currentNode = b.comment("");
    this.currentNode.loc = {
      source: null,
      start: b.pos(this.tagOpenLine, this.tagOpenColumn),
      end: null
    };
  },

  appendToCommentData: function(char) {
    this.currentNode.value += char;
  },

  finishComment: function() {
    this.currentNode.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);

    appendChild(this.currentElement(), this.currentNode);
  },

  // Data

  beginData: function() {
    this.currentNode = b.text();
    this.currentNode.loc = {
      source: null,
      start: b.pos(this.tokenizer.line, this.tokenizer.column),
      end: null
    };
  },

  appendToData: function(char) {
    this.currentNode.chars += char;
  },

  finishData: function() {
    this.currentNode.loc.end = b.pos(this.tokenizer.line, this.tokenizer.column);

    appendChild(this.currentElement(), this.currentNode);
  },

  // Tags - basic

  tagOpen: function() {
    this.tagOpenLine = this.tokenizer.line;
    this.tagOpenColumn = this.tokenizer.column;
  },

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
    let { line, column } = this.tokenizer;

    let tag = this.currentNode;
    tag.loc = b.loc(this.tagOpenLine, this.tagOpenColumn, line, column);

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

    let loc = b.loc(this.tagOpenLine, this.tagOpenColumn);
    let element = b.element(name, attributes, modifiers, [], loc);
    this.elementStack.push(element);
  },

  finishEndTag: function(isVoid) {
    let tag = this.currentNode;

    let element = this.elementStack.pop();
    let parent = this.currentElement();

    validateEndTag(tag, element, isVoid);

    element.loc.end.line = this.tokenizer.line;
    element.loc.end.column = this.tokenizer.column;

    parseElementBlockParams(element);
    appendChild(parent, element);
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
      isDynamic: false,
      start: b.pos(this.tokenizer.line, this.tokenizer.column),
      valueStartLine: null,
      valueStartColumn: null
    };
  },

  appendToAttributeName: function(char) {
    this.currentAttribute.name += char;
  },

  beginAttributeValue: function(isQuoted) {
    this.currentAttribute.isQuoted = isQuoted;
    this.currentAttribute.valueStartLine = this.tokenizer.line;
    this.currentAttribute.valueStartColumn = this.tokenizer.column;
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
    let { name, parts, isQuoted, isDynamic, valueStartLine, valueStartColumn } = this.currentAttribute;
    let value = assembleAttributeValue(parts, isQuoted, isDynamic, this.tokenizer.line);
    value.loc = b.loc(
      valueStartLine, valueStartColumn,
      this.tokenizer.line, this.tokenizer.column
    );

    let loc = b.loc(
      this.currentAttribute.start.line, this.currentAttribute.start.column,
      this.tokenizer.line, this.tokenizer.column
    );

    let attribute = b.attr(name, value, loc);

    this.currentNode.attributes.push(attribute);
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
      parts[i] = b.text(parts[i]);
    } else {
      if (part.type !== 'MustacheStatement') {
        throw new Error("Unsupported node in quoted attribute value: " + part.type);
      }
    }
  }

  return b.concat(parts);
}

function validateEndTag(tag, element, selfClosing) {
  let error;

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
