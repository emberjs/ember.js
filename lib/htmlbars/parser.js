import { Tokenizer, Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { HTMLElement, BlockElement } from "htmlbars/ast";
import { processToken } from "htmlbars/html-parser/process-token";
import Handlebars from "handlebars";

export function preprocess(html, options) {
  var ast = Handlebars.parse(html);
  return new HTMLProcessor(options || {}).accept(ast).children;
}

function HTMLProcessor(options) {
  this.elementStack = [];
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
  var el = new BlockElement();
  var node;

  this.elementStack.push(el);

  if (l === 0) return this.elementStack.pop();

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

  return this.elementStack.pop();
};

processor.block = function(block) {
  switchToHandlebars(this);

  process(this, block);

  var blockNode = this.accept(block.program);
  blockNode.helper = block.mustache;

  if (block.inverse) {
    var inverse = this.accept(block.inverse);
    blockNode.inverse = inverse.children;
  }

  var el = currentElement(this);

  el.appendChild(blockNode);
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
