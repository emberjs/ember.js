import { Opaque, Option } from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';
import { assign } from '@glimmer/util';
import {
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  Statement
} from '@glimmer/wire-format';
import { ElementBuilder } from './vm/element-builder';
import { DynamicScope, Environment } from './environment';
import { TopLevelSyntax } from './syntax/interfaces';
import { IteratorResult, RenderResult, VM } from './vm';
import { EMPTY_ARGS, ICapturedArguments } from './vm/arguments';
import {
  CompilableTemplate,
  ParsedLayout,
  TemplateOptions
} from "@glimmer/opcode-compiler";
import { RuntimeProgram } from "@glimmer/program";

export interface RenderLayoutOptions {
  env: Environment;
  self: PathReference<Opaque>;
  args?: ICapturedArguments;
  dynamicScope: DynamicScope;
  builder: ElementBuilder;
}

/**
 * Environment specific template.
 */
export interface Template<Specifier = Opaque> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Template meta (both compile time and environment specific).
   */
  referrer: Specifier;

  hasEval: boolean;

  /**
   * Symbols computed at compile time.
   */
  symbols: string[];

  renderLayout(options: RenderLayoutOptions): TemplateIterator;

  // internal casts, these are lazily created and cached
  asLayout(): TopLevelSyntax;
  asPartial(): TopLevelSyntax;
}

export interface TemplateFactory<Specifier> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Compile time meta.
   */
  meta: Specifier;

  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   */
  create(env: TemplateOptions<Opaque>): Template<Specifier>;
  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   * @param {Object} meta environment specific injections into meta
   */
  create<U>(env: TemplateOptions<Opaque>, meta: U): Template<Specifier & U>;
}

export class TemplateIterator {
  constructor(private vm: VM<Opaque>) {}
  next(): IteratorResult<RenderResult> {
    return this.vm.next();
  }
}

let clientId = 0;

/**
 * Wraps a template js in a template module to change it into a factory
 * that handles lazy parsing the template and to create per env singletons
 * of the template.
 */
export default function templateFactory<Specifier>(serializedTemplate: SerializedTemplateWithLazyBlock<Specifier>): TemplateFactory<Specifier>;
export default function templateFactory<Specifier, U>(serializedTemplate: SerializedTemplateWithLazyBlock<Specifier>): TemplateFactory<Specifier & U>;
export default function templateFactory({ id: templateId, meta, block }: SerializedTemplateWithLazyBlock<any>): TemplateFactory<{}> {
  let parsedBlock: SerializedTemplateBlock;
  let id = templateId || `client-${clientId++}`;
  let create = (options: TemplateOptions<Opaque>, envMeta?: {}) => {
    let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
    if (!parsedBlock) {
      parsedBlock = JSON.parse(block);
    }
    return new ScannableTemplate(options, { id, block: parsedBlock, referrer: newMeta });
  };
  return { id, meta, create };
}

export class ScannableTemplate<Specifier = Opaque> implements Template<Specifier> {
  private layout: Option<TopLevelSyntax> = null;
  private partial: Option<TopLevelSyntax> = null;
  public symbols: string[];
  public hasEval: boolean;
  public id: string;
  public referrer: Specifier;
  private statements: Statement[];

  constructor(private options: TemplateOptions<Specifier>, private parsedLayout: ParsedLayout<Specifier>) {
    let { block } = parsedLayout;
    this.symbols = block.symbols;
    this.hasEval = block.hasEval;
    this.statements = block.statements;
    this.referrer = parsedLayout.referrer;
    this.id = parsedLayout.id || `client-${clientId++}`;
  }

  renderLayout(options: RenderLayoutOptions): TemplateIterator {
    let { env, self, dynamicScope, args = EMPTY_ARGS, builder } = options;

    let layout = this.asLayout();
    let handle = layout.compile();

    let vm = VM.initial(this.options.program as any as RuntimeProgram<Opaque>, env, self, args, dynamicScope, builder, handle);
    return new TemplateIterator(vm);
  }

  asLayout(): TopLevelSyntax {
    if (this.layout) return this.layout;
    return this.layout = compilable(this.parsedLayout, this.options, false);
  }

  asPartial(): TopLevelSyntax {
    if (this.partial) return this.partial;
    return this.partial = compilable(this.parsedLayout, this.options, true);
  }
}

export function compilable<Specifier>(layout: ParsedLayout<Specifier>, options: TemplateOptions<Opaque>, asPartial: boolean) {
  let { block, referrer } = layout;
  let { hasEval, symbols } = block;
  let compileOptions = assign({}, options, { asPartial, referrer });

  return new CompilableTemplate(block.statements, layout, compileOptions, { referrer, hasEval, symbols });
}
