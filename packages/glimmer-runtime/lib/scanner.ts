import { Program, StatementSyntax, AttributeSyntax, ATTRIBUTE_SYNTAX } from './syntax';
import StatementNodes from './syntax/statements';
import { Block, OpenElement, OpenPrimitiveElement, CloseElement, Component as ComponentSyntax } from './syntax/core';
import SymbolTable from './symbol-table';
import { RawTemplate, RawEntryPoint, RawBlock, RawLayout } from './compiler';
import Environment from './environment';
import { EMPTY_SLICE, Slice, LinkedList } from 'glimmer-util';
import { SerializedTemplate } from 'glimmer-compiler';

export default class Scanner {
  private specs: SerializedTemplate[];
  private env: Environment;

  constructor(specs: SerializedTemplate[], env: Environment) {
    this.specs = specs;
    this.env = env;
  }

  scanEntryPoint(): RawEntryPoint {
    let { specs } = this;

    let top: RawEntryPoint;
    let templates = new Array<RawTemplate>(specs.length);

    for (let i = 0; i < specs.length; i++) {
      let spec = specs[i];

      let { program, children } = this.buildStatements(spec.statements, templates);

      if (i === specs.length - 1) {
        templates[i] = top = new RawEntryPoint({ children, program });
      } else {
        let { locals } = spec;
        templates[i] = new RawBlock({ children, locals, program });
      }
    }

    let table = top.symbolTable = new SymbolTable(null, top);

    top.children.forEach(t => initTemplate(t, table));

    return top;
  }

  scanLayout(): RawLayout {
    let { specs } = this;

    let top: RawLayout;
    let templates = new Array<RawTemplate>(specs.length);

    for (let i = 0; i < specs.length; i++) {
      let spec = specs[i];

      let { program, children } = this.buildStatements(spec.statements, templates);

      if (i === specs.length - 1) {
        let { named } = spec;
        templates[i] = top = new RawLayout({ children, named, program });
      } else {
        let { locals } = spec;
        templates[i] = new RawBlock({ children, locals, program });
      }
    }

    let table = top.symbolTable = new SymbolTable(null, top).initNamed(top.named);

    top.children.forEach(t => initTemplate(t, table));

    return top;
  }

  private buildStatements(statements: any[], templates: RawTemplate[]): { program: Program, children: RawTemplate[] } {
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
  statements: any[];
  current: number = 0;
  templates: RawTemplate[];
  last: StatementSyntax = null;

  constructor(statements: any[], templates: RawTemplate[]) {
    this.statements = statements;
    this.templates = templates;
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

    let s = this.statements[this.current++];
    let Statement: typeof StatementSyntax = StatementNodes(s[0]);
    return Statement.fromSpec(s, this.templates);
  }
}

function initTemplate(template: RawTemplate, parent: SymbolTable) {
  let { locals } = template;
  let table = parent;

  table = new SymbolTable(parent, template).initPositional(locals);

  template.symbolTable = table;
  template.children.forEach(t => initTemplate(t, table));
}