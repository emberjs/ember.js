import {
  AttrNode,
  Block,
  BlockStatement,
  ElementNode,
  MustacheStatement,
  Node,
  Program,
  TextNode,
  PartialStatement,
  ConcatStatement,
  MustacheCommentStatement,
  CommentStatement,
  ElementModifierStatement,
  Expression,
  PathExpression,
  SubExpression,
  Hash,
  HashPair,
  Literal,
  StringLiteral,
  BooleanLiteral,
  NumberLiteral,
  UndefinedLiteral,
  NullLiteral,
  TopLevelStatement,
  Template,
} from '../types/nodes';
import { voidMap } from '../parser/tokenizer-event-handlers';
import { escapeText, escapeAttrValue } from './util';

export interface PrinterOptions {
  entityEncoding: 'transformed' | 'raw';

  /**
   * Used to override the mechanism of printing a given AST.Node.
   *
   * This will generally only be useful to source -> source codemods
   * where you would like to specialize/override the way a given node is
   * printed (e.g. you would like to preserve as much of the original
   * formatting as possible).
   *
   * When the provided override returns undefined, the default built in printing
   * will be done for the AST.Node.
   *
   * @param ast the ast node to be printed
   * @param options the options specified during the print() invocation
   */
  override?(ast: Node, options: PrinterOptions): void | string;
}

export default class Printer {
  private buffer = '';
  private options: PrinterOptions;

  constructor(options: PrinterOptions) {
    this.options = options;
  }

  Node(node: Node): void {
    switch (node.type) {
      case 'MustacheStatement':
      case 'BlockStatement':
      case 'PartialStatement':
      case 'MustacheCommentStatement':
      case 'CommentStatement':
      case 'TextNode':
      case 'ElementNode':
      case 'AttrNode':
      case 'Block':
      case 'Template':
        return this.TopLevelStatement(node);
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'NumberLiteral':
      case 'UndefinedLiteral':
      case 'NullLiteral':
      case 'PathExpression':
      case 'SubExpression':
        return this.Expression(node);
      case 'Program':
        return this.Block(node);
      case 'ConcatStatement':
        // should have an AttrNode parent
        return this.ConcatStatement(node);
      case 'Hash':
        return this.Hash(node);
      case 'HashPair':
        return this.HashPair(node);
      case 'ElementModifierStatement':
        return this.ElementModifierStatement(node);
    }

    return unreachable(node);
  }

  Expression(expression: Expression): void {
    switch (expression.type) {
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'NumberLiteral':
      case 'UndefinedLiteral':
      case 'NullLiteral':
        return this.Literal(expression);
      case 'PathExpression':
        return this.PathExpression(expression);
      case 'SubExpression':
        return this.SubExpression(expression);
    }
    return unreachable(expression);
  }

  Literal(literal: Literal) {
    switch (literal.type) {
      case 'StringLiteral':
        return this.StringLiteral(literal);
      case 'BooleanLiteral':
        return this.BooleanLiteral(literal);
      case 'NumberLiteral':
        return this.NumberLiteral(literal);
      case 'UndefinedLiteral':
        return this.UndefinedLiteral(literal);
      case 'NullLiteral':
        return this.NullLiteral(literal);
    }
    return unreachable(literal);
  }

  TopLevelStatement(statement: TopLevelStatement) {
    switch (statement.type) {
      case 'MustacheStatement':
        return this.MustacheStatement(statement);
      case 'BlockStatement':
        return this.BlockStatement(statement);
      case 'PartialStatement':
        return this.PartialStatement(statement);
      case 'MustacheCommentStatement':
        return this.MustacheCommentStatement(statement);
      case 'CommentStatement':
        return this.CommentStatement(statement);
      case 'TextNode':
        return this.TextNode(statement);
      case 'ElementNode':
        return this.ElementNode(statement);
      case 'Block':
      case 'Template':
        return this.Block(statement);
      case 'AttrNode':
        // should have element
        return this.AttrNode(statement);
    }
    unreachable(statement);
  }

  Block(block: Block | Program | Template): void {
    this.TopLevelStatements(block.body);
  }

  TopLevelStatements(statements: TopLevelStatement[]) {
    statements.forEach(statement => this.TopLevelStatement(statement));
  }

  ElementNode(el: ElementNode): void {
    this.OpenElementNode(el);
    this.TopLevelStatements(el.children);
    this.CloseElementNode(el);
  }

  OpenElementNode(el: ElementNode): void {
    this.buffer += `<${el.tag}`;
    if (el.attributes.length) {
      el.attributes.forEach(attr => {
        this.buffer += ' ';
        this.AttrNode(attr);
      });
    }
    if (el.modifiers.length) {
      el.modifiers.forEach(mod => {
        this.buffer += ' ';
        this.ElementModifierStatement(mod);
      });
    }
    if (el.comments.length) {
      el.comments.forEach(comment => {
        this.buffer += ' ';
        this.MustacheCommentStatement(comment);
      });
    }
    if (el.blockParams.length) {
      this.BlockParams(el.blockParams);
    }
    if (el.selfClosing) {
      this.buffer += ' /';
    }
    this.buffer += '>';
  }

