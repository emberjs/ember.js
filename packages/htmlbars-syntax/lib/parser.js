import { parse } from "./handlebars/compiler/base";
import { Tokenizer } from "./tokenizer";
import EntityParser from "../simple-html-tokenizer/entity-parser";
import fullCharRefs from "../simple-html-tokenizer/char-refs/full";
import nodeHandlers from "./node-handlers";
import tokenHandlers from "./token-handlers";
import * as syntax from "../htmlbars-syntax";

var splitLines;
// IE8 throws away blank pieces when splitting strings with a regex
// So we split using a string instead as appropriate
if ("foo\n\nbar".split(/\n/).length === 2) {
  splitLines = function(str) {
     var clean = str.replace(/\r\n?/g, '\n');
     return clean.split('\n');
  };
} else {
  splitLines = function(str) {
    return str.split(/(?:\r\n?|\n)/g);
  };
}

export function preprocess(html, options) {
  var ast = (typeof html === 'object') ? html : parse(html);
  var combined = new HTMLProcessor(html, options).acceptNode(ast);

  if (options && options.plugins && options.plugins.ast) {
    for (var i = 0, l = options.plugins.ast.length; i < l; i++) {
      var plugin = new options.plugins.ast[i](options);

      plugin.syntax = syntax;

      combined = plugin.transform(combined);
    }
  }

  return combined;
}

function HTMLProcessor(source, options) {
  this.options = options || {};
  this.elementStack = [];
  this.tokenizer = new Tokenizer('', new EntityParser(fullCharRefs));
  this.nodeHandlers = nodeHandlers;
  this.tokenHandlers = tokenHandlers;

  if (typeof source === 'string') {
    this.source = splitLines(source);
  }
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
  var firstLine = mustache.loc.start.line - 1;
  var lastLine = mustache.loc.end.line - 1;
  var currentLine = firstLine - 1;
  var firstColumn = mustache.loc.start.column + 2;
  var lastColumn = mustache.loc.end.column - 2;
  var string = [];
  var line;

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
