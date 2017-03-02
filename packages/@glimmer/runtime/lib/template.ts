import {
  TemplateMeta,
  SerializedTemplateWithLazyBlock,
  SerializedTemplateBlock,
  Statements
} from '@glimmer/wire-format';
import { PathReference } from '@glimmer/reference';
import { assign } from '@glimmer/util';
import { Option, Opaque } from '@glimmer/interfaces';
// import { SymbolTable } from '@glimmer/interfaces';
import { Environment, DynamicScope } from './environment';
import { ElementStack } from './builder';
import { VM, RenderResult, IteratorResult } from './vm';
import Scanner, { Program, Block } from './scanner';
import * as Simple from './dom/interfaces';
import { EMPTY_ARRAY } from './utils';

/**
 * Environment specific template.
 */
export interface Template<T> {
  /**
   * Template identifier, if precompiled will be the id of the
   * precompiled template.
   */
  id: string;

  /**
   * Template meta (both compile time and environment specific).
   */
  meta: T;

  hasEval: boolean;

  /**
   * Symbols computed at compile time.
   */
  symbols: string[];

  /**
   * Helper to render template as root entry point.
   */
  render(self: PathReference<Opaque>, appendTo: Simple.Element, dynamicScope: DynamicScope): TemplateIterator;

  // internal casts, these are lazily created and cached
  asEntryPoint(): Program;
  asLayout(attrs?: Statements.Attribute[]): Program;
  asPartial(): Program;
  asBlock(): Block;
}

export interface TemplateFactory<T, U> {
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
  create(env: Environment): Template<T>;
  /**
   * Used to create an environment specific singleton instance
   * of the template.
   *
   * @param {Environment} env glimmer Environment
   * @param {Object} meta environment specific injections into meta
   */
  create(env: Environment, meta: U): Template<T & U>;
}

export class TemplateIterator {
  constructor(private vm: VM) {}
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
  let create = (env: Environment, envMeta?: {}) => {
    let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
    if (!parsedBlock) {
      parsedBlock = JSON.parse(block);
    }
    return new ScannableTemplate(id, newMeta, env, parsedBlock);
  };
  return { id, meta, create };
}

class ScannableTemplate implements Template<TemplateMeta> {
  private entryPoint: Option<Program> = null;
  private layout: Option<Program> = null;
  private partial: Option<Program> = null;
  private block: Option<Block> = null;
  private scanner: Scanner;
  public symbols: string[];
  public hasEval: boolean;

  constructor(public id: string, public meta: TemplateMeta, private env: Environment, private rawBlock: SerializedTemplateBlock) {
    this.scanner = new Scanner(rawBlock, env);
    this.symbols = rawBlock.symbols;
    this.hasEval = rawBlock.hasEval;
  }

  render(self: PathReference<Opaque>, appendTo: Simple.Element, dynamicScope: DynamicScope) {
    let { env } = this;

    let elementStack = ElementStack.forInitialRender(env, appendTo, null);
    let compiled = this.asEntryPoint().compileDynamic(env);
    let vm = VM.initial(env, self, dynamicScope, elementStack, compiled);
    return new TemplateIterator(vm);
  }

  asEntryPoint(): Program {
    if (!this.entryPoint) this.entryPoint = this.scanner.scanEntryPoint(this.compilationMeta());
    return this.entryPoint;
  }

  asLayout(attrs?: Statements.Attribute[]): Program {
    if (!this.layout) this.layout = this.scanner.scanLayout(this.compilationMeta(), attrs || EMPTY_ARRAY);
    return this.layout;
  }

  asPartial(): Program {
    if (!this.partial) this.partial = this.scanner.scanEntryPoint(this.compilationMeta(true));
    return this.partial;
  }

  asBlock(): Block {
    if (!this.block) this.block = this.scanner.scanBlock(this.compilationMeta());
    return this.block;
  }

  private compilationMeta(asPartial = false) {
    return { templateMeta: this.meta, symbols: this.symbols, asPartial };
  }
}
