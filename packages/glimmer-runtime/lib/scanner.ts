import { Program, Statement as StatementSyntax, Attribute as AttributeSyntax, ATTRIBUTE_SYNTAX } from './syntax';
import buildStatement from './syntax/statements';
import { Block, OpenElement, OpenPrimitiveElement, CloseElement, Component as ComponentSyntax } from './syntax/core';
import SymbolTable from './symbol-table';
import { RawTemplate, RawEntryPoint, RawBlock, RawLayout } from './compiler';
import Environment from './environment';
import { EMPTY_SLICE, Slice, LinkedList } from 'glimmer-util';
import { SerializedTemplate, Statement as SerializedStatement } from 'glimmer-compiler';

export default class Scanner {
  private spec: SerializedTemplate;
  private env: Environment;

  constructor(spec: SerializedTemplate, env: Environment) {
    this.spec = spec;
    this.env = env;
  }

  scanEntryPoint(): RawEntryPoint {
    return this.scanTop<RawEntryPoint>(({ program, children }) => {
      return new RawEntryPoint({ children, ops: null, program });
    });
  }

  scanLayout(): RawLayout {
    return this.scanTop<RawLayout>(({ program, children }) => {
      let { named, yields } = this.spec;
      return new RawLayout({ children, program, named, yields });
    });
  }

  private scanTop<T extends RawTemplate>(makeTop: (options: { program: Program, children: RawTemplate[] }) => T) {
    let { spec } = this;
    let { blocks: specBlocks } = spec;

    let len = specBlocks.length;
    let blocks = new Array<RawBlock>(len);

    for (let i = 0; i < len; i++) {
      let spec = specBlocks[i];

      let { program, children } = this.buildStatements(spec.statements, blocks);

      let { locals } = spec;
      blocks[i] = new RawBlock({ children, locals, program });
    }

    let { program, children } = this.buildStatements(spec.statements, blocks);
    let top = makeTop({ program, children });

    let table = top.symbolTable = new SymbolTable(null, top).initNamed(top.named).initYields(top.yields);

    top.children.forEach(t => initTemplate(t, table));

    return top;
  }

  private buildStatements(statements: SerializedStatement[], templates: RawBlock[]): { program: Program, children: RawTemplate[] } {
    if (statements.length === 0) { return { program: EMPTY_SLICE, children: [] }; }

    let program = new LinkedList<StatementSyntax>();
    let children: RawTemplate[] = [];
    let reader = new SyntaxReader(statements, templates);
    let statement: StatementSyntax;

    while (statement = reader.next()) {
      if (statement instanceof Block) {
        let block = <Block>statement;
        if (block.templates.default) children.push(block.templates.default);
        if (block.templates.inverse) children.push(block.templates.inverse);
      } else if (statement instanceof OpenElement) {
        let openElement = <OpenElement>statement;
        let { tag } = openElement;

        if (this.env.hasComponentDefinition([tag], statement)) {
          let attrs = this.attributes(reader);
          let contents = this.tagContents(reader);
          statement = new ComponentSyntax({ tag, attrs, contents });
        } else {
          statement = new OpenPrimitiveElement({ tag });
        }
      }

      program.append(statement);
    }

    return { program, children };
  }

  private attributes(reader: SyntaxReader): Slice<AttributeSyntax> {
    let current = reader.next();
    let attrs = new LinkedList<AttributeSyntax>();

    while (current[ATTRIBUTE_SYNTAX]) {
      let attr = <AttributeSyntax>current;
      attrs.append(attr);
      current = reader.next();
    }

    reader.unput(current);

    return attrs;
  }

  private tagContents(reader: SyntaxReader): Slice<StatementSyntax> {
    let nesting = 1;
    let list = new LinkedList<StatementSyntax>();

    while (true) {
      let current = reader.next();
      if (current instanceof CloseElement && --nesting === 0) {
        break;
      }

      list.append(current);

      if (current instanceof OpenElement || current instanceof OpenPrimitiveElement) {
        nesting++;
      }
    }

    return list;
  }
}

class SyntaxReader {
  statements: SerializedStatement[];
  current: number = 0;
  blocks: RawBlock[];
  last: StatementSyntax = null;

  constructor(statements: SerializedStatement[], blocks: RawBlock[]) {
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

function initTemplate(template: RawTemplate, parent: SymbolTable) {
  let { locals } = template;
  let table = parent;

  table = new SymbolTable(parent, template).initPositional(locals);

  template.symbolTable = table;
  template.children.forEach(t => initTemplate(t, table));
}