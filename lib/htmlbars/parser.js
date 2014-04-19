import { Tokenizer, Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { ElementNode, BlockNode, ProgramNode, AttrNode, appendChild } from "htmlbars/ast";
import { processToken } from "htmlbars/html-parser/process-token";
import Handlebars from "handlebars";

export function preprocess(html, options) {
  var ast = Handlebars.parse(html);
  return new HTMLProcessor(options || {}).accept(ast);
}

function HTMLProcessor(options) {
  this.elementStack = [];
  this.tokenizer = new Tokenizer('');
}

// TODO: ES3 polyfill
var processor = HTMLProcessor.prototype;

processor.accept = function(node) {
  return this[node.type](node);
};

processor.program = function(program) {
  var children = [];
  var node = new ProgramNode(children, program.strip);
  var statements = program.statements;
  var c, l = statements.length;

  this.elementStack.push(node);

  if (l === 0) return this.elementStack.pop();

  c = statements[0];
  if (c.type === 'block' || c.type === 'mustache') {
    children.push('');
  }

  for (var i = 0; i < l; i++) {
    this.accept(statements[i]);
  }

  process(this, this.tokenizer.tokenizeEOF());

  c = statements[l-1];
  if (c.type === 'block' || c.type === 'mustache') {
    children.push('');
  }

  return this.elementStack.pop();
};

processor.block = function(block) {
  switchToHandlebars(this);

  process(this, block);

  var mustache = block.mustache;
  var program = this.accept(block.program);
  var inverse = block.inverse ? this.accept(block.inverse) : null;

  // TODO: Clean up Handlebars AST upstream to remove this hack.
  var close = buildClose(mustache, program, inverse, block.strip.right);

  var node = new BlockNode(mustache, program, inverse, close);
  var parentProgram = currentElement(this);
  appendChild(parentProgram, node);
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
  processToken(tokenizer.state, compiler.elementStack, tokenizer.token, token);
}

function currentElement(processor) {
  var elementStack = processor.elementStack;
  return elementStack[elementStack.length - 1];
}

StartTag.prototype.startAttribute = function(char) {
  this.addCurrentAttributeKey();
  this.currentAttribute = new AttrNode(char.toLowerCase(), []);
  this.attributes.push(this.currentAttribute);
};

StartTag.prototype.addToAttributeName = function(char) {
  this.currentAttribute.name += char;
};

StartTag.prototype.addToAttributeValue = function(char) {
  var value = this.currentAttribute.value;

  if (value.length && typeof value[value.length - 1] === 'string' && typeof char === 'string') {
    value[value.length - 1] += char;
  } else {
    value.push(char);
  }
};

StartTag.prototype.finalize = function() {
  this.addCurrentAttributeKey();
  delete this.currentAttribute;
  return this;
};

StartTag.prototype.addCurrentAttributeKey = function() {
  var attr = this.currentAttribute;
  if (attr) {
    this.attributes[attr.name] = attr.value;
  }
};

StartTag.prototype.addTagHelper = function(helper) {
  var helpers = this.helpers = this.helpers || [];
  helpers.push(helper);
};

export function buildClose(mustache, program, inverse, stripRight) {
  return {
    path: {
      original: mustache.sexpr.id.original
    },
    strip: {
      left: (inverse || program).strip.right,
      right: stripRight || false
    },
  };
}
