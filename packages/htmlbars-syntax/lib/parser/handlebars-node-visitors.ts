import b from "../builders";
import { appendChild } from "../utils";

export default {

  Program: function(program) {
    var body = [];
    var node = b.program(body, program.blockParams, program.loc);
    var i, l = program.body.length;

    this.elementStack.push(node);

    if (l === 0) { return this.elementStack.pop(); }

    for (i = 0; i < l; i++) {
      this.acceptNode(program.body[i]);
    }

    // Ensure that that the element stack is balanced properly.
    var poppedNode = this.elementStack.pop();
    if (poppedNode !== node) {
      throw new Error("Unclosed element `" + poppedNode.tag + "` (on line " + poppedNode.loc.start.line + ").");
    }

    return node;
  },

  BlockStatement: function(block) {
    delete block.inverseStrip;
    delete block.openString;
    delete block.closeStrip;

    if (this.tokenizer.state === 'comment') {
      this.appendToCommentData('{{' + this.sourceForMustache(block) + '}}');
      return;
    }

    if (this.tokenizer.state !== 'comment' && this.tokenizer.state !== 'data' && this.tokenizer.state !== 'beforeData') {
      throw new Error("A block may only be used inside an HTML element or another block.");
    }

    block = acceptCommonNodes(this, block);
    var program = block.program ? this.acceptNode(block.program) : null;
    var inverse = block.inverse ? this.acceptNode(block.inverse) : null;

    var node = b.block(block.path, block.params, block.hash, program, inverse, block.loc);
    var parentProgram = this.currentElement();
    appendChild(parentProgram, node);
  },

  MustacheStatement: function(rawMustache) {
    let tokenizer = this.tokenizer;
    let { path, params, hash, escaped, loc } = rawMustache;
    let mustache = b.mustache(path, params, hash, !escaped, loc);

    if (tokenizer.state === 'comment') {
      this.appendToCommentData('{{' + this.sourceForMustache(mustache) + '}}');
      return;
    }

    acceptCommonNodes(this, mustache);

    switch (tokenizer.state) {
      // Tag helpers
      case "tagName":
        addElementModifier(this.currentNode, mustache);
        tokenizer.state = "beforeAttributeName";
        break;
      case "beforeAttributeName":
        addElementModifier(this.currentNode, mustache);
        break;
      case "attributeName":
      case "afterAttributeName":
        this.beginAttributeValue(false);
        this.finishAttributeValue();
        addElementModifier(this.currentNode, mustache);
        tokenizer.state = "beforeAttributeName";
        break;
      case "afterAttributeValueQuoted":
        addElementModifier(this.currentNode, mustache);
        tokenizer.state = "beforeAttributeName";
        break;

      // Attribute values
      case "beforeAttributeValue":
        appendDynamicAttributeValuePart(this.currentAttribute, mustache);
        tokenizer.state = 'attributeValueUnquoted';
        break;
      case "attributeValueDoubleQuoted":
      case "attributeValueSingleQuoted":
      case "attributeValueUnquoted":
        appendDynamicAttributeValuePart(this.currentAttribute, mustache);
        break;

      // TODO: Only append child when the tokenizer state makes
      // sense to do so, otherwise throw an error.
      default:
        appendChild(this.currentElement(), mustache);
    }


    return mustache;
  },

  ContentStatement: function(content) {
    var changeLines = 0;
    if (content.rightStripped) {
      changeLines = leadingNewlineDifference(content.original, content.value);
    }

    this.tokenizer.line = this.tokenizer.line + changeLines;
    this.tokenizer.tokenizePart(content.value);
    this.tokenizer.flushData();
  },

  CommentStatement: function(comment) {
    return comment;
  },

  PartialStatement: function(partial) {
    appendChild(this.currentElement(), partial);
    return partial;
  },

  SubExpression: function(sexpr) {
    return acceptCommonNodes(this, sexpr);
  },

  PathExpression: function(path) {
    delete path.data;
    delete path.depth;

    return path;
  },

  Hash: function(hash) {
    for (var i = 0; i < hash.pairs.length; i++) {
      this.acceptNode(hash.pairs[i].value);
    }

    return hash;
  },

  StringLiteral: function() {},
  BooleanLiteral: function() {},
  NumberLiteral: function() {},
  UndefinedLiteral: function() {},
  NullLiteral: function() {}
};

function leadingNewlineDifference(original, value) {
  if (value === '') {
    // if it is empty, just return the count of newlines
    // in original
    return original.split("\n").length - 1;
  }

  // otherwise, return the number of newlines prior to
  // `value`
  var difference = original.split(value)[0];
  var lines = difference.split(/\n/);

  return lines.length - 1;
}

function acceptCommonNodes(compiler, node) {
  compiler.acceptNode(node.path);

  if (node.params) {
    for (var i = 0; i < node.params.length; i++) {
      compiler.acceptNode(node.params[i]);
    }
  } else {
    node.params = [];
  }

  if (node.hash) {
    compiler.acceptNode(node.hash);
  } else {
    node.hash = b.hash();
  }

  return node;
}

function addElementModifier(element, mustache) {
  let { path, params, hash, loc } = mustache;
  let modifier = b.elementModifier(path, params, hash, loc);
  element.modifiers.push(modifier);
}

function appendDynamicAttributeValuePart(attribute, part) {
  attribute.isDynamic = true;
  attribute.parts.push(part);
}
