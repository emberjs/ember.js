import { Program, Statement as StatementSyntax } from './syntax';
import buildStatement from './syntax/statements';
import { TopLevelTemplate, EntryPoint, InlineBlock, PartialBlock, Layout } from './compiled/blocks';
import Environment from './environment';
import { EMPTY_SLICE, LinkedList, Stack } from 'glimmer-util';
import { SerializedTemplate, SerializedBlock, Statement as SerializedStatement, BlockMeta } from 'glimmer-wire-format';
import SymbolTable from './symbol-table';

export default class Scanner {
  private spec: SerializedTemplate;
  private env: Environment;

  constructor(spec: SerializedTemplate, env: Environment) {
    this.spec = spec;
    this.env = env;
  }

  scanEntryPoint(): EntryPoint {
    return this.scanTop<EntryPoint>(({ program, children }) => {
      let { meta } = this.spec;
      return EntryPoint.create({ children, program, symbolTable: null, meta });
    });
  }

  scanLayout(): Layout {
    return this.scanTop<Layout>(({ program, children }) => {
      let { named, yields, meta } = this.spec;
      return Layout.create({ children, program, named, yields, symbolTable: null, meta });
    });
  }

  scanPartial(symbolTable: SymbolTable): PartialBlock {
    return this.scanTop<PartialBlock>(({ program, children }) => {
      let { locals, meta } = this.spec;
      return new PartialBlock({ children, program, locals, symbolTable, meta });
    });
  }

  private scanTop<T extends TopLevelTemplate>(makeTop: (options: { program: Program, children: InlineBlock[] }) => T): T {
    let { spec } = this;
    let { blocks: specBlocks, meta } = spec;

    let blocks: InlineBlock[] = [];

    for (let i = 0, block: SerializedBlock; block = specBlocks[i]; i++) {
      blocks.push(this.buildBlock(block, blocks, meta));
    }

    return makeTop(this.buildStatements(spec, blocks)).initBlocks();
  }

  private buildBlock(block: SerializedBlock, blocks: InlineBlock[], meta: BlockMeta): InlineBlock{
    let { program, children } = this.buildStatements(block, blocks);
    return new InlineBlock({ children, locals: block.locals, program, symbolTable: null, meta });
  }

  private buildStatements({ statements }: SerializedBlock, blocks: InlineBlock[]): ScanResults {
    if (statements.length === 0) return EMPTY_PROGRAM;
    return new BlockScanner(statements, blocks, this.env).scan();
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

  constructor(statements: SerializedStatement[], blocks: InlineBlock[], env: Environment) {
    this.stack.push(new ChildBlockScanner());
    this.reader = new SyntaxReader(statements, blocks);
    this.env = env;
  }

  scan(): ScanResults {
    let statement: StatementSyntax;

    while (statement = this.reader.next()) {
      this.addStatement(statement);
    }

    return { program: this.stack.current.program, children: this.stack.current.children };
  }

  startBlock() {
    this.stack.push(new ChildBlockScanner());
  }

  endBlock(): InlineBlock {
    let { children, program } = this.stack.pop();
    let block = new InlineBlock({ children, program, symbolTable: null, meta: null, locals: [] });
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

  addChild(block: InlineBlock) {
    this.children.push(block);
  }

  addStatement(statement: StatementSyntax) {
    this.program.append(statement);
  }
}

export class SyntaxReader {
  statements: SerializedStatement[];
  current: number = 0;
  blocks: InlineBlock[];
  last: StatementSyntax = null;

  constructor(statements: SerializedStatement[], blocks: InlineBlock[]) {
    this.statements = statements;
    this.blocks = blocks;
  }

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
    return buildStatement(sexp, this.blocks);
  }
}
