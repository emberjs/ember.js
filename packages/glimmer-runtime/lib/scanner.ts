import buildStatement from './syntax/statements';
import { EntryPoint, InlineBlock, PartialBlock, Layout } from './compiled/blocks';
import Environment from './environment';
import { EMPTY_SLICE, Option, LinkedList, Stack, expect } from 'glimmer-util';
import { SerializedTemplateBlock, TemplateMeta, SerializedBlock, Statement as SerializedStatement } from 'glimmer-wire-format';
import { entryPoint as entryPointTable, layout as layoutTable, block as blockTable } from './symbol-table';
import { Opaque, SymbolTable } from 'glimmer-interfaces';

import {
  ARGUMENT as ARGUMENT_SYNTAX,
  ATTRIBUTE as ATTRIBUTE_SYNTAX,
  Parameter as ParameterSyntax,
  Program,
  Statement as StatementSyntax,
  Expression as ExpressionSyntax
} from './syntax';

import {
  MODIFIER_SYNTAX,
  Block,
  Blocks,
  OpenPrimitiveElement,
  OpenElement,
  Component,
  Args,
  FlushElement,
  NamedArgs,
  CloseElement
} from './syntax/core';

export default class Scanner {
  constructor(private block: SerializedTemplateBlock, private meta: TemplateMeta, private env: Environment) {
  }

  scanEntryPoint(): EntryPoint {
    let { block, meta } = this;

    let symbolTable = entryPointTable(meta);
    let program = buildStatements(block, block.blocks, symbolTable, this.env);
    return new EntryPoint(program, symbolTable);
  }

  scanLayout(): Layout {
    let { block, meta } = this;
    let { blocks, named, yields, hasPartials } = block;

    let symbolTable = layoutTable(meta, named, yields, hasPartials);
    let program = buildStatements(block, blocks, symbolTable, this.env);

    return new Layout(program, symbolTable, named, yields, hasPartials);
  }

  scanPartial(symbolTable: SymbolTable): PartialBlock {
    let { block } = this;
    let { blocks, locals } = block;

    let program = buildStatements(block, blocks, symbolTable, this.env);

    return new PartialBlock(program, symbolTable, locals);
  }
}

function buildStatements({ statements }: SerializedBlock, blocks: SerializedBlock[], symbolTable: SymbolTable, env: Environment): Program {
  if (statements.length === 0) return EMPTY_PROGRAM;
  return new BlockScanner(statements, blocks, symbolTable, env).scan();
}

const EMPTY_PROGRAM = EMPTY_SLICE;

export class BlockScanner {
  public env: Environment;

  private stack = new Stack<ChildBlockScanner>();
  private reader: SyntaxReader;

  constructor(statements: SerializedStatement[], private blocks: SerializedBlock[], private symbolTable: SymbolTable, env: Environment) {
    this.stack.push(new ChildBlockScanner(symbolTable));
    this.reader = new SyntaxReader(statements, symbolTable, this);
    this.env = env;
  }

  private get blockScanner(): ChildBlockScanner {
    return expect(this.stack.current, 'The scanner should have a block on the stack when used');
  }

  scan(): Program {
    let statement: Option<StatementSyntax>;

    while (statement = this.reader.next()) {
      this.addStatement(statement);
    }

    return this.blockScanner.program;
  }

  blockFor(symbolTable: SymbolTable, id: number): InlineBlock {
    let block = this.blocks[id];
    let childTable = blockTable(this.symbolTable, block.locals);
    let program = buildStatements(block, this.blocks, childTable, this.env);
    return new InlineBlock(program, childTable, block.locals);
  }

  startBlock(locals: string[]) {
    let childTable = blockTable(this.symbolTable, locals);
    this.stack.push(new ChildBlockScanner(childTable));
  }

  endBlock(locals: string[]): InlineBlock {
    let { program, symbolTable } = expect(this.stack.pop(), 'ending a block requires a block on the stack');
    let block = new InlineBlock(program, symbolTable, locals);
    this.addChild(block);
    return block;
  }

  addChild(block: InlineBlock) {
    this.blockScanner.addChild(block);
  }

  addStatement(statement: StatementSyntax) {
    switch (statement.type) {
      case 'block':
        this.blockScanner.addStatement(this.scanBlock(statement as Block));
        break;
      case 'open-element':
        this.blockScanner.addStatement(this.scanOpenElement(statement as OpenElement));
        break;
      default:
        this.blockScanner.addStatement(statement);
    }
  }

  next(): Option<StatementSyntax> {
    return this.reader.next();
  }

  private scanBlock(block: Block): Block {
    let { default: _default, inverse } = block.args.blocks;

    if (_default) this.addChild(_default);
    if (inverse)  this.addChild(inverse);

    return block;
  }

  private scanOpenElement(openElement: OpenElement) {
    let { tag, symbolTable, blockParams } = openElement;

    if (this.env.hasComponentDefinition([tag], symbolTable)) {
      let { args, attrs } = this.parameters(openElement);
      this.startBlock(blockParams);
      this.tagContents(openElement);
      let template = this.endBlock(blockParams);
      args.blocks = Blocks.fromSpec(template);
      return new Component(tag, attrs, args);
    } else {
      return new OpenPrimitiveElement(tag);
    }
  }

  private parameters(openElement: OpenElement): { args: Args, attrs: string[] } {
    let current: Option<StatementSyntax> = this.next();
    let attrs: string[] = [];
    let argKeys: string[] = [];
    let argValues: ExpressionSyntax<Opaque>[] = [];

    while (!(current instanceof FlushElement)) {
      if (current && current[MODIFIER_SYNTAX]) {
        throw new Error(`Compile Error: Element modifiers are not allowed in components`);
      }

      let param = current as any as ParameterSyntax<Opaque>;

      if (param[ATTRIBUTE_SYNTAX]) {
        attrs.push(param.name);

        // REMOVE ME: attributes should not be treated as args
        argKeys.push(param.name);
        argValues.push(param.valueSyntax());
      } else if (param[ARGUMENT_SYNTAX]) {
        argKeys.push(param.name);
        argValues.push(param.valueSyntax());
      } else {
        throw new Error("Expected FlushElement, but got ${current}");
      }

      current = this.next();
    }

    return { args: Args.fromNamedArgs(new NamedArgs(argKeys, argValues)), attrs };
  }

  private tagContents(openElement: OpenElement) {
    let nesting = 1;

    while (true) {
      let current = this.next();
      if (current instanceof CloseElement && --nesting === 0) {
        break;
      }

      this.addStatement(expect(current, 'when scanning tag contents, the next scanned production cannot be null'));

      if (current instanceof OpenElement || current instanceof OpenPrimitiveElement) {
        nesting++;
      }
    }
  }
}

class ChildBlockScanner {
  public children: InlineBlock[] = [];
  public program = new LinkedList<StatementSyntax>();

  constructor(public symbolTable: SymbolTable) {}

  addChild(block: InlineBlock) {
    this.children.push(block);
  }

  addStatement(statement: StatementSyntax) {
    this.program.append(statement);
  }
}

class SyntaxReader {
  current: number = 0;
  last: Option<StatementSyntax> = null;

  constructor(private statements: SerializedStatement[], private symbolTable: SymbolTable, private scanner: BlockScanner) {}

  next(): Option<StatementSyntax> {
    let last = this.last;
    if (last) {
      this.last = null;
      return last;
    } else if (this.current === this.statements.length) {
      return null;
    }

    let sexp = this.statements[this.current++];
    return buildStatement(sexp, this.symbolTable, this.scanner);
  }
}
