import {
  SerializedTemplateWithLazyBlock,
  SerializedTemplateBlock,
  Statements
} from '@glimmer/wire-format';
import { PathReference } from '@glimmer/reference';
import { assign } from '@glimmer/util';
// import { SymbolTable } from '@glimmer/interfaces';
import { Environment, DynamicScope } from './environment';
import { ElementStack } from './builder';
import { VM } from './vm';
import RenderResult from './vm/render-result';
import Scanner, { Block, Program } from './scanner';
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

  /**
   * Symbols computed at compile time.
   */
  symbols: string[];

  /**
   * Helper to render template as root entry point.
   */
  render(self: PathReference<any>, appendTo: Simple.Element, dynamicScope: DynamicScope): RenderResult;

  // internal casts, these are lazily created and cached
  asEntryPoint(): Block;
  asLayout(attrs?: Statements.Attribute[]): Program;
  // asPartial(symbols: SymbolTable): Program;

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
  let entryPoint: Block;
  let asEntryPoint = () => {
    if (!entryPoint) entryPoint = scanner.scanEntryPoint();
    return entryPoint;
  };
  let layout: Program;
  let asLayout = (attrs: Statements.Attribute[] = EMPTY_ARRAY) => {
    if (!layout) layout = scanner.scanLayout(attrs);
    return layout;
  };
  // let asPartial = (_symbols: SymbolTable) => {};
  // let asPartial = (symbols: SymbolTable) => scanner.scanPartial(symbols);

  let render = (self: PathReference<any>, appendTo: Simple.Element, dynamicScope: DynamicScope) => {
    let elementStack = ElementStack.forInitialRender(env, appendTo, null);
    let compiled = asEntryPoint().compileDynamic(env);
    let vm = VM.initial(env, self, dynamicScope, elementStack, block.symbols.length);
    return vm.execute(compiled.start, compiled.end);
  };
  return { id, meta, _block: block, symbols: block.symbols, asEntryPoint, asLayout, render };
}
