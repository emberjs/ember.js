import { Tokenizer, Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { ElementNode, BlockNode, ProgramNode, AttrNode, TextNode, appendChild } from "htmlbars/ast";
import { processToken } from "htmlbars/html-parser/process-token";
import Handlebars from "handlebars";

export function preprocess(html, options) {
  var ast = Handlebars.parse(html);
  var combined = new HTMLProcessor(options || {}).accept(ast);
  return combined;
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
  var statements = [];
  var node = new ProgramNode(statements, program.strip);
  var i, l = program.statements.length;
  var statement;

  this.elementStack.push(node);

  if (l === 0) return this.elementStack.pop();

  statement = program.statements[0];
  if (statement.type === 'block' || statement.type === 'mustache') {
    statements.push(new TextNode(''));
  }

  for (i = 0; i < l; i++) {
    this.accept(program.statements[i]);
  }

  process(this, this.tokenizer.tokenizeEOF());

  statement = program.statements[l-1];
  if (statement.type === 'block' || statement.type === 'mustache') {
    statements.push(new TextNode(''));
  }

  // Remove any stripped whitespace
  l = statements.length;
  for (i = 0; i < l; i++) {
    statement = statements[i];
    if (statement.type !== 'text') continue;

    if ((i > 0 && statements[i-1].strip && statements[i-1].strip.right) ||
      (i === 0 && program.strip.left)) {
      statement.chars = statement.chars.replace(/^\s+/, '');
    }

    if ((i < l-1 && statements[i+1].strip && statements[i+1].strip.left) ||
      (i === l-1 && program.strip.right)) {
      statement.chars = statement.chars.replace(/\s+$/, '');
    }

    // Remove unnecessary text nodes
    if (statement.chars.length === 0) {
      if ((i > 0 && statements[i-1].type === 'element') ||
        (i < l-1 && statements[i+1].type === 'element')) {
        statements.splice(i, 1);
        i--;
        l--;
      }
    }
  }

  return this.elementStack.pop();
};

processor.block = function(block) {
  switchToHandlebars(this);

  process(this, block);

  var mustache = block.mustache;
  var program = this.accept(block.program);
  var inverse = block.inverse ? this.accept(block.inverse) : null;
  var strip = block.strip;

  // Normalize inverse's strip
  if (inverse && !inverse.strip.left) {
    inverse.strip.left = false;
  }

  var node = new BlockNode(mustache, program, inverse, strip);
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

  if (char.type === 'mustache') {
    value.push(char);
  } else {
    if (value.length > 0 && value[value.length - 1].type === 'text') {
      value[value.length - 1].chars += char;
    } else {
      value.push(new TextNode(char));
    }
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
