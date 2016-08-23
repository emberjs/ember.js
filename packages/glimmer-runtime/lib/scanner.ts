import { Program, Statement as StatementSyntax } from './syntax';
import buildStatement from './syntax/statements';
import { EntryPoint, InlineBlock, PartialBlock, Layout } from './compiled/blocks';
import Environment from './environment';
import { EMPTY_SLICE, LinkedList, Stack } from 'glimmer-util';
import { SerializedTemplate, SerializedBlock, Statement as SerializedStatement } from 'glimmer-wire-format';
import SymbolTable from './symbol-table';

export default class Scanner {
  private spec: SerializedTemplate;
  private env: Environment;

  constructor(spec: SerializedTemplate, env: Environment) {
    this.spec = spec;
    this.env = env;
  }

  scanEntryPoint(): EntryPoint {
    let { spec } = this;
    let { blocks: specBlocks, meta } = this.spec;

    let symbolTable = SymbolTable.forEntryPoint(meta);
    let blocks: InlineBlock[] = [];

    for (let i = 0, block: SerializedBlock; block = specBlocks[i]; i++) {
      blocks.push(this.buildBlock(block, blocks, symbolTable));
    }

    let { program, children } = this.buildStatements(spec, blocks, symbolTable);
    return new EntryPoint(children, program, symbolTable);
  }

  scanLayout(): Layout {
    let { spec } = this;
    let { blocks: specBlocks, named, yields, meta } = this.spec;

    let symbolTable = SymbolTable.forLayout(named, yields, meta);
    let blocks: InlineBlock[] = [];

    for (let i = 0, block: SerializedBlock; block = specBlocks[i]; i++) {
      blocks.push(this.buildBlock(block, blocks, symbolTable));
    }

    let { program, children } = this.buildStatements(spec, blocks, symbolTable);
    return new Layout(children, program, symbolTable, named, yields);
  }

  scanPartial(symbolTable: SymbolTable): PartialBlock {
    let { spec } = this;
    let { blocks: specBlocks, locals } = this.spec;

    let blocks: InlineBlock[] = [];

    for (let i = 0, block: SerializedBlock; block = specBlocks[i]; i++) {
      blocks.push(this.buildBlock(block, blocks, symbolTable));
    }

    let { program, children } = this.buildStatements(spec, blocks, symbolTable);
    return new PartialBlock(children, program, symbolTable, locals);
  }

  private buildBlock(block: SerializedBlock, blocks: InlineBlock[], symbolTable: SymbolTable): InlineBlock{
    let childTable = SymbolTable.forBlock(symbolTable, block.locals);
    let { program, children } = this.buildStatements(block, blocks, childTable);
    return new InlineBlock(children, program, childTable, block.locals);
  }

  private buildStatements({ statements }: SerializedBlock, blocks: InlineBlock[], symbolTable: SymbolTable): ScanResults {
    if (statements.length === 0) return EMPTY_PROGRAM;
    return new BlockScanner(statements, blocks, symbolTable, this.env).scan();
  }
}

interface ScanResults {
  program: Program;
  children: InlineBlock[];
}

const EMPTY_PROGRAM = {
  program: EMPTY_SLICE,
  children: []
};

export class BlockScanner {
  public env: Environment;

  private stack = new Stack<ChildBlockScanner>();
  private reader: SyntaxReader;

  constructor(statements: SerializedStatement[], blocks: InlineBlock[], private symbolTable: SymbolTable, env: Environment) {
    this.stack.push(new ChildBlockScanner(symbolTable));
    this.reader = new SyntaxReader(statements, blocks, symbolTable);
    this.env = env;
  }

  scan(): ScanResults {
    let statement: StatementSyntax;

    while (statement = this.reader.next()) {
      this.addStatement(statement);
    }

    return { program: this.stack.current.program, children: this.stack.current.children };
  }

  startBlock(locals: string[]) {
    let childTable = SymbolTable.forBlock(this.symbolTable, locals);
    this.stack.push(new ChildBlockScanner(childTable));
  }

  endBlock(locals: string[]): InlineBlock {
    let { children, program, symbolTable } = this.stack.pop();
    let block = new InlineBlock(children, program, symbolTable, locals);
    this.addChild(block);
    return block;
  }

  addChild(block: InlineBlock) {
    this.stack.current.addChild(block);
  }

  addStatement(statement: StatementSyntax) {
    this.stack.current.addStatement(statement.scan(this));
  }

  next(): StatementSyntax {
    return this.reader.next();
  }

  unput(statement: StatementSyntax) {
    this.reader.unput(statement);
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

export class SyntaxReader {
  current: number = 0;
  last: StatementSyntax = null;

  constructor(private statements: SerializedStatement[], private blocks: InlineBlock[], private symbolTable: SymbolTable) {}

  unput(statement: StatementSyntax) {
    this.last = statement;
  }

  next(): StatementSyntax {
    let last = this.last;
    if (last) {
      this.last = null;
      return last;
    } else if (this.current === this.statements.length) {
      return null;
    }

    let sexp = this.statements[this.current++];
    return buildStatement(sexp, this.blocks, this.symbolTable);
  }
}
