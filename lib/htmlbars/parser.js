import { Tokenizer, Chars, StartTag, EndTag } from "simple-html-tokenizer";

function preprocess(html) {
  var ast = Handlebars.parse(html);
  return new HTMLProcessor().accept(ast);
};

export { preprocess };

function HTMLProcessor() {
  this.elementStack = [{ children: [] }];
  this.pendingTagHelpers = [];
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
      processor.pendingTagHelpers.push(token);
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

function processToken(processor, elementStack, token) {
  var currentElement = elementStack[elementStack.length - 1];
  if (token instanceof Chars) {
    currentElement.children.push(token.chars);
  } else if (token instanceof EndTag) {
    if (currentElement.tag === token.tagName) {
      var value = config.processHTMLMacros(currentElement)
      elementStack.pop();

      if (value === undefined) {
        elementStack[elementStack.length - 1].children.push(currentElement);
      } else if (value instanceof HTMLElement) {
        elementStack[elementStack.length - 1].children.push(value);
      }
    } else {
      throw new Error("Closing tag " + token.tagName + " did not match last open tag " + currentElement.tag);
    }
  } else if (token instanceof StartTag) {
    var element = new HTMLElement(token.tagName, token.attributes);
    element.helpers = processor.pendingTagHelpers.slice();
    processor.pendingTagHelpers = [];
    elementStack.push(element);
  } else if (token instanceof Handlebars.AST.BlockNode) {
    elementStack.push(new BlockElement(token.mustache));
  }
}

var config = {
  processHTMLMacros: function() {}
};

export { config };

function HTMLElement(tag, attributes, children, helpers) {
  this.tag = tag;
  this.attributes = attributes || [];
  this.children = children || [];
  this.helpers = helpers || [];

  for (var i=0, l=attributes.length; i<l; i++) {
    var attribute = attributes[i];
    attributes[attribute[0]] = attribute[1];
  }
};

export { HTMLElement };

HTMLElement.prototype = {
  removeAttr: function(name) {
    var attributes = this.attributes, attribute;
    delete attributes[name];
    for (var i=0, l=attributes.length; i<l; i++) {
      attribute = attributes[i];
      if (attribute[0] === name) {
        attributes.splice(i, 1);
        break;
      }
    }
  },

  getAttr: function(name) {
    var attributes = this.attributes;
    if (attributes.length !== 1 || attributes[0] instanceof Handlebars.AST.MustacheNode) { return; }
    return attributes[name][0];
  }
}

function BlockElement(helper, children) {
  this.helper = helper;
  this.children = children || [];
};

export { BlockElement };