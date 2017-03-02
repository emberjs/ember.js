import {
  SerializedTemplateWithLazyBlock,
  SerializedTemplateBlock
} from '@glimmer/wire-format';
import { PathReference } from '@glimmer/reference';
import { assign } from '@glimmer/util';
import { SymbolTable } from '@glimmer/interfaces';
import { Environment, DynamicScope } from './environment';
import { ElementStack } from './builder';
import { VM, RenderResult, IteratorResult } from './vm';
import Scanner, {
  EntryPoint,
  PartialBlock,
  Layout
} from './scanner';
import * as Simple from './dom/interfaces';

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

  /**
   * Helper to render template as root entry point.
   */
  render(self: PathReference<any>, appendTo: Simple.Element, dynamicScope: DynamicScope): TemplateIterator;

  // internal casts, these are lazily created and cached
  asEntryPoint(): EntryPoint;
  asLayout(): Layout;
  asPartial(symbols: SymbolTable): PartialBlock;

  // exposed for visualizer
  _block: SerializedTemplateBlock;
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
export default function templateFactory<T>(serializedTemplate: SerializedTemplateWithLazyBlock<T>): TemplateFactory<T, T>;
export default function templateFactory<T, U>(serializedTemplate: SerializedTemplateWithLazyBlock<T>): TemplateFactory<T, U>;
export default function templateFactory({ id: templateId, meta, block }: SerializedTemplateWithLazyBlock<any>): TemplateFactory<{}, {}> {
  let parsedBlock: SerializedTemplateBlock;
  let id = templateId || `client-${clientId++}`;
  let create = (env: Environment, envMeta?: {}) => {
    let newMeta = envMeta ? assign({}, envMeta, meta) : meta;
    if (!parsedBlock) {
      parsedBlock = JSON.parse(block);
    }
    return template(parsedBlock, id, newMeta, env);
  };
  return { id, meta, create };
}

function template<T>(block: SerializedTemplateBlock, id: string, meta: T, env: Environment): Template<T> {
  let scanner = new Scanner(block, meta, env);
  let entryPoint: EntryPoint;
  let asEntryPoint = () => {
    if (!entryPoint) entryPoint = scanner.scanEntryPoint();
    return entryPoint;
  };
  let layout: Layout;
  let asLayout = () => {
    if (!layout) layout = scanner.scanLayout();
    return layout;
  };
  let asPartial = (symbols: SymbolTable) => scanner.scanPartial(symbols);
  let render = (self: PathReference<any>, appendTo: Simple.Element, dynamicScope: DynamicScope) => {
    let elementStack = ElementStack.forInitialRender(env, appendTo, null);
    let compiled = asEntryPoint().compile(env);
    let vm = VM.initial(env, self, dynamicScope, elementStack, compiled);
    return new TemplateIterator(vm);
  };

  return { id, meta, _block: block, asEntryPoint, asLayout, asPartial, render };
}
