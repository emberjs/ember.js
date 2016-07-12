import { SerializedTemplate } from 'glimmer-wire-format';
import { PathReference } from 'glimmer-reference';
import { EntryPoint, Layout } from './compiled/blocks';
import { Environment, DynamicScope } from './environment';
import { ElementStack } from './builder';
import { VM } from './vm';
import Scanner from './scanner';

interface TemplateOptions {
  raw: EntryPoint;
}

interface RenderOptions {
  dynamicScope: DynamicScope;
  appendTo: Element;
}

interface EvaluateOptions {
  nextSibling?: Node;
}

export default class Template {
  static fromSpec(spec: SerializedTemplate, env: Environment): Template {
    let scanner = new Scanner(spec, env);
    return new Template({
      raw: scanner.scanEntryPoint()
    });
  }

  static layoutFromSpec(spec: SerializedTemplate, env: Environment): Layout {
    let scanner = new Scanner(spec, env);
    return scanner.scanLayout();
  }

  raw: EntryPoint;
  meta: Object;

  constructor({ raw }: TemplateOptions) {
    this.raw = raw;
  }

  render(self: PathReference<any>, env: Environment, { dynamicScope, appendTo }: RenderOptions, blockArguments: any[]=null) {
    let elementStack = ElementStack.forInitialRender(env, appendTo, null);
    let compiled = this.raw.compile(env);
    let vm = VM.initial(env, { self, dynamicScope, elementStack, size: compiled.symbols });

    return vm.execute(compiled.ops);
  }
}
