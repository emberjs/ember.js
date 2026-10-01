/**
 * EXPERIMENTAL
 *
 * Runtime helpers for strict-mode templates that are compiled directly to
 * DOM operations (see `compileToDOM` in `@glimmer/compiler`), instead of to
 * the wire format and then to VM bytecode.
 *
 * Each dynamic part of a template becomes one call to one of these helpers;
 * the helpers own all of the behavior, so compiled output stays small and
 * apps only pay for the helpers their templates use.
 */
export type { AttrsFn, Block, BlockFn, Blocks, Ctx, Thunk } from './lib/core';
export { at, clone, html, setTemplate, template, Template } from './lib/core';
export { attr, listen, splat } from './lib/attributes';
export { appendCall, content, MAY_CALL, TRUSTING } from './lib/content';
export { each, inElement, scope, when, yieldTo } from './lib/control-flow';
export { curry, invoke, invokeDyn, setVMFallback } from './lib/invoke';
export { helper, helperDyn, modifier } from './lib/managers';
export { renderComponent, type RenderResult } from './lib/render';
export {
  and,
  bool,
  entries,
  get,
  getPath,
  hasBlock,
  hasBlockParams,
  log,
  memo,
  or,
  str,
} from './lib/values';
