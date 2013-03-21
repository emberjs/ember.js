import { Tokenizer, Chars, StartTag, EndTag } from "simple-html-tokenizer";
import { HTMLElement, BlockElement } from "htmlbars/ast";
import { processToken } from "htmlbars/html-parser/process-token";

function preprocess(html) {
  var ast = Handlebars.parse(html);
  return new HTMLProcessor().accept(ast);
};

export { preprocess };

function HTMLProcessor() {
  this.elementStack = [new HTMLElement()];
  this.tokenizer = new Tokenizer('');
};

// TODO: ES3 polyfill
var processor = HTMLProcessor.prototype = Object.create(Handlebars.Visitor.prototype);

processor.program = function(program) {
  var statements = program.statements;

  for (var i=0, l=statements.length; i<l; i++) {
    this.accept(statements[i]);
  }

  processTokens(this, this.elementStack, [this.tokenizer.tokenizeEOF()]);

  return this.elementStack[0].children;
};

processor.block = function(block) {
  switchToHandlebars(this);

  processToken(this, this.elementStack, block);

  if (block.program) {
    this.accept(block.program);
  }

  var blockNode = this.elementStack.pop();
  currentElement(this).children.push(blockNode);
};

processor.content = function(content) {
  var tokens = this.tokenizer.tokenizePart(content.string);
  return processTokens(this, this.elementStack, tokens);
};

processor.mustache = function(mustache) {
  switchToHandlebars(this);

  pushChild(this, mustache);
};

function switchToHandlebars(compiler) {
  var token = compiler.tokenizer.token;

  // TODO: Monkey patch Chars.addChar like attributes
  if (token instanceof Chars) {
    processToken(compiler, compiler.elementStack, token);
    compiler.tokenizer.token = null;
  }
}

function processTokens(compiler, elementStack, tokens) {
  tokens.forEach(function(token) {
    processToken(compiler, elementStack, token);
  });
}

function currentElement(processor) {
  var elementStack = processor.elementStack;
  return elementStack[elementStack.length - 1];
}

function pushChild(processor, token) {
  var state = processor.tokenizer.state;

  switch(state) {
    case "attributeValueSingleQuoted":
    case "attributeValueUnquoted":
    case "attributeValueDoubleQuoted":
      processor.tokenizer.token.addToAttributeValue(token);
      return;
    case "beforeAttributeName":
      processor.tokenizer.token.addTagHelper(token);
      return;
    default:
      var element = currentElement(processor);
      element.children.push(token);
  }
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
}