import { parse } from "../handlebars/compiler/base";
import { Tokenizer } from "../simple-html-tokenizer";
import nodeHandlers from "./html-parser/node-handlers";
import tokenHandlers from "./html-parser/token-handlers";

export function preprocess(html, options) {
  var ast = parse(html);
  var combined = new HTMLProcessor().acceptNode(ast);
  return combined;
}

function HTMLProcessor() {
  this.elementStack = [];
  this.tokenizer = new Tokenizer('');
  this.nodeHandlers = nodeHandlers;
  this.tokenHandlers = tokenHandlers;
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
