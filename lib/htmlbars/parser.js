import { Tokenizer, Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { HTMLElement, BlockElement } from "htmlbars/ast";
import { processToken } from "htmlbars/html-parser/process-token";
import Handlebars from "handlebars";

export function preprocess(html, options) {
  var ast = Handlebars.parse(html);
  return new HTMLProcessor(options || {}).accept(ast);
}

function HTMLProcessor(options) {
  // document fragment
  this.elementStack = [new HTMLElement()];
  this.tokenizer = new Tokenizer('');
  this.macros = options.macros;
}

// TODO: ES3 polyfill
var processor = HTMLProcessor.prototype;

processor.accept = function(node) {
  return this[node.type](node);
};

processor.program = function(program) {
  var statements = program.statements;
  var l=statements.length;
  var el = currentElement(this);
  var node;

  if (l === 0) return;

  node = statements[0];
  if (node.type === 'block' || node.type === 'mustache') {
    el.children.push('');
  }

  for (var i=0; i<l; i++) {
    this.accept(statements[i]);
  }
  process(this, this.tokenizer.tokenizeEOF());

  node = statements[l-1];
  if (node.type === 'block' || node.type === 'mustache') {
    el.children.push('');
  }

  // return the children of the top-level document fragment
  return this.elementStack[0].children;
};

processor.block = function(block) {
  switchToHandlebars(this);

  process(this, block);

  if (block.program) {
    this.accept(block.program);
  }

  this.tokenizer.token = null;
  this.elementStack.push(new BlockElement());

  if (block.inverse) {
    this.accept(block.inverse);
  }

  var inverse = this.elementStack.pop();
  var blockNode = this.elementStack.pop();

  blockNode.inverse = inverse.children;

  var el = currentElement(this),
      len = el.children.length,
      lastNode;

  if (len > 0) {
    lastNode = el.children[len - 1];
  }

  // Back to back BlockElements need an empty text node delimiter
  if (lastNode && blockNode instanceof BlockElement && lastNode instanceof BlockElement) {
    el.children.push('');
  }

  el.children.push(blockNode);
};

processor.content = function(content) {
  var tokens = this.tokenizer.tokenizePart(content.string);

  return tokens.forEach(function(token) {
    process(this, token);
  }, this);
};

processor.mustache = function(mustache) {
  switchToHandlebars(this);

  process(this, mustache);
};

function switchToHandlebars(compiler) {
  var token = compiler.tokenizer.token;

  // TODO: Monkey patch Chars.addChar like attributes
  if (token instanceof Chars) {
    process(compiler, token);
    compiler.tokenizer.token = null;
  }
}

function process(compiler, token) {
  var tokenizer = compiler.tokenizer;
  processToken(tokenizer.state, compiler.elementStack, tokenizer.token, token, compiler.macros);
}

function currentElement(processor) {
  var elementStack = processor.elementStack;
  return elementStack[elementStack.length - 1];
}

StartTag.prototype.addToAttributeValue = function(char) {
  var value = this.currentAttribute[1] = this.currentAttribute[1] || [];

  if (value.length && typeof value[value.length - 1] === 'string' && typeof char === 'string') {
    value[value.length - 1] += char;
  } else {
    value.push(char);
  }
};

StartTag.prototype.addTagHelper = function(helper) {
  var helpers = this.helpers = this.helpers || [];

  helpers.push(helper);
};
