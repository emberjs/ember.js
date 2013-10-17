import { Tokenizer, Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { HTMLElement, BlockElement } from "htmlbars/ast";
import { processToken } from "htmlbars/html-parser/process-token";
import Handlebars from "handlebars";

function Visitor() {}

Visitor.prototype = {
  constructor: Visitor,

  accept: function(node) {
    return this[node.type](node);
  }
};

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
var processor = HTMLProcessor.prototype = Object.create(Visitor.prototype);

processor.program = function(program) {
  var statements = program.statements;

  for (var i=0, l=statements.length; i<l; i++) {
    this.accept(statements[i]);
  }

  process(this, this.tokenizer.tokenizeEOF());

  // return the children of the top-level document fragment
  return this.elementStack[0].children;
};

processor.block = function(block) {
  switchToHandlebars(this);

  process(this, block);

  if (block.program) {
    this.accept(block.program);
  }

  var blockNode = this.elementStack.pop();
  currentElement(this).children.push(blockNode);
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
