import { Cursor } from './bounds';
import { Opaque, Option } from '@glimmer/interfaces';
import { PathReference } from '@glimmer/reference';
import { assign } from '@glimmer/util';
import {
  SerializedTemplateBlock,
  SerializedTemplateWithLazyBlock,
  TemplateMeta,
  Statement
} from '@glimmer/wire-format';
import { NewElementBuilder } from './vm/element-builder';
import { RehydrateBuilder } from './vm/rehydrate-builder';
import { SerializeBuilder } from './vm/serialize-builder';
import { DynamicScope, Environment } from './environment';
import { TopLevelSyntax } from './syntax/interfaces';
import { IteratorResult, RenderResult, VM } from './vm';
import { EMPTY_ARGS, ICapturedArguments } from './vm/arguments';
import {
  CompilableTemplate,
  ParsedLayout,
  TemplateOptions
} from "@glimmer/opcode-compiler";
import { Program } from "@glimmer/program";

export interface RenderLayoutOptions {
  env: Environment;
  self: PathReference<Opaque>;
  args?: ICapturedArguments;
  cursor: Cursor;
  dynamicScope: DynamicScope;
  mode?: 'client' | 'rehydrate' | 'serialize';
}

/**
 * Environment specific template.
 */
export interface Template<TemplateMeta = Opaque> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Template meta (both compile time and environment specific).
   */
  meta: TemplateMeta;

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

export interface TemplateFactory<T extends TemplateMeta, U> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Compile time meta.
   */
  meta: T;

  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   */
  create(env: TemplateOptions<Opaque, Opaque>): Template<T>;
  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   * @param {Object} meta environment specific injections into meta
   */
  create(env: TemplateOptions<Opaque, Opaque>, meta: U): Template<T & U>;
}

export class TemplateIterator {
  constructor(private vm: VM<Opaque, Opaque>) {}
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
export default function templateFactory<T extends TemplateMeta>(serializedTemplate: SerializedTemplateWithLazyBlock<T>): TemplateFactory<T, T>;
export default function templateFactory<T extends TemplateMeta, U>(serializedTemplate: SerializedTemplateWithLazyBlock<T>): TemplateFactory<T, U>;
export default function templateFactory({ id: templateId, meta, block }: SerializedTemplateWithLazyBlock<any>): TemplateFactory<{}, {}> {
  let parsedBlock: SerializedTemplateBlock;
  let id = templateId || `client-${clientId++}`;
  let create = (options: TemplateOptions<Opaque, Opaque>, envMeta?: {}) => {
    let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
    if (!parsedBlock) {
      parsedBlock = JSON.parse(block);
    }
    return new ScannableTemplate(options, { id, block: parsedBlock, meta: newMeta });
  };
  return { id, meta, create };
}

export class ScannableTemplate implements Template<TemplateMeta> {
  private layout: Option<TopLevelSyntax> = null;
  private partial: Option<TopLevelSyntax> = null;
  public symbols: string[];
  public hasEval: boolean;
  public id: string;
  public meta: TemplateMeta;
  private statements: Statement[];

  constructor(private options: TemplateOptions<Opaque, Opaque>, private parsedLayout: ParsedLayout) {
    let { block } = parsedLayout;
    this.symbols = block.symbols;
    this.hasEval = block.hasEval;
    this.statements = block.statements;
    this.meta = parsedLayout.meta;
    this.id = parsedLayout.id || `client-${clientId++}`;
  }

  renderLayout(options: RenderLayoutOptions): TemplateIterator {
    let { env, self, dynamicScope, args = EMPTY_ARGS, cursor, mode = 'client' } = options;
    let builder = elementBuilder({ env, cursor, mode });

    let layout = this.asLayout();
    let handle = layout.compile();

    let vm = VM.initial(this.options.program as any as Program<Opaque, Opaque>, env, self, args, dynamicScope, builder, layout.symbolTable, handle);
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

export function compilable(layout: ParsedLayout, options: TemplateOptions<Opaque, Opaque>, asPartial: boolean) {
  let { block, meta } = layout;
  let { hasEval, symbols } = block;
  let compileOptions = { ...options, asPartial };

  return new CompilableTemplate(block.statements, layout, compileOptions, { meta, hasEval, symbols });
}

function elementBuilder({ mode, env, cursor }: Pick<RenderLayoutOptions, 'mode' | 'env' | 'cursor'>) {
  switch (mode) {
    case 'client': return NewElementBuilder.forInitialRender(env, cursor);
    case 'rehydrate': return RehydrateBuilder.forInitialRender(env, cursor);
    case 'serialize': return SerializeBuilder.forInitialRender(env, cursor);
    default: throw new Error('unreachable');
  }
}
