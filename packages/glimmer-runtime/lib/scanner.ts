import { Program, StatementSyntax } from './syntax';
import StatementNodes from './syntax/statements';
import Template, { Block, Templates } from './template';
import SymbolTable from './symbol-table';
import { EMPTY_SLICE, LinkedList, Stack, InternedString, dict } from 'glimmer-util';

export default class Scanner {
  private specs: any[];

  constructor(specs: any[]) {
    this.specs = specs;
  }

  scan() {
    let { specs } = this;

    let templates = new Array(specs.length);

    for (let i = 0; i < specs.length; i++) {
      let spec = specs[i];

      let { program, children } = buildStatements(spec.statements, templates);

      templates[i] = new Template({
        program,
        children,
        root: templates,
        position: i,
        meta: spec.meta,
        locals: spec.locals,
        isEmpty: spec.statements.length === 0,
        spec: spec
      });
    }

    let top = templates[templates.length - 1];
    initTemplate(top, new SymbolTable(null));
    return top;
  }
}

function initTemplate(template: Template, parent: SymbolTable) {
  let locals = template.raw.locals;
  let table = template.raw.symbolTable = (locals ? new SymbolTable(parent).init(locals) : parent);
  template.children.forEach(t => initTemplate(t, table));
}

export function buildStatements(statements: any[], templates: Template[]): { program: Program, children: Template[] } {
  if (statements.length === 0) { return { program: EMPTY_SLICE, children: [] }; }

  let program = new LinkedList<StatementSyntax>();
  let children: Template[] = [];

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