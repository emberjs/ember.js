/**
 * GXT wrapper that provides Ember-compatible runtime hbs support
 *
 * This module re-exports everything from @lifeart/gxt but replaces:
 * - hbs: with our runtime-compatible version
 * - $_MANAGERS: with Ember's component/helper/modifier manager
 * - $_maybeHelper: with Ember-aware wrapper
 * - $_tag: with Ember-aware wrapper
 *
 * NOTE: We use explicit named re-exports instead of `export *` to avoid
 * Vite's dep optimization issues. Vite rewrites chunk imports within
 * gxt.index.es.js to use its pre-bundled version, which tree-shakes
 * exports that aren't directly imported by app code.
 */

// Use direct path to avoid circular alias (since @lifeart/gxt is aliased to this file)
// @ts-ignore - direct path import for GXT
export {
  // From vm chunk
  COMPONENT_ID_PROPERTY,
  RENDERED_NODES_PROPERTY,
  RENDERING_CONTEXT_PROPERTY,
  cell,
  cellFor,
  configureGXT,
  effect,
  formula,
  isRendering,
  registerDestructor,
  setIsRendering,
  syncDom,
  takeRenderingControl,
  tracked,

  // From component-class chunk
  Component,

  // From dom chunk
  $PROPS_SYMBOL,
  $SLOTS_SYMBOL,
  $_GET_ARGS,
  $_GET_FW,
  $_GET_SCOPES,
  $_GET_SLOTS,
  $_HTMLProvider,
  // $_MANAGERS - overridden below
  $_MathMLProvider,
  $_SVGProvider,
  $_TO_VALUE,
  $_api,
  $_args,
  $_c,
  $_component,
  $_componentHelper,
  // $_dc - overridden below
  $_each,
  $_eachSync,
  $_edp,
  $_emptySlot,
  $_fin,
  $_hasBlock,
  $_hasBlockParams,
  $_helper,
  $_helperHelper,
  $_if,
  $_inElement,
  // $_maybeHelper - overridden below
  $_maybeModifier,
  $_modifierHelper,
  $_slot,
  // $_tag - overridden below
  $_ucw,
  $_unwrapArgs,
  $_unwrapHelperArg,
  HTMLBrowserDOMApi,
  RENDERING_CONTEXT,
  ROOT_CONTEXT,
  Root,
  cleanupFastContext,
  createRoot,
  destroyElementSync,
  getContext,
  getNodeCounter,
  getParentContext,
  incrementNodeCounter,
  initDOM,
  popParentContext,
  provideContext,
  pushParentContext,
  renderComponent,
  resetNodeCounter,
  resolveRenderable,
  runDestructors,
  setParentContext,
  targetFor,

  // From and chunk
  $__and,
  $__array,
  $__debugger,
  $__eq,
  $__fn,
  $__hash,
  $__if,
  $__log,
  $__not,
  $__or,

  // From suspense chunk
  SUSPENSE_CONTEXT,
  followPromise,

  // From index (local)
  scope,

  // Additional exports used by compiled templates
  $args,
  $fwProp,
  $template,
} from '../node_modules/@lifeart/gxt/dist/gxt.index.es.js';

// Override hbs with runtime-compatible version
export { hbs } from './runtime-hbs';

// Override $_MANAGERS with Ember's component/helper/modifier manager
export { $_MANAGERS } from './manager';

// Override $_maybeHelper, $_tag, and $_dc with Ember-aware wrappers
export { $_maybeHelper, $_tag, $_dc } from './ember-gxt-wrappers';

// Default export with overrides
// @ts-ignore - direct path import
import * as gxtModule from '../node_modules/@lifeart/gxt/dist/gxt.index.es.js';
import { hbs } from './runtime-hbs';
export default {
  ...gxtModule,
  hbs,
};
