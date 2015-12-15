import { InternedString, LinkedList } from 'glimmer-util';
import { UpdatableReference } from 'glimmer-reference';
import { Program, StatementSyntax } from './syntax';
import { RawTemplate } from './compiler';
import { Environment } from './environment';
import { ElementStack } from './builder';
import VM from './vm';
import Scanner from './scanner';

interface TemplateOptions {
  meta?: Object;
  root?: Template[];
  parent?: Template;
  children?: Template[];
  position?: number;
  locals?: InternedString[];
  named?: InternedString[];
  program?: Program;
  spec?: any;
  isEmpty?: boolean;
}

interface RenderOptions {
  hostOptions?: Object;
  appendTo: Element;
}

interface EvaluateOptions {
  nextSibling?: Node;
}

export default class Template {
  static fromSpec(specs: any[]): Template {
    let scanner = new Scanner(specs);
    return scanner.scan();
  }

  static fromList(program: Program): Template {
    return new Template({
      program,
      root: null,
      position: null,
      meta: null,
      locals: null,
      isEmpty: program.isEmpty(),
      spec: null
    });
  }

  static fromStatements(statements: StatementSyntax[]): Template {
    let program = new LinkedList<StatementSyntax>();
    statements.forEach(s => program.append(s));

    return new Template({
      program,
      root: null,
      position: null,
      meta: null,
      locals: null,
      isEmpty: statements.length === 0,
      spec: null
    });
  }

  meta: Object;
  parent: Template;
  children: Template[];
  root: Template[];
  position: number;
  arity: number;
  spec: any[];
  isEmpty: boolean;
  raw: RawTemplate;

  constructor({ meta, children, root, position, locals, named, program, spec, isEmpty }: TemplateOptions) {
    this.meta = meta || {};
    this.children = children;
    this.root = root || null;
    this.position = position === undefined ? null : position;
    this.arity = locals ? locals.length : 0;
    this.raw = new RawTemplate({ ops: null, locals, named, program });
    this.spec = spec || null;
    this.isEmpty = isEmpty === true ? isEmpty : program.isEmpty();
    Object.seal(this);
  }

  prettyPrint() {
    function pretty(obj) {
      if (typeof obj.prettyPrint === 'function') return obj.prettyPrint();
      else throw new Error(`Cannot pretty print ${obj.constructor.name}`);
    }

    return this.root.map(template => {
      return template.raw.program.toArray().map(statement => pretty(statement));
    });
  }

  render(self: any, env: Environment, options: RenderOptions, blockArguments: any[]=null) {
    let elementStack = new ElementStack({ dom: env.getDOM(), parentNode: options.appendTo, nextSibling: null });
    let vm = VM.initial(env, { self: new UpdatableReference(self), elementStack, size: this.raw.symbolTable.size });

    this.raw.compile(env);
    return vm.execute(this.raw.ops);
  }
}