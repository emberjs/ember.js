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
    let { blocks, meta } = this.spec;

    let symbolTable = SymbolTable.forEntryPoint(meta);
    let program = buildStatements(spec, blocks, symbolTable, this.env);
    return new EntryPoint(program, symbolTable);
  }

  scanLayout(): Layout {
    let { spec } = this;
    let { blocks, named, yields, meta } = this.spec;

    let symbolTable = SymbolTable.forLayout(named, yields, meta);
    let program = buildStatements(spec, blocks, symbolTable, this.env);

    return new Layout(program, symbolTable, named, yields);
  }

  scanPartial(symbolTable: SymbolTable): PartialBlock {
    let { spec } = this;
    let { blocks, locals } = this.spec;

    let program = buildStatements(spec, blocks, symbolTable, this.env);

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

  scan(): Program {
    let statement: StatementSyntax;

    while (statement = this.reader.next()) {
      this.addStatement(statement);
    }

    return this.stack.current.program;
  }

  blockFor(symbolTable: SymbolTable, id: number): InlineBlock {
    let block = this.blocks[id];
    let childTable = SymbolTable.forBlock(this.symbolTable, block.locals);
    let program = buildStatements(block, this.blocks, childTable, this.env);
    return new InlineBlock(program, childTable, block.locals);
  }

  startBlock(locals: string[]) {
    let childTable = SymbolTable.forBlock(this.symbolTable, locals);
    this.stack.push(new ChildBlockScanner(childTable));
  }

  endBlock(locals: string[]): InlineBlock {
    let { program, symbolTable } = this.stack.pop();
    let block = new InlineBlock(program, symbolTable, locals);
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

  constructor(private statements: SerializedStatement[], private symbolTable: SymbolTable, private scanner: BlockScanner) {}

  next(): StatementSyntax {
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