  CloseElementNode(el: ElementNode): void {
    if (el.selfClosing || voidMap[el.tag.toLowerCase()]) {
      return;
    }
    this.buffer += `</${el.tag}>`;
  }

  AttrNode(attr: AttrNode): void {
    let { name, value } = attr;

    this.buffer += name;
    if (value.type !== 'TextNode' || value.chars.length > 0) {
      this.buffer += '=';
      this.AttrNodeValue(value);
    }
  }

  AttrNodeValue(value: AttrNode['value']) {
    if (value.type === 'TextNode') {
      this.buffer += '"';
      this.TextNode(value, true);
      this.buffer += '"';
    } else {
      this.Node(value);
    }
  }

  TextNode(text: TextNode, isAttr?: boolean): void {
    if (isAttr) {
      this.buffer += escapeAttrValue(text.chars);
    } else {
      this.buffer += escapeText(text.chars);
    }
  }

  MustacheStatement(mustache: MustacheStatement): void {
    this.buffer += mustache.escaped ? '{{' : '{{{';

    if (mustache.strip.open) {
      this.buffer += '~';
    }

    this.Expression(mustache.path);
    this.Params(mustache.params);
    this.Hash(mustache.hash);

    if (mustache.strip.close) {
      this.buffer += '~';
    }

    this.buffer += mustache.escaped ? '}}' : '}}}';
  }

  BlockStatement(block: BlockStatement): void {
    this.buffer += '{{#';
    this.Expression(block.path);
    this.Params(block.params);
    this.Hash(block.hash);
    if (block.program.blockParams.length) {
      this.BlockParams(block.program.blockParams);
    }
    this.buffer += '}}';
    this.Block(block.program);
    if (block.inverse) {
      this.buffer += '{{else}}';
      this.Block(block.inverse);
    }
    this.buffer += '{{/';
    this.Expression(block.path);
    this.buffer += '}}';
  }

  BlockParams(blockParams: string[]) {
    this.buffer += ` as |${blockParams.join(' ')}|`;
  }

  PartialStatement(partial: PartialStatement): void {
    this.buffer += '{{>';
    this.Expression(partial.name);
    this.Params(partial.params);
    this.Hash(partial.hash);
    this.buffer += '}}';
  }

  ConcatStatement(concat: ConcatStatement): void {
    this.buffer += '"';
    concat.parts.forEach(part => {
      if (part.type === 'TextNode') {
        this.TextNode(part, true);
      } else {
        this.Node(part);
      }
    });
    this.buffer += '"';
  }

  MustacheCommentStatement(comment: MustacheCommentStatement): void {
    this.buffer += `{{!--${comment.value}--}}`;
  }

  ElementModifierStatement(mod: ElementModifierStatement): void {
    this.buffer += '{{';
    this.Expression(mod.path);
    this.Params(mod.params);
    this.Hash(mod.hash);
    this.buffer += '}}';
  }

  CommentStatement(comment: CommentStatement): void {
    this.buffer += `<!--${comment.value}-->`;
  }

  PathExpression(path: PathExpression): void {
    this.buffer += path.original;
  }

  SubExpression(sexp: SubExpression): void {
    this.buffer += '(';
    this.Expression(sexp.path);
    this.Params(sexp.params);
    this.Hash(sexp.hash);
    this.buffer += ')';
  }

  Params(params: Expression[]) {
    params.forEach(param => {
      this.buffer += ' ';
      this.Expression(param);
    });
  }

  Hash(hash: Hash): void {
    hash.pairs.forEach(pair => {
      this.buffer += ' ';
      this.HashPair(pair);
    });
  }

  HashPair(pair: HashPair): void {
    this.buffer += pair.key;
    this.buffer += '=';
    this.Node(pair.value);
  }

  StringLiteral(str: StringLiteral): void {
    this.buffer += JSON.stringify(str.value);
  }

  BooleanLiteral(bool: BooleanLiteral): void {
    this.buffer += bool.value;
  }

  NumberLiteral(number: NumberLiteral): void {
    this.buffer += number.value;
  }

  UndefinedLiteral(_: UndefinedLiteral): void {
    this.buffer += 'undefined';
  }

  NullLiteral(_: NullLiteral): void {
    this.buffer += 'null';
  }

  print(node: Node) {
    let { options } = this;

    if (options.override) {
      let result = options.override(node, options);

      if (result !== undefined) {
        return result;
      }
    }

    this.buffer = '';
    this.Node(node);
    return this.buffer;
  }
}

function unreachable(node: never): never {
  throw new Error(`Non-exhaustive node narrowing ${((node as any) as Node).type}`);
}
