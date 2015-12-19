import { UpdatableReference } from 'glimmer-reference';
import { SerializedTemplate } from 'glimmer-compiler';
import { RawEntryPoint, RawLayout } from './compiler';
import { Environment } from './environment';
import { ElementStack } from './builder';
import VM from './vm';
import Scanner from './scanner';

interface TemplateOptions {
  raw: RawEntryPoint;
}

interface RenderOptions {
  hostOptions?: Object;
  appendTo: Element;
}

interface EvaluateOptions {
  nextSibling?: Node;
}

export default class Template {
  static fromSpec(specs: SerializedTemplate[]): Template {
    let scanner = new Scanner(specs);
    return new Template({
      raw: scanner.scanEntryPoint()
    });
  }

  static layoutFromSpec(specs: SerializedTemplate[]): RawLayout {
    let scanner = new Scanner(specs);
    return scanner.scanLayout();
  }

  raw: RawEntryPoint;

  constructor({ raw }: TemplateOptions) {
    this.raw = raw;
  }

  prettyPrint() {
  }

  render(self: any, env: Environment, options: RenderOptions, blockArguments: any[]=null) {
    let elementStack = new ElementStack({ dom: env.getDOM(), parentNode: options.appendTo, nextSibling: null });
    let vm = VM.initial(env, { self: new UpdatableReference(self), elementStack, size: this.raw.symbolTable.size });

    this.raw.compile(env);
    return vm.execute(this.raw.ops);
  }
}