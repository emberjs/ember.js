import { parse } from "handlebars/compiler/base";
import * as syntax from "./syntax";
import EventedTokenizer from "simple-html-tokenizer/evented-tokenizer";
import EntityParser from "simple-html-tokenizer/entity-parser";
import namedCharRefs from "simple-html-tokenizer/html5-named-char-refs";
import handlebarsNodeVisitors from "./parser/handlebars-node-visitors";
import tokenizerEventHandlers from "./parser/tokenizer-event-handlers";

export function preprocess(html, options?) {
  let ast = (typeof html === 'object') ? html : parse(html);
  let combined = new Parser(html, options).acceptNode(ast);

  if (options && options.plugins && options.plugins.ast) {
    for (let i = 0, l = options.plugins.ast.length; i < l; i++) {
      let plugin = new options.plugins.ast[i](options);

      plugin.syntax = syntax;

      combined = plugin.transform(combined);
    }
  }

  return combined;
}

export default preprocess;

const entityParser = new EntityParser(namedCharRefs);

export function Parser(source, options) {
  this.options = options || {};
  this.elementStack = [];
  this.tokenizer = new EventedTokenizer(this, entityParser);

  this.currentNode = null;
  this.currentAttribute = null;

  if (typeof source === 'string') {
    this.source = source.split(/(?:\r\n?|\n)/g);
  }
}

for (let key in handlebarsNodeVisitors) {
  Parser.prototype[key] = handlebarsNodeVisitors[key];
}

for (let key in tokenizerEventHandlers) {
  Parser.prototype[key] = tokenizerEventHandlers[key];
}

Parser.prototype.acceptNode = function(node) {
  return this[node.type](node);
};

Parser.prototype.currentElement = function() {
  return this.elementStack[this.elementStack.length - 1];
};

Parser.prototype.sourceForMustache = function(mustache) {
  let firstLine = mustache.loc.start.line - 1;
  let lastLine = mustache.loc.end.line - 1;
  let currentLine = firstLine - 1;
  let firstColumn = mustache.loc.start.column + 2;
  let lastColumn = mustache.loc.end.column - 2;
  let string = [];
  let line;

  if (!this.source) {
    return '{{' + mustache.path.id.original + '}}';
  }

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
