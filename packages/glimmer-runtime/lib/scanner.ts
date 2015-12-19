import { Program, StatementSyntax } from './syntax';
import StatementNodes from './syntax/statements';
import { Block } from './syntax/core';
import SymbolTable from './symbol-table';
import { RawTemplate, RawEntryPoint, RawBlock, RawLayout } from './compiler';
import { EMPTY_SLICE, LinkedList } from 'glimmer-util';
import { SerializedTemplate } from 'glimmer-compiler';

export default class Scanner {
  private specs: SerializedTemplate[];

  constructor(specs: SerializedTemplate[]) {
    this.specs = specs;
  }

  scanEntryPoint(): RawEntryPoint {
    let { specs } = this;

    let top: RawEntryPoint;
    let templates = new Array<RawTemplate>(specs.length);

    for (let i = 0; i < specs.length; i++) {
      let spec = specs[i];

      let { program, children } = buildStatements(spec.statements, templates);

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

      let { program, children } = buildStatements(spec.statements, templates);

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
}

function initTemplate(template: RawTemplate, parent: SymbolTable) {
  let { locals } = template;
  let table = parent;

  table = new SymbolTable(parent, template).initPositional(locals);

  template.symbolTable = table;
  template.children.forEach(t => initTemplate(t, table));
}

export function buildStatements(statements: any[], templates: RawTemplate[]): { program: Program, children: RawTemplate[] } {
  if (statements.length === 0) { return { program: EMPTY_SLICE, children: [] }; }

  let program = new LinkedList<StatementSyntax>();
  let children: RawTemplate[] = [];

  statements.forEach(s => {
    let Statement: typeof StatementSyntax = StatementNodes(s[0]);
    let statement = Statement.fromSpec(s, templates);

    if (statement instanceof Block) {
      if (statement.templates.default) children.push(statement.templates.default);
      if (statement.templates.inverse) children.push(statement.templates.inverse);
    }

    program.append(statement);
  });

  return { program, children };
}