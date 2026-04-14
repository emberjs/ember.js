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

// Set the WITH_EMBER_INTEGRATION global flag BEFORE importing GXT modules.
// GXT's $_maybeModifier, $_maybeHelper, etc. check this flag to decide whether
// to delegate to the Ember manager system. Without this, string-based modifier/
// helper resolution (e.g., {{replace}}, {{on}}) doesn't work.
(globalThis as any).WITH_EMBER_INTEGRATION = true;

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
  setTracker,
  getTracker,
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
  $__fn as $__fn_original,
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

// Override $__fn to mark results with __isFnHelper so getArgValue doesn't unwrap them
// GXT's original $__fn returns plain arrow functions that look like getters to the
// Ember compat layer. By marking them, we prevent accidental invocation during
// component arg processing.
function $__fn_ember(fn: any, ...partialArgs: any[]): any {
  // Check if first arg is a mut cell
  if (fn && fn.__isMutCell) {
    const result = (...callArgs: any[]) => {
      const resolvedArgs = partialArgs.map((a: any) =>
        typeof a === 'function' && !a.prototype && a.length === 0 && !a.__isMutCell ? a() : a
      );
      return fn(...resolvedArgs, ...callArgs);
    };
    (result as any).__isFnHelper = true;
    return result;
  }
  // Check if first arg is a getter wrapping a mut cell
  if (typeof fn === 'function' && !fn.__isMutCell && fn.length === 0 && !fn.prototype) {
    try {
      const fnResult = fn();
      if (fnResult && fnResult.__isMutCell) {
        const result = (...callArgs: any[]) => {
          const resolvedArgs = partialArgs.map((a: any) =>
            typeof a === 'function' && !a.prototype && a.length === 0 && !a.__isMutCell ? a() : a
          );
          const currentMut = fn();
          return currentMut(...resolvedArgs, ...callArgs);
        };
        (result as any).__isFnHelper = true;
        return result;
      }
    } catch { /* ignore */ }
  }
  // Default: delegate to original $__fn but mark result
  const result = $__fn_original(fn, ...partialArgs);
  if (typeof result === 'function') {
    (result as any).__isFnHelper = true;
  }
  return result;
}
export { $__fn_ember as $__fn };

// Override hbs with runtime-compatible version
export { hbs } from './runtime-hbs';

// Override $_MANAGERS with Ember's component/helper/modifier manager
export { $_MANAGERS } from './manager';

// Override $_maybeHelper, $_tag, and $_dc with Ember-aware wrappers
export { $_maybeHelper, $_tag, $_dc } from './ember-gxt-wrappers';


// Default export with overrides
// @ts-ignore - direct path import
import * as gxtModule from '../node_modules/@lifeart/gxt/dist/gxt.index.es.js';
// Store the GXT module reference on globalThis so that manager.ts can access
// the original $_MANAGERS object (which GXT's internal functions close over).
// This must happen before manager.ts runs.
(globalThis as any).__gxtDirectModule = gxtModule;
(globalThis as any).__gxtOriginalManagers = gxtModule.$_MANAGERS;
import { hbs } from './runtime-hbs';
export default {
  ...gxtModule,
  hbs,
};
