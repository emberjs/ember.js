import { parse } from "handlebars";
import builders from "./builders";
import print from "./generation/print";
import * as traverse from "./traversal/traverse";
import Walker from "./traversal/walker";
import {
  EventedTokenizer,
  EntityParser,
  HTML5NamedCharRefs as namedCharRefs
} from "simple-html-tokenizer";
import handlebarsNodeVisitors from "./parser/handlebars-node-visitors";
import tokenizerEventHandlers from "./parser/tokenizer-event-handlers";
import * as Types from "./types/nodes";

export interface Syntax {
  parse: typeof preprocess;
  builders: typeof builders;
  print: typeof print;
  traverse: typeof traverse;
  Walker: typeof Walker;
}

export const syntax: Syntax = {
  parse: preprocess,
  builders,
  print,
  traverse,
  Walker
};

export function preprocess(html: string | hbs.AST.Program, options?): Types.Program {
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

const entityParser = new EntityParser(namedCharRefs);

export class Parser {
  private elementStack = [];
  private options: Object;
  private source: string[];
  public currentAttribute = null;
  public currentNode = null;
  public tokenizer = new EventedTokenizer(this, entityParser);

  constructor(source, options: Object = {}) {
    this.options = options;

    if (typeof source === 'string') {
      this.source = source.split(/(?:\r\n?|\n)/g);
    }
  }

  acceptNode(node: hbs.AST.Program): Types.Program;

  acceptNode(node): Object {
    return this[node.type](node);
  }

  currentElement(): Object {
    return this.elementStack[this.elementStack.length - 1];
  }

  sourceForMustache(mustache): string {
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
  }
}

for (let key in handlebarsNodeVisitors) {
  Parser.prototype[key] = handlebarsNodeVisitors[key];
}

for (let key in tokenizerEventHandlers) {
  Parser.prototype[key] = tokenizerEventHandlers[key];
}
