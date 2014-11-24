import { parse } from "./handlebars/compiler/base";
import { Tokenizer } from "../simple-html-tokenizer";
import nodeHandlers from "./html-parser/node-handlers";
import tokenHandlers from "./html-parser/token-handlers";

export function preprocess(html, options) {
  var ast = parse(html);
  var combined = new HTMLProcessor(html, options).acceptNode(ast);

  return combined;
}

function HTMLProcessor(source, options) {
  this.options = options || {};
  this.elementStack = [];
  this.tokenizer = new Tokenizer('');
  this.nodeHandlers = nodeHandlers;
  this.tokenHandlers = tokenHandlers;
  this.source = source.split(/(?:\r\n?|\n)/g);
}

HTMLProcessor.prototype.acceptNode = function(node) {
  return this.nodeHandlers[node.type].call(this, node);
};

HTMLProcessor.prototype.acceptToken = function(token) {
  if (token) {
    return this.tokenHandlers[token.type].call(this, token);
  }
};

HTMLProcessor.prototype.currentElement = function() {
  return this.elementStack[this.elementStack.length - 1];
};

HTMLProcessor.prototype.sourceForMustache = function(mustache) {
  var firstLine = mustache.firstLine - 1;
  var lastLine = mustache.lastLine - 1;
  var currentLine = firstLine - 1;
  var firstColumn = mustache.firstColumn + 2;
  var lastColumn = mustache.lastColumn - 2;
  var string = [];
  var line;

  while (currentLine < lastLine) {
    currentLine++;
    line = this.source[currentLine];

    if (currentLine === firstLine) {
      if (firstLine === lastLine) {
        string.push(line.slice(firstColumn, lastColumn));
      } else {
        string.push(line.slice(firstColumn));
      }
    } else if (currentLine === lastLine) {
      string.push(line.slice(0, lastColumn));
    } else {
      string.push(line);
    }
  }

  return string.join('\n');
};
