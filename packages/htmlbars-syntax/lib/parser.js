import { parse } from "./handlebars/compiler/base";
import { Tokenizer } from "./tokenizer";
import EntityParser from "../simple-html-tokenizer/entity-parser";
import fullCharRefs from "../simple-html-tokenizer/char-refs/full";
import nodeHandlers from "./node-handlers";
import tokenHandlers from "./token-handlers";

// this should be:
// `import * from "../htmlbars-syntax";
//
// But this version of the transpiler does not support it properly
module syntax from "../htmlbars-syntax";

export function preprocess(html, options) {
  var ast = (typeof html === 'object') ? html : parse(html);
  var combined = new HTMLProcessor(html, options).acceptNode(ast);

  if (options && options.plugins && options.plugins.ast) {
    for (var i = 0, l = options.plugins.ast.length; i < l; i++) {
      var plugin = new options.plugins.ast[i]();

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
    this.source = source.split(/(?:\r\n?|\n)/g);
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
