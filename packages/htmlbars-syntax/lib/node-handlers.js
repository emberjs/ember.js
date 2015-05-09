import { buildProgram, buildBlock, buildHash } from "./builders";
import { forEach } from "../htmlbars-util/array-utils";
import { appendChild } from "./utils";

var nodeHandlers = {

  Program: function(program) {
    var body = [];
    var node = buildProgram(body, program.blockParams, program.loc);
    var i, l = program.body.length;

    this.elementStack.push(node);

    if (l === 0) { return this.elementStack.pop(); }

    for (i = 0; i < l; i++) {
      this.acceptNode(program.body[i]);
    }

    this.acceptToken(this.tokenizer.tokenizeEOF());

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
      this.tokenizer.addChar('{{' + this.sourceForMustache(block) + '}}');
      return;
    }

    switchToHandlebars(this);
    this.acceptToken(block);

    block = acceptCommonNodes(this, block);
    var program = block.program ? this.acceptNode(block.program) : null;
    var inverse = block.inverse ? this.acceptNode(block.inverse) : null;

    var node = buildBlock(block.path, block.params, block.hash, program, inverse);
    var parentProgram = this.currentElement();
    appendChild(parentProgram, node);
  },

  MustacheStatement: function(mustache) {
    delete mustache.strip;

    if (this.tokenizer.state === 'comment') {
      this.tokenizer.addChar('{{' + this.sourceForMustache(mustache) + '}}');
      return;
    }

    acceptCommonNodes(this, mustache);
    switchToHandlebars(this);
    this.acceptToken(mustache);

    return mustache;
  },

  ContentStatement: function(content) {
    var changeLines = 0;
    if (content.rightStripped) {
      changeLines = leadingNewlineDifference(content.original, content.value);
    }

    this.tokenizer.line = this.tokenizer.line + changeLines;

    var tokens = this.tokenizer.tokenizePart(content.value);

    return forEach(tokens, this.acceptToken, this);
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

function switchToHandlebars(processor) {
  var token = processor.tokenizer.token;

  if (token && token.type === 'Chars') {
    processor.acceptToken(token);
    processor.tokenizer.token = null;
  }
}

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
    node.hash = buildHash();
  }

  return node;
}

export default nodeHandlers;
