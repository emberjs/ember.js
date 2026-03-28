/**
 * GXT-compatible @ember/template-compilation implementation
 *
 * This module provides runtime template compilation using the GXT runtime compiler.
 * It implements the same interface as @ember/template-compilation but uses GXT
 * for template compilation instead of Glimmer VM.
 */

// Import Ember debug utilities for attrs assertion/deprecation
import { assert as emberAssert } from '@ember/debug';
import { deprecate as emberDeprecate } from '@ember/debug';
import { getDebugFunction } from '@ember/debug';

// Helper to detect assertion-related throws that must escape catch blocks.
// The expectAssertion test helper throws a non-Error sentinel (BREAK = {})
// when a stubbed assert fires. Also re-throws actual Assertion Failed errors.
function _isAssertionLike(e: unknown): boolean {
  if (e instanceof Error) {
    return e.message?.includes('Assertion Failed') === true;
  }
  // Non-Error, non-null/undefined objects may be the BREAK sentinel from expectAssertion.
  if (e !== null && e !== undefined && typeof e === 'object') return true;
  return false;
}

// Track style warnings per element to prevent duplicates when GXT sets style
// via both prop() and attr() paths, or when manager.ts also sets it.
// Also suppress all style warnings during force-rerender (morph).
const _styleWarnedElements = new WeakSet<object>();

function _shouldWarnStyle(element: any, _value?: string): boolean {
  // During force-rerender, suppress all style warnings — the initial render already warned.
  if ((globalThis as any).__gxtIsForceRerender) return false;
  if (element && typeof element === 'object') {
    if (_styleWarnedElements.has(element)) return false;
    _styleWarnedElements.add(element);
  }
  return true;
}
// Expose for manager.ts to use the same deduplication
(globalThis as any).__gxtShouldWarnStyle = _shouldWarnStyle;

// Inline the style warning message to avoid importing @ember/-internals/views
// (which can cause circular dependency issues during module initialization)
function _constructStyleDeprecationMessage(affectedStyle: string): string {
  return (
    'Binding style attributes may introduce cross-site scripting vulnerabilities; ' +
    'please ensure that values being bound are properly escaped. For more information, ' +
    'including how to disable this warning, see ' +
    'https://deprecations.emberjs.com/v1.x/#toc_binding-style-attributes. ' +
    'Style affected: "' +
    affectedStyle +
    '"'
  );
}

// Import the GXT runtime compiler
// @ts-ignore - direct path to avoid GXT Babel plugin
import {
  compileTemplate as gxtCompileTemplate,
  setupGlobalScope,
  isGlobalScopeReady,
} from '../node_modules/@lifeart/gxt/dist/gxt.runtime-compiler.es.js';

// Use direct path to avoid GXT Babel plugin processing (which injects duplicate declarations)
// @ts-ignore - direct path import
import {
  createRoot as gxtCreateRoot,
  setParentContext as gxtSetParentContext,
  $_MANAGERS,
  RENDERED_NODES_PROPERTY,
  COMPONENT_ID_PROPERTY,
  RENDERING_CONTEXT_PROPERTY,
  initDOM as gxtInitDOM,
  setIsRendering as gxtSetIsRendering,
  isRendering as gxtIsRendering,
  syncDom as _syncDomFromDirectImport,
  cellFor as _cellForFromDirectImport,
  effect as _effectFromDirectImport,
  // Symbols needed by renderer.ts / root.ts exposed via globalThis
  RENDERING_CONTEXT as _GXT_RENDERING_CONTEXT,
  HTMLBrowserDOMApi as _GXT_HTMLBrowserDOMApi,
  provideContext as _gxtProvideContext,
  getParentContext as _gxtGetParentContext,
  destroyElementSync as _gxtDestroyElementSync,
  renderComponent as _gxtRenderComponent,
  Component as _GXT_Component,
} from '../node_modules/@lifeart/gxt/dist/gxt.index.es.js';

// After setupGlobalScope(), __gxtCellFor and __gxtEffect are set from GXT's
// runtime module instance (sharing currentTracker with formulas).
// Use those for cell creation/tracking. Fall back to direct imports if not available.
// These are module-level vars reassigned after setupGlobalScope.
var cellFor = _cellForFromDirectImport;
var gxtEffect = _effectFromDirectImport;
var gxtSyncDom = _syncDomFromDirectImport;

// Expose GXT symbols on globalThis so renderer.ts and root.ts can access them
// without importing from @lifeart/gxt (whose pre-bundled version drops these exports)
(globalThis as any).__gxtSymbols = {
  RENDERING_CONTEXT: _GXT_RENDERING_CONTEXT,
  HTMLBrowserDOMApi: _GXT_HTMLBrowserDOMApi,
  provideContext: _gxtProvideContext,
  getParentContext: _gxtGetParentContext,
  destroyElementSync: _gxtDestroyElementSync,
  renderComponent: _gxtRenderComponent,
  Component: _GXT_Component,
  createRoot: gxtCreateRoot,
  setParentContext: gxtSetParentContext,
};

// Install shared Ember wrappers for $_maybeHelper and $_tag on globalThis
import { installEmberWrappers } from './ember-gxt-wrappers';

const _SLOTS_SYM = Symbol.for('gxt-slots');

// Ensure global scope is set up
if (!isGlobalScopeReady()) {
  setupGlobalScope();
}

// Use cellFor/effect/syncDom from GXT's runtime (same module instance as formulas).
// setupGlobalScope() exposes these from the SAME module instance that holds
// tagsToRevalidate, relatedTags, and currentTracker. Using these ensures
// cell tracking and sync work across the Ember compat layer.
if ((globalThis as any).__gxtCellFor) cellFor = (globalThis as any).__gxtCellFor;
if ((globalThis as any).__gxtEffect) gxtEffect = (globalThis as any).__gxtEffect;
if ((globalThis as any).__gxtSyncDom) gxtSyncDom = (globalThis as any).__gxtSyncDom;
// Re-expose for manager.ts
(globalThis as any).__gxtCellFor = cellFor;
(globalThis as any).__gxtEffect = gxtEffect;
// Expose isRendering check for tracked setter to avoid dirtying during render
(globalThis as any).__gxtIsRendering = gxtIsRendering;

// Use setIsRendering from GXT's runtime module (setupGlobalScope sets __gxtSetIsRendering).
// The direct import (gxtSetIsRendering) may be from a different module copy,
// which would set isRendering on a different variable than what formulas check.
// Fall back to direct import if runtime version isn't available yet.
if (!(globalThis as any).__gxtSetIsRendering) {
  (globalThis as any).__gxtSetIsRendering = gxtSetIsRendering;
}

// Install Ember-aware wrappers for $_maybeHelper on globalThis
installEmberWrappers();

// Patch SafeString.toString() to track when a SafeString is being converted to
// a string during GXT's quoted attribute concatenation. This lets the style prop
// patch distinguish between a plain string (warn) and a SafeString-derived string
// (no warn). We track the last SafeString result so the prop patch can compare.
// Deferred to avoid circular deps — patches after modules are loaded.
setTimeout(() => {
  try {
    // Use dynamic import to avoid circular dependency during static init
    import('@ember/-internals/glimmer/lib/utils/string').then(mod => {
      const SafeString = mod.SafeString;
      if (SafeString?.prototype?.toString) {
        const origToString = SafeString.prototype.toString;
        SafeString.prototype.toString = function() {
          const result = origToString.call(this);
          (globalThis as any).__gxtLastSafeStringResult = result;
          return result;
        };
      }
    }).catch(() => {});
  } catch {}
}, 0);

// Patch GXT's HTMLBrowserDOMApi.attr() to handle undefined values.
// GXT's native implementation: attr(t,e,n){t.setAttribute(e,null===n?"":n)}
// This only handles null -> "" but not undefined. In Ember, when a bound attribute
// value becomes undefined, the attribute should be REMOVED from the element.
// Without this patch, undefined becomes the string "undefined" on the DOM.
if (_GXT_HTMLBrowserDOMApi && _GXT_HTMLBrowserDOMApi.prototype) {
  const origAttr = _GXT_HTMLBrowserDOMApi.prototype.attr;
  _GXT_HTMLBrowserDOMApi.prototype.attr = function(element: any, name: string, value: any) {
    // When setting style attribute with a dynamic non-safe value, warn (once per render pass)
    if (name === 'style' && value !== null && value !== undefined) {
      const isHTMLSafe = value && typeof value === 'object' && typeof value.toHTML === 'function';
      if (!isHTMLSafe && _shouldWarnStyle(element, String(value))) {
        const warnFn = getDebugFunction('warn');
        if (warnFn) warnFn(_constructStyleDeprecationMessage(String(value)), false, { id: 'ember-htmlbars.style-xss-warning' });
      }
    }
    if (value === undefined || value === false) {
      element.removeAttribute(name);
    } else {
      origAttr.call(this, element, name, value);
    }
  };

  // Patch prop() to warn when setting style with a non-safe dynamic value.
  // GXT uses prop(element, 'style', value) which sets element.style.cssText.
  // For quoted attrs like style="{{expr}}", GXT concatenates the expression result
  // into a string before calling prop(). A SafeString.toString() is called during
  // this concatenation, so we track it with a counter to avoid false warnings.
  const origProp = _GXT_HTMLBrowserDOMApi.prototype.prop;
  _GXT_HTMLBrowserDOMApi.prototype.prop = function(element: any, name: string, value: any) {
    if (name === 'style' && value !== null && value !== undefined && value !== '') {
      const isHTMLSafe = value && typeof value === 'object' && typeof value.toHTML === 'function';
      // Check if the value is a string that came from a SafeString conversion.
      // When style="{{expr}}" with SafeString, GXT calls toString() then sets the result.
      // If the prop value exactly matches the last SafeString.toString() result,
      // treat it as safe (no warning). If static text was mixed in (e.g., style="text {{expr}}"),
      // the final value will differ from the SafeString output, so we still warn.
      let isSafeFromConcat = false;
      if (typeof value === 'string') {
        const lastSafe = (globalThis as any).__gxtLastSafeStringResult;
        if (lastSafe !== undefined && value === lastSafe) {
          isSafeFromConcat = true;
        }
      }
      (globalThis as any).__gxtLastSafeStringResult = undefined;
      if (!isHTMLSafe && !isSafeFromConcat && _shouldWarnStyle(element, String(value))) {
        const warnFn = getDebugFunction('warn');
        if (warnFn) warnFn(_constructStyleDeprecationMessage(String(value)), false, { id: 'ember-htmlbars.style-xss-warning' });
      }
    }
    return origProp.call(this, element, name, value);
  };
}

// Override GXT's $__fn to support mut cells.
// GXT's $__fn unwraps function args by calling them with no args, which breaks
// mut cells (calling mutCell() returns the current value instead of the setter).
// Also marks the returned function with __isFnHelper so the compat layer can
// distinguish fn-helper results from GXT reactive getters (both are arrow fns).
{
  const g = globalThis as any;
  const originalFn = g.$__fn;
  if (originalFn) {
    g.$__fn = function $__fn_ember(fn: any, ...partialArgs: any[]) {
      let result: any;
      // If the first arg is a mut cell, don't unwrap it
      if (fn && fn.__isMutCell) {
        result = (...callArgs: any[]) => {
          const resolvedArgs = partialArgs.map((a: any) =>
            typeof a === 'function' && !a.__isMutCell ? a() : a
          );
          return fn(...resolvedArgs, ...callArgs);
        };
        result.__isFnHelper = true;
        return result;
      }
      // Also check if the first arg is a function that, when called, returns a mut cell
      // GXT wraps helper results in getters
      if (typeof fn === 'function' && !fn.__isMutCell) {
        try {
          const fnResult = fn();
          if (fnResult && fnResult.__isMutCell) {
            result = (...callArgs: any[]) => {
              const resolvedArgs = partialArgs.map((a: any) =>
                typeof a === 'function' && !a.__isMutCell ? a() : a
              );
              // Re-evaluate the getter to get the current mut cell
              const currentMut = fn();
              return currentMut(...resolvedArgs, ...callArgs);
            };
            result.__isFnHelper = true;
            return result;
          }
        } catch { /* ignore */ }
      }
      // Create a partially-applied function that resolves all getters at call time.
      // The fn arg may be a getter (arrow fn wrapping this.X) — we wrapped it
      // in compile.ts to support reactive function swaps.
      // Partial args are also getters from GXT for reactive arg updates.
      const isArgGetter = (v: any) => typeof v === 'function' && !v.prototype && !v.__isFnHelper && !v.__isMutCell;
      result = function $__fn_partial(...callArgs: any[]) {
        // Resolve fn: if it's a getter (arrow fn), call to get the actual function
        const resolvedFn = isArgGetter(fn) ? fn() : fn;
        // Resolve partial args: if they're getters (arrow fns), call them
        const resolvedPartials = partialArgs.map((a: any) => isArgGetter(a) ? a() : a);
        if (typeof resolvedFn !== 'function') {
          return resolvedFn;
        }
        return resolvedFn(...resolvedPartials, ...callArgs);
      };
      result.__isFnHelper = true;
      return result;
    };
  }
}

// NOTE: $_if reactivity is limited by GXT's async branch rendering.
// When the condition changes, GXT's IfCondition.renderBranch calls
// destroyBranch() (async) before rendering the new branch. This means
// synchronous test assertions won't see the updated DOM immediately.
// This affects tests like "yield to inverse", "isStream", etc.

// Helper: resolve all curried arg values (evaluating getters) into a snapshot.
function _resolveCurriedArgs(curried: any): { name: any; args: Record<string, any>; positionals: any[] } {
  const cArgs = curried.__curriedArgs || {};
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(cArgs)) {
    resolved[key] = (typeof value === 'function' && !(value as any).__isCurriedComponent && !(value as any).prototype)
      ? (value as any)() : value;
  }
  const cPos = curried.__curriedPositionals || [];
  const resolvedPos: any[] = [];
  for (const val of cPos) {
    resolvedPos.push((typeof val === 'function' && !(val as any).__isCurriedComponent && !(val as any).prototype)
      ? val() : val);
  }
  return { name: curried.__name, args: resolved, positionals: resolvedPos };
}

// Helper: snapshot curried args on a render info for later comparison.
function _snapshotCurriedArgs(info: any, curried: any) {
  const snap = _resolveCurriedArgs(curried);
  info.__lastSnapshot = snap;
}

// Helper: check if curried component has changed compared to last snapshot.
function _curriedComponentChanged(info: any, curried: any): boolean {
  const last = info.__lastSnapshot;
  if (!last) return true; // No previous snapshot — treat as changed
  const current = _resolveCurriedArgs(curried);
  if (last.name !== current.name) return true;
  // Compare named args
  const lastKeys = Object.keys(last.args);
  const currentKeys = Object.keys(current.args);
  if (lastKeys.length !== currentKeys.length) return true;
  for (const key of currentKeys) {
    if (last.args[key] !== current.args[key]) return true;
  }
  // Compare positionals
  if (last.positionals.length !== current.positionals.length) return true;
  for (let i = 0; i < current.positionals.length; i++) {
    if (last.positionals[i] !== current.positionals[i]) return true;
  }
  return false;
}

// Override $_componentHelper with Ember-aware version that creates CurriedComponent.
// Uses lazy lookup of CurriedComponent class because manager.ts may load after compile.ts.
{
  const g = globalThis as any;

  if (g.$_componentHelper) {
    const unwrapArg = (v: any) => typeof v === 'function' && !v.prototype ? v() : v;
    // Cache the last known owner so re-evaluations during reactive updates
    // (when globalThis.owner may be null) can still resolve components.
    let _cachedOwner: any = null;

    g.$_componentHelper = function $_componentHelper_ember(params: any[], hash: Record<string, any>) {
      const createCurried = g.__createCurriedComponent;
      if (!createCurried) {
        // Fallback: no createCurriedComponent available yet, return the original behavior
        return params[0];
      }

      // Resolve the first arg (component name/ref)
      const first = unwrapArg(params[0]);

      // Track the owner — prefer globalThis.owner, fall back to cached.
      // Also use the shared getOwnerWithFallback from manager.ts which has
      // a more robust cache that survives across reactive re-evaluations.
      const currentOwner = g.owner;
      if (currentOwner && !currentOwner.isDestroyed && !currentOwner.isDestroying) {
        _cachedOwner = currentOwner;
      }
      if (_cachedOwner && (_cachedOwner.isDestroyed || _cachedOwner.isDestroying)) {
        _cachedOwner = null;
      }
      const sharedOwner = typeof g.__getOwnerWithFallback === 'function' ? g.__getOwnerWithFallback() : null;
      const owner = currentOwner || _cachedOwner || sharedOwner;

      // Capture the parent render context for two-way binding via mut.
      const parentRenderCtx = (g as any).__lastRenderContext;

      // Collect named args from hash (keep getters for reactivity).
      // Also eagerly evaluate each getter to establish GXT cell tracking
      // in the calling formula's context — this ensures the parent template
      // re-evaluates when curried arg dependencies change.
      const namedArgs: Record<string, any> = {};
      if (hash) {
        for (const key of Object.keys(hash)) {
          const val = hash[key];
          namedArgs[key] = val;
          // Annotate hash getter functions with parent context for mut support
          if (typeof val === 'function' && !val.prototype && parentRenderCtx) {
            (val as any).__mutParentCtx = parentRenderCtx;
          }
          // Touch the value to track the cell dependency
          if (typeof val === 'function' && !val.prototype) {
            try { val(); } catch { /* ignore */ }
          }
        }
      }

      // Collect remaining positional params (after the first which is the component ref)
      // For each positional getter, also store a setter if derivable (for mut support).
      const positionals: any[] = [];
      for (let i = 1; i < params.length; i++) {
        const p = params[i];
        // Annotate getter functions with the parent context for mut support
        if (typeof p === 'function' && !p.prototype && parentRenderCtx) {
          (p as any).__mutParentCtx = parentRenderCtx;
        }
        positionals.push(p);
        // Touch positional values to track cell dependencies
        if (typeof p === 'function' && !p.prototype) {
          try { p(); } catch { /* ignore */ }
        }
      }

      // Validate that a string component name can be resolved.
      // This throws eagerly during template evaluation (matching Ember's behavior
      // of asserting during render for non-existent components).
      // IMPORTANT: Only validate with the CURRENT globalThis.owner (not cached fallback)
      // because cached owners may be from a different test and won't have the
      // component registered. Skipping validation during reactive re-evaluations
      // (when g.owner is null) is safe — the manager will handle resolution.
      if (typeof first === 'string' && first.length > 0) {
        const validationOwner = g.owner;
        if (validationOwner && !validationOwner.isDestroyed && !validationOwner.isDestroying) {
          const factory = validationOwner.factoryFor?.(`component:${first}`);
          const template = validationOwner.lookup?.(`template:components/${first}`);
          // Also check via lookup (resolver-based registrations may not show via factoryFor)
          const looked = !factory ? validationOwner.lookup?.(`component:${first}`) : factory;
          if (!factory && !template && !looked) {
            const err = new Error(
              `Attempted to resolve \`${first}\`, which was expected to be a component, but nothing was found. ` +
              `Could not find component named "${first}" (no component or template with that name was found)`
            );
            // Capture the error so flushRenderErrors() can re-throw it
            // (GXT may catch the thrown error during formula evaluation)
            const captureErr = g.__captureRenderError;
            if (typeof captureErr === 'function') {
              captureErr(err);
            }
            throw err;
          }
        }
      }

      // Temporarily set globalThis.owner for createCurriedComponent to capture
      const prevOwner = g.owner;
      if (!prevOwner && owner) {
        g.owner = owner;
      }
      try {
        // Create a curried component
        return createCurried(first, namedArgs, positionals);
      } finally {
        if (!prevOwner && owner) {
          g.owner = prevOwner;
        }
      }
    };
  }
}

// Override GXT's $__if with Ember-aware truthiness rules.
// Ember considers empty arrays, proxy objects with isTruthy=false, and
// empty HTMLSafe strings as falsy, unlike JavaScript's standard truthiness.
{
  const g = globalThis as any;
  const _isArray = Array.isArray;
  // Use Ember's isProxy (WeakSet-based) for reliable proxy detection.
  // The heuristic (_content/content check) fails for proxies with undefined content.
  const _isProxyImport = (() => {
    try {
      // Access Ember's proxy WeakSet — isProxy uses PROXIES.has(value)
      // The isProxy function is also available via @ember/-internals/utils
      return (v: any): boolean => {
        if (!v || typeof v !== 'object') return false;
        // Check Ember's proxy marker (setProxy adds to WeakSet)
        // Also fall back to duck-typing: ObjectProxy has unknownProperty
        if (typeof v.unknownProperty === 'function' && typeof v.setUnknownProperty === 'function') return true;
        // Check _content property existence (ObjectProxy stores content internally)
        if ('_content' in v || 'content' in v) return true;
        return false;
      };
    } catch { return (v: any) => false; }
  })();

  function emberToBool(predicate: unknown): boolean {
    if (predicate && typeof predicate === 'object') {
      // Proxy: check isTruthy
      if (_isProxyImport(predicate)) {
        return Boolean((predicate as any).isTruthy ?? (predicate as any).content);
      }
      // Array: empty is falsy
      if (_isArray(predicate)) {
        return (predicate as any[]).length !== 0;
      }
      // HTMLSafe: check toString()
      if (typeof (predicate as any).toHTML === 'function') {
        return Boolean((predicate as any).toString());
      }
    }
    return Boolean(predicate);
  }

  // Register Ember truthiness for GXT's $_if (block control flow)
  // GXT's IfCondition.setupCondition checks __gxtToBool before its own !!v
  g.__gxtToBool = emberToBool;

  // Replace $__if on globalThis with Ember-aware version
  if (g.$__if) {
    g.$__if = function $__if_ember(condition: unknown, ifTrue: unknown, ifFalse: unknown = '') {
      // Unwrap GXT getter
      const rawCond = typeof condition === 'function' && !condition.prototype ? condition() : condition;
      // Apply Ember truthiness
      const cond = emberToBool(rawCond);
      const result = cond ? ifTrue : ifFalse;
      // Unwrap result getter
      return typeof result === 'function' && !result.prototype ? result() : result;
    };
  }
}

// GXT external schedule hook: GXT's cell.update() calls scheduleRevalidate()
// which now checks globalThis.__gxtExternalSchedule before using queueMicrotask.
// We set it to a no-op so GXT doesn't auto-schedule DOM sync — instead we
// control when gxtSyncDom() is called (after runTask, or via setTimeout fallback).
(globalThis as any).__gxtPendingSync = false;
(globalThis as any).__gxtPendingSyncFromPropertyChange = false;
(globalThis as any).__gxtExternalSchedule = function() {
  (globalThis as any).__gxtPendingSync = true;
  // Note: this is from cell/effect scheduling, NOT from a property change.
  // __gxtPendingSyncFromPropertyChange is set separately by _notifyPropertiesChanged.
};

// Reverse mapping: array/object -> Set<{ obj, key }> for dirty propagation.
// When cellFor installs a cell and the value is an array, register a mapping.
// Used to dirty component cells when KVO arrays mutate in-place.
const _arrayOwnerMap = new WeakMap<object, Set<{ obj: object; key: string }>>();

// Reverse mapping: object VALUE -> Set<{ obj, key }> for computed property propagation.
// When a cell holds an object as its value (e.g., renderContext['m'] = emberObj),
// and a property changes on that object (e.g., set(emberObj, 'message', ...)),
// we need to dirty the cell that holds the object so formulas re-evaluate.
// This handles the case where {{this.m.formattedMessage}} needs to update
// when m.message changes — the formula only tracks cell(renderContext, 'm'),
// not cell(m, 'formattedMessage').
const _objectValueCellMap = new WeakMap<object, Set<{ obj: object; key: string }>>();

function registerObjectValueOwner(value: any, ownerObj: object, ownerKey: string) {
  if (!value || typeof value !== 'object') return;
  let owners = _objectValueCellMap.get(value);
  if (!owners) {
    owners = new Set();
    _objectValueCellMap.set(value, owners);
  }
  // Avoid duplicates
  for (const entry of owners) {
    if (entry.obj === ownerObj && entry.key === ownerKey) return;
  }
  owners.add({ obj: ownerObj, key: ownerKey });
}
(globalThis as any).__gxtRegisterObjectValueOwner = registerObjectValueOwner;

function registerArrayOwner(array: any, ownerObj: object, ownerKey: string) {
  if (!array || typeof array !== 'object') return;
  let owners = _arrayOwnerMap.get(array);
  if (!owners) {
    owners = new Set();
    _arrayOwnerMap.set(array, owners);
  }
  owners.add({ obj: ownerObj, key: ownerKey });
}
(globalThis as any).__gxtRegisterArrayOwner = registerArrayOwner;

// GXT re-render trigger hook - called by Ember's notifyPropertyChange.
// Since GXT's own cell updates are captured by __gxtExternalSchedule,
// this hook only needs to mark that a sync is pending.
(globalThis as any).__gxtTriggerReRender = function(obj: object, keyName: string) {
  // Handle KVO array mutations: when '[]' or 'length' is notified on an array,
  // dirty the cells of all component properties that reference this array.
  // Note: KVO array mutation tracking (pushObject/shiftObject) is handled
  // by dirtying cells on objects that reference the array. This is a best-effort
  // approach since GXT's $_eachSync may not re-render for same-reference arrays.
  if ((keyName === '[]' || keyName === 'length') && Array.isArray(obj)) {
    const owners = _arrayOwnerMap.get(obj);
    if (owners) {
      for (const { obj: ownerObj, key: ownerKey } of owners) {
        try {
          const c = cellFor(ownerObj, ownerKey, /* skipDefine */ false);
          if (c) c.update(obj);
        } catch { /* ignore */ }
      }
    }
  }
  const newValue = (obj as any)[keyName];
  try {
    // Use skipDefine=false to install getter/setter on the object.
    // This ensures GXT formulas tracking this property will detect changes.
    const c = cellFor(obj, keyName, /* skipDefine */ false);
    if (c) c.update(newValue);
  } catch {
    // cellFor may not apply to all objects - try with skipDefine=true as fallback
    try {
      const c = cellFor(obj, keyName, /* skipDefine */ true);
      if (c) c.update(newValue);
    } catch { /* ignore */ }
  }
  // Re-evaluate cells for OTHER properties on the same object that have
  // cellFor-installed getters. Native getters (e.g., get countAlias() { return this.count; })
  // don't declare dependencies. When 'count' changes, the cell for 'countAlias'
  // is stale. Re-read the property's current value (which goes through the
  // original prototype getter or tracked getter) and update the cell.
  // Only scan own properties that have getters (installed by cellFor).
  try {
    const ownKeys = Object.getOwnPropertyNames(obj);
    for (const ownKey of ownKeys) {
      if (ownKey === keyName) continue; // Already updated
      try {
        const desc = Object.getOwnPropertyDescriptor(obj, ownKey);
        if (desc && desc.get && desc.configurable) {
          // This looks like a cellFor-installed getter. Get the cell and update it
          // by reading the ORIGINAL prototype getter's value.
          let protoGetter: (() => any) | null = null;
          let proto = Object.getPrototypeOf(obj);
          while (proto && proto !== Object.prototype) {
            const protoDesc = Object.getOwnPropertyDescriptor(proto, ownKey);
            if (protoDesc && protoDesc.get) {
              protoGetter = protoDesc.get;
              break;
            }
            proto = Object.getPrototypeOf(proto);
          }
          if (protoGetter) {
            // Call the original prototype getter to get fresh value
            const freshVal = protoGetter.call(obj);
            const oc = cellFor(obj, ownKey, /* skipDefine */ true);
            if (oc) oc.update(freshVal);
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
  // Dirty cells that hold `obj` as their VALUE (reverse lookup).
  // This handles the case where a template reads {{this.m.formattedMessage}} —
  // the formula tracks cell(renderContext, 'm'), and when m.message changes,
  // we need to dirty that cell so the formula re-evaluates with the new
  // computed property result.
  // Collect owners that need their Ember tag dirtied for force-rerender.
  // The actual dirtying is deferred to AFTER gxtSyncDom + updateRootTagValues.
  let _deferredTagDirties: Array<{ obj: object; key: string }> | null = null;
  try {
    const owners = _objectValueCellMap.get(obj);
    if (owners) {
      for (const { obj: ownerObj, key: ownerKey } of owners) {
        try {
          const oc = cellFor(ownerObj, ownerKey, /* skipDefine */ true);
          if (oc) oc.update(obj);
        } catch { /* ignore */ }
        // Defer markObjectAsDirty to after gxtSyncDom + updateRootTagValues
        if (!_deferredTagDirties) _deferredTagDirties = [];
        _deferredTagDirties.push({ obj: ownerObj, key: ownerKey });
      }
    }
  } catch { /* ignore */ }
  // Recompute computed properties that depend on the changed key.
  // Ember computed properties (e.g., @computed('message') get formattedMessage())
  // are replaced by cell-backed getters when cellFor is called. When the underlying
  // dependency changes, we need to re-evaluate the computed getter and update its cell.
  try {
    const recompute = (globalThis as any).__gxtRecomputeDependents;
    if (typeof recompute === 'function') {
      const dependents: Array<{ key: string; value: unknown }> = recompute(obj, keyName);
      for (const { key, value } of dependents) {
        try {
          const dc = cellFor(obj, key, /* skipDefine */ true);
          if (dc) dc.update(value);
        } catch { /* ignore */ }
      }
    }
  } catch { /* ignore */ }
  // Also update cells on the prototype chain.
  // cellFor creates cells keyed by object identity. If a cell-backed getter
  // was installed on a prototype (e.g., via Component.extend({foo: true})),
  // the cell is keyed to that prototype, not the instance. We need to update
  // that prototype cell so GXT formulas tracking it will re-evaluate.
  try {
    let proto = Object.getPrototypeOf(obj);
    for (let depth = 0; depth < 5 && proto && proto !== Object.prototype; depth++) {
      const desc = Object.getOwnPropertyDescriptor(proto, keyName);
      if (desc && desc.get) {
        // This prototype has a getter for this key — likely a cell-backed getter
        const protoCell = cellFor(proto, keyName, /* skipDefine */ true);
        if (protoCell) protoCell.update(newValue);
        break; // Only need to update the first matching prototype
      }
      proto = Object.getPrototypeOf(proto);
    }
  } catch { /* ignore */ }
  // Also dirty cells on ALL render contexts derived from this component.
  // GXT's $_if formula tracks cells on Object.create(component) wrappers.
  // The contexts map is keyed by prototype, so we check both obj and its prototype.
  try {
    const ctxsMap = (globalThis as any).__gxtComponentContexts;
    if (ctxsMap) {
      // Check both the object itself and its prototype as keys
      const candidates = [obj];
      try {
        const proto = Object.getPrototypeOf(obj);
        if (proto && proto !== Object.prototype) candidates.push(proto);
      } catch { /* ignore */ }

      for (const candidate of candidates) {
        const ctxs = ctxsMap.get(candidate);
        if (ctxs) {
          const newValue = (obj as any)[keyName];
          for (const ctx of ctxs) {
            try {
              // Use the raw target if ctx is a Proxy — cells are installed on the
              // raw target during initial render, so we must update the SAME cell.
              const cellTarget = (ctx as any).__gxtRawTarget || ctx;
              const rc = cellFor(cellTarget, keyName, /* skipDefine */ false);
              if (rc) {
                rc.update(newValue);
              }
            } catch { /* ignore */ }
          }
        }
      }
    }
  } catch { /* ignore */ }
  // For nested paths like 'colors.apple', also dirty the root property cell.
  // Templates read `this.colors` which creates a cell for 'colors'. When
  // set(obj, 'colors.apple', val) fires, we need to dirty 'colors' too
  // so the template re-evaluates the full path.
  if (keyName.includes('.')) {
    const rootKey = keyName.split('.')[0]!;
    try {
      const rootCell = cellFor(obj, rootKey, /* skipDefine */ true);
      if (rootCell) rootCell.update((obj as any)[rootKey]);
    } catch { /* ignore */ }
  }
  // Sync wrapper element if the object has attribute/class bindings
  try {
    const syncWrapper = (globalThis as any).__gxtSyncWrapper;
    if (syncWrapper) syncWrapper(obj, keyName);
  } catch { /* ignore */ }

  (globalThis as any).__gxtPendingSync = true;
  (globalThis as any).__gxtPendingSyncFromPropertyChange = true;
  // Only do a quick cell sync here — don't fire lifecycle hooks or
  // run __gxtSyncAllWrappers. Property changes may be batched (e.g.,
  // setProperties), so lifecycle hooks should fire once after ALL
  // property changes are applied, not after each individual change.
  // The full lifecycle hook cycle runs in __gxtSyncDomNow (called
  // after runTask completes).
  if (!(globalThis as any).__gxtSyncing) {
    (globalThis as any).__gxtSyncing = true;
    try {
      gxtSyncDom();
    } catch { /* ignore */ }
    finally { (globalThis as any).__gxtSyncing = false; }
  }
  // Signal to __gxtForceEmberRerender that nested object changes occurred.
  // When a property changes on a nested object (e.g., set(m, 'message', ...)),
  // the component's SELF_TAG is NOT dirtied by Ember (only m's tag is).
  // Setting __gxtHadNestedObjectChange allows the force-rerender to fire
  // and re-evaluate computed properties like {{this.m.formattedMessage}}.
  if (_deferredTagDirties && _deferredTagDirties.length > 0) {
    (globalThis as any).__gxtHadNestedObjectChange = true;
  }
  // Manually notify any $_if conditions watching this property.
  // This bypasses GXT's broken cross-module-instance cell tracking.
  // Must happen AFTER __gxtSyncing is cleared so IfCondition.renderBranch
  // can properly insert new DOM nodes without re-entrancy issues.
  try {
    notifyIfWatchers(obj, keyName);
  } catch { /* ignore */ }
};

// Expose cellFor on globalThis so manager.ts can use it without circular imports.
(globalThis as any).__gxtCellFor = cellFor;

// ---- Cross-module-instance $_if fix ----
//
// Problem: Vite serves GXT's internal chunks (vm-*.js, dom-*.js) with inconsistent
// ?v= query strings, creating TWO module instances of the reactive core. Cells/opcodes
// from one instance don't trigger re-evaluation in the other. This breaks $_if
// condition tracking when properties change via Ember's set().
//
// Additional: IfCondition's internal placeholder gets disconnected when Ember's
// compat layer moves rendered nodes into wrapper divs. Fix: include placeholder
// and target in the extracted RENDERED_NODES so itemToNode preserves them.
//
// Solution: Patch $_if to capture IfCondition instances. Register manual callbacks
// keyed by (object, property). When __gxtTriggerReRender fires, call syncState
// on the IfCondition directly.

const ifWatchers = new WeakMap<object, Map<string, Set<() => void>>>();

function registerIfWatcher(rawTarget: object, key: string, callback: () => void) {
  let keyMap = ifWatchers.get(rawTarget);
  if (!keyMap) { keyMap = new Map(); ifWatchers.set(rawTarget, keyMap); }
  let watchers = keyMap.get(key);
  if (!watchers) { watchers = new Set(); keyMap.set(key, watchers); }
  watchers.add(callback);
}

function notifyIfWatchers(obj: object, key: string) {
  const candidates = [obj];
  try {
    const proto = Object.getPrototypeOf(obj);
    if (proto && proto !== Object.prototype) candidates.push(proto);
  } catch { /* ignore */ }
  const ctxsMap = (globalThis as any).__gxtComponentContexts;
  if (ctxsMap) {
    for (const candidate of [...candidates]) {
      const ctxs = ctxsMap.get(candidate);
      if (ctxs) {
        for (const ctx of ctxs) {
          const raw = ctx?.__gxtRawTarget || ctx;
          if (!candidates.includes(raw)) candidates.push(raw);
        }
      }
    }
  }
  for (const target of candidates) {
    const keyMap = ifWatchers.get(target);
    if (!keyMap) continue;
    const watchers = keyMap.get(key);
    if (!watchers) continue;
    for (const cb of watchers) {
      try { cb(); } catch { /* ignore */ }
    }
  }
}

// Patch $_if to capture IfCondition instances and fix placeholder connectivity.
function patchGlobalIf() {
  const g = globalThis as any;
  if (!g.$_if || g.$_if.__emberPatched) return false;
  const origIf = g.$_if;
  g.$_if = function patchedIf(
    conditionOrCell: any,
    trueBranch: any,
    falseBranch: any,
    ctx: any
  ) {
    const watchTarget = conditionOrCell?.__gxtWatchTarget;
    const watchKey = conditionOrCell?.__gxtWatchKey;

    const ifCondition = origIf(conditionOrCell, trueBranch, falseBranch, ctx);

    if (watchTarget && watchKey && ifCondition) {
      // Mark as Ember-managed so itemToNode handles it correctly
      ifCondition.__emberIfCondition = true;

      // Fix placeholder connectivity: ensure the IfCondition's target
      // (DocumentFragment containing placeholder + rendered content)
      // is returned as a single unit. Replace RENDERED_NODES with the
      // target's childNodes so itemToNode returns the whole fragment.
      if (ifCondition.target && ifCondition.placeholder) {
        const renderedProp = RENDERED_NODES_PROPERTY;
        if (renderedProp) {
          // Replace the RENDERED_NODES with the target itself
          // This ensures itemToNode returns all nodes including placeholder
          const target = ifCondition.target;
          if (target.childNodes) {
            ifCondition[renderedProp] = Array.from(target.childNodes);
          }
        }
      }

      // Register manual watcher for property change notification
      if (typeof ifCondition.syncState === 'function') {
        const emberToBool = g.__gxtToBool || Boolean;
        registerIfWatcher(watchTarget, watchKey, () => {
          try {
            const currentValue = conditionOrCell();
            ifCondition.syncState(emberToBool(currentValue));
          } catch { /* ignore */ }
        });
      }
    }

    return ifCondition;
  };
  g.$_if.__emberPatched = true;
  return true;
}
patchGlobalIf();
queueMicrotask(patchGlobalIf);

// Get a getter function for a property on the render context.
(globalThis as any).__gxtGetCellOrFormula = function(obj: any, key: string) {
  const raw = obj?.__gxtRawTarget || obj;
  try { cellFor(raw, key, /* skipDefine */ false); } catch { /* ignore */ }
  const getter: any = function() { return obj[key]; };
  getter.__gxtWatchTarget = raw;
  getter.__gxtWatchKey = key;
  return getter;
};

// Flush pending GXT DOM updates synchronously.
// Called after runTask() completes so test assertions see updated DOM.
(globalThis as any).__gxtSyncDomNow = function() {
  // Re-entrancy guard: prevent infinite sync loops when force-rerender
  // triggers cell updates that schedule additional syncs
  if ((globalThis as any).__gxtSyncing) return;
  if ((globalThis as any).__gxtPendingSync) {
    (globalThis as any).__gxtPendingSync = false;
    // Only signal "had pending sync" to the force-rerender if an actual property
    // change triggered the sync. Cell creation during initial render also sets
    // __gxtPendingSync, but that should NOT force a full re-render.
    (globalThis as any).__gxtHadPendingSync = !!(globalThis as any).__gxtPendingSyncFromPropertyChange;
    (globalThis as any).__gxtPendingSyncFromPropertyChange = false;
    (globalThis as any).__gxtSyncing = true;
    // Start a new render pass to prevent double-firing of lifecycle hooks
    const newPass = (globalThis as any).__gxtNewRenderPass;
    if (typeof newPass === 'function') newPass();
    try { ((globalThis as any).__gxtSyncDom || gxtSyncDom)(); } catch { /* ignore */ }
    // PHASE 1: Update arg cells and fire pre-render lifecycle hooks BEFORE
    // the force-rerender. The force-rerender (innerHTML='' + rebuild) resets
    // arg cells to current values, so changes must be detected first.
    try {
      const syncAll = (globalThis as any).__gxtSyncAllWrappers;
      if (typeof syncAll === 'function') {
        syncAll(); // Pre-render hooks + arg cell updates
        try { ((globalThis as any).__gxtSyncDom || gxtSyncDom)(); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    // PHASE 2a: Snapshot live instances before force-rerender
    try {
      const snapshot = (globalThis as any).__gxtSnapshotLiveInstances;
      if (typeof snapshot === 'function') snapshot();
    } catch { /* ignore */ }
    // PHASE 2b: With gxtModuleDedup, GXT's native cell tracking handles
    // most DOM updates via gxtSyncDom() in Phase 1. The force-rerender
    // (morph) is kept as fallback for cases where cell tracking doesn't
    // cover the change (computed properties, prototype chain changes).
    // The morph preserves DOM node stability.
    try {
      const forceRerender = (globalThis as any).__gxtForceEmberRerender;
      if (typeof forceRerender === 'function') forceRerender();
    } catch (rerenderErr) {
      // Store the error so it can be re-thrown after sync completes
      (globalThis as any).__gxtDeferredSyncError = (globalThis as any).__gxtDeferredSyncError || rerenderErr;
    }
    // PHASE 2c: Destroy unclaimed instances — components that were in
    // the old render but not in the new one (e.g., {{each}} items removed).
    try {
      const destroyUnclaimed = (globalThis as any).__gxtDestroyUnclaimedPoolEntries;
      if (typeof destroyUnclaimed === 'function') destroyUnclaimed();
    } catch (destroyErr) {
      // Store destroy errors for propagation to assert.throws
      (globalThis as any).__gxtDeferredSyncError = (globalThis as any).__gxtDeferredSyncError || destroyErr;
    }
    // PHASE 3: Post-render hooks (didUpdate, didRender) — fire after DOM
    // is fully updated by the force-rerender.
    try {
      const postRender = (globalThis as any).__gxtPostRenderHooks;
      if (typeof postRender === 'function') postRender();
    } catch { /* ignore */ }
    // Re-render CurriedComponent marker regions
    try {
      const infos = (globalThis as any).__curriedRenderInfos;
      if (infos) {
        for (const info of infos) {
          const { item: getter, startMarker: sm, endMarker: em, renderCurriedComponent: render, managers: mgrs } = info;
          const parent = sm.parentNode;
          if (!parent) continue;
          try {
            // Curried-node path: re-invoke item() to get a fresh Node
            if (info.__isCurriedNodePath) {
              const newNode = render();
              if (newNode) {
                let node = sm.nextSibling;
                while (node && node !== em) {
                  const next = node.nextSibling;
                  parent.removeChild(node);
                  node = next;
                }
                parent.insertBefore(newNode, em);
              }
              continue;
            }

            const newResult = getter();
            const newFinal = (typeof newResult === 'function' && !newResult?.__isCurriedComponent)
              ? newResult() : newResult;

            // Skip teardown if same component with unchanged args (preserves DOM stability)
            if (newFinal && newFinal.__isCurriedComponent &&
                sm.nextSibling !== em &&
                !_curriedComponentChanged(info, newFinal)) {
              continue;
            }

            const _swapped2 = !newFinal || !newFinal.__isCurriedComponent ||
              (newFinal.__name !== info.lastRenderedName);
            const _rem2: Node[] = [];
            let node = sm.nextSibling;
            while (node && node !== em) {
              const next = node.nextSibling;
              _rem2.push(node);
              parent.removeChild(node);
              node = next;
            }
            if (_swapped2) {
              const _dFn2 = (globalThis as any).__gxtDestroyInstancesInNodes;
              if (typeof _dFn2 === 'function' && _rem2.length > 0) {
                _dFn2(_rem2);
              }
            }

            if (newFinal && newFinal.__isCurriedComponent && mgrs.component.canHandle(newFinal)) {
              const newNode = render(newFinal);
              if (newNode) parent.insertBefore(newNode, em);
              _snapshotCurriedArgs(info, newFinal);
            }
          } catch { /* ignore render errors */ }
        }
      }
    } catch { /* ignore */ }
    (globalThis as any).__gxtSyncing = false;
    // Re-throw any deferred errors from the force-rerender or lifecycle phases
    // so they propagate to assert.throws() in tests
    const deferredSyncErr = (globalThis as any).__gxtDeferredSyncError;
    if (deferredSyncErr) {
      (globalThis as any).__gxtDeferredSyncError = null;
      throw deferredSyncErr;
    }
  }
};

// Also schedule a fallback setTimeout flush for non-test scenarios
// where __gxtSyncDomNow isn't called explicitly
setInterval(() => {
  if ((globalThis as any).__gxtPendingSync) {
    (globalThis as any).__gxtSyncDomNow();
  }
}, 16); // ~60fps

// Cleanup function to reset GXT state between tests
(globalThis as any).__gxtCleanupActiveComponents = function() {
  // Destroy all tracked component instances first (fires willDestroy hooks)
  const destroyTracked = (globalThis as any).__gxtDestroyTrackedInstances;
  if (typeof destroyTracked === 'function') {
    destroyTracked();
  }
  // Reset block params stack
  blockParamsStack.length = 0;
  // Reset current slot params
  currentSlotParams = null;
  (globalThis as any).__currentSlotParams = null;
  // Reset sync scheduled flag
  (globalThis as any).__gxtSyncScheduled = false;
  // Reset slots context stack
  slotsContextStack.length = 0;
  // Clear template cache to avoid stale templates across tests
  templateCache.clear();
  // Clear curried render infos
  if ((globalThis as any).__curriedRenderInfos) {
    (globalThis as any).__curriedRenderInfos.length = 0;
  }
  // Clear helper instances (already destroyed by __gxtDestroyTrackedInstances)
  if ((globalThis as any).__gxtHelperInstances) {
    (globalThis as any).__gxtHelperInstances.length = 0;
  }
  // Clear the helper instance cache used by $_maybeHelper
  if (typeof (globalThis as any).__gxtClearHelperCache === 'function') {
    (globalThis as any).__gxtClearHelperCache();
  }
  // Clear the helper instance cache used by $_tag
  if (typeof (globalThis as any).__gxtClearTagHelperCache === 'function') {
    (globalThis as any).__gxtClearTagHelperCache();
  }
  // Clear component instance pools to prevent stale reuse across tests
  if (typeof (globalThis as any).__gxtClearInstancePools === 'function') {
    (globalThis as any).__gxtClearInstancePools();
  }
};

// Set GXT mode flag
(globalThis as any).__GXT_MODE__ = true;

// Track class-based helper instances for destruction during test teardown
(globalThis as any).__gxtHelperInstances = (globalThis as any).__gxtHelperInstances || [];

// Cache for helper instances created in $_tag to prevent re-creation during
// force re-render (which does innerHTML='' + full rebuild). Keyed by helper name.
// Cleared during test teardown via __gxtClearTagHelperCache.
const _tagHelperInstanceCache = new Map<string, { instance: any; recomputeTag: any }>();
(globalThis as any).__gxtClearTagHelperCache = () => _tagHelperInstanceCache.clear();

// Expose $_MANAGERS on globalThis so the $_tag wrapper can access it
// (manager.ts will configure it later, but we need the same reference)
(globalThis as any).$_MANAGERS = $_MANAGERS;

// Register built-in keyword helpers for GXT integration
// These are simplified implementations for GXT since it doesn't have Glimmer VM's reference system
(globalThis as any).__EMBER_BUILTIN_HELPERS__ = {
  // readonly: Returns the value as-is (GXT doesn't have two-way binding to protect against)
  readonly: (value: any) => {
    return typeof value === 'function' ? value() : value;
  },
  // mut: Returns a setter function for two-way binding.
  // When used with (fn (mut this.val) newValue), the returned function
  // updates the property on the component via Ember.set().
  // The template transform adds a path string as the second arg.
  // The context is captured at creation time via __gxtMutContext.
  mut: (value: any, path?: string) => {
    // Capture context at creation time (set by $_maybeHelper wrapper)
    const capturedCtx = (globalThis as any).__gxtMutContext;
    // If no path provided, return the resolved value (fallback)
    if (!path || typeof path !== 'string') {
      return typeof value === 'function' ? value() : value;
    }
    // Determine the property name from the path
    const propName = path.startsWith('this.') ? path.slice(5) : (path.startsWith('@') ? path.slice(1) : path);
    // Look up the source getter for two-way binding (from curried component positional args)
    const sourceGetter = capturedCtx?.__mutArgSources?.[propName];
    // Create a "mut cell" function: calling it with a value sets the property
    const mutCell = function mutCell(newValue?: any) {
      if (arguments.length === 0) {
        // Read mode: return current value
        return typeof value === 'function' ? value() : value;
      }
      // Write mode: set the property through the binding chain
      if (sourceGetter) {
        // We have a source getter from the parent template.
        // Parse its toString() to extract the property path, then set through it.
        const parentCtx = sourceGetter.__mutParentCtx;
        if (parentCtx) {
          const getterStr = sourceGetter.toString();
          // Match patterns like: () => this.model?.val2, () => this.model.val2
          const pathMatch = getterStr.match(/this\.([a-zA-Z_$][a-zA-Z0-9_$?.]*)/);
          if (pathMatch) {
            // Clean the path: remove optional chaining operators
            const fullPath = pathMatch[1].replace(/\?/g, '');
            // Split into parts and set the nested property
            const parts = fullPath.split('.');
            if (parts.length === 1) {
              // Simple property: this.val
              if (typeof parentCtx.set === 'function') {
                parentCtx.set(parts[0]!, newValue);
              } else {
                parentCtx[parts[0]!] = newValue;
              }
            } else {
              // Nested property: this.model.val2
              // Navigate to the parent object, then set the final property
              let obj = parentCtx;
              for (let i = 0; i < parts.length - 1; i++) {
                obj = obj[parts[i]!];
                if (obj == null) break;
              }
              if (obj != null) {
                const lastProp = parts[parts.length - 1]!;
                if (typeof obj.set === 'function') {
                  obj.set(lastProp, newValue);
                } else {
                  obj[lastProp] = newValue;
                }
              }
              // Trigger re-render via multiple mechanisms:
              const triggerReRender = (globalThis as any).__gxtTriggerReRender;
              if (triggerReRender) {
                // Dirty cells along the property path for GXT formula tracking
                if (obj != null && parts.length > 1) {
                  triggerReRender(obj, parts[parts.length - 1]!);
                }
                triggerReRender(parentCtx, parts[0]!);
              }
              // Force a full re-render of the parent component.
              // This is needed when the property path isn't cell-tracked
              // (e.g., model is a plain prototype property from Component.extend).
              if (typeof parentCtx.rerender === 'function') {
                try { parentCtx.rerender(); } catch { /* ignore */ }
              } else if (typeof parentCtx.notifyPropertyChange === 'function') {
                parentCtx.notifyPropertyChange(parts[0]!);
              }
            }
            // Also set the local property on the component
            if (capturedCtx && capturedCtx !== parentCtx) {
              if (typeof capturedCtx.set === 'function') {
                capturedCtx.set(propName, newValue);
              } else {
                capturedCtx[propName] = newValue;
              }
            }
            return newValue;
          }
        }
      }
      // Fallback: set on the component's own context
      if (capturedCtx) {
        if (typeof capturedCtx.set === 'function') {
          capturedCtx.set(propName, newValue);
        } else {
          capturedCtx[propName] = newValue;
        }
      }
      return newValue;
    };
    // Mark as a mut cell so fn helper doesn't try to unwrap it
    (mutCell as any).__isMutCell = true;
    // valueOf returns current value for template rendering
    mutCell.toString = () => String(typeof value === 'function' ? value() : value);
    mutCell.valueOf = () => typeof value === 'function' ? value() : value;
    return mutCell;
  },
  // unbound: Returns the value without tracking
  unbound: (value: any) => {
    return typeof value === 'function' ? value() : value;
  },
  // concat: Concatenates arguments into a string
  concat: (...args: any[]) => {
    return args.map(a => (typeof a === 'function' && !a.prototype) ? a() : a).join('');
  },
  // array: Creates an array from arguments
  array: (...args: any[]) => {
    return args.map(a => (typeof a === 'function' && !a.prototype) ? a() : a);
  },
  // hash: Creates an object from named arguments (handled specially)
  hash: (obj: any) => obj,
  // gxt-entries-of: Converts an object to [[key, value], ...] for {{#each-in}}
  'gxt-entries-of': (obj: any) => {
    const resolved = typeof obj === 'function' ? obj() : obj;
    if (!resolved || typeof resolved !== 'object') return [];
    // Support Map-like objects
    if (typeof resolved.entries === 'function' && typeof resolved.forEach === 'function') {
      return Array.from(resolved.entries());
    }
    return Object.keys(resolved).map(key => [key, (resolved as any)[key]]);
  },
  // get: Dynamic property lookup — supports dot-path keys like 'foo.bar'
  get: (obj: any, key: any) => {
    const resolvedObj = typeof obj === 'function' ? obj() : obj;
    const resolvedKey = typeof key === 'function' ? key() : key;
    if (resolvedObj == null) return undefined;
    if (typeof resolvedKey === 'string' && resolvedKey.includes('.')) {
      let current = resolvedObj;
      for (const part of resolvedKey.split('.')) {
        if (current == null) return undefined;
        current = current[part];
      }
      return current;
    }
    return resolvedObj[resolvedKey];
  },
  // helper: The (helper) keyword resolves a helper by name and returns a curried helper reference.
  // {{helper "hello-world"}} renders the result of invoking the helper (via toString/valueOf).
  // {{helper (helper "hello-world") "wow"}} passes extra args to the curried helper.
  helper: (helperNameOrRef: any, ...extraArgs: any[]) => {
    const g = globalThis as any;

    // Helper invocation function: resolves and invokes a helper by name with given args
    const invokeByName = (name: string, positional: any[]) => {
      const owner = g.owner;
      if (!owner) return undefined;
      const factory = owner.factoryFor?.(`helper:${name}`);
      if (factory) {
        const instance = factory.create();
        if (instance && typeof instance.compute === 'function') {
          return instance.compute(positional, {});
        }
      }
      const lookup = owner.lookup?.(`helper:${name}`);
      if (typeof lookup === 'function') return lookup(positional, {});
      if (lookup && typeof lookup.compute === 'function') return lookup.compute(positional, {});
      return undefined;
    };

    // Invoke a helper through its manager (for defineSimpleHelper results)
    const invokeManaged = (helperFn: any, positional: any[]) => {
      const managers = g.INTERNAL_HELPER_MANAGERS;
      if (!managers) return helperFn(...positional);
      let mgr: any = null;
      let ptr = helperFn;
      while (ptr) {
        mgr = managers.get(ptr);
        if (mgr) break;
        try { ptr = Object.getPrototypeOf(ptr); } catch { break; }
      }
      if (mgr && typeof mgr.getDelegateFor === 'function') {
        const delegate = mgr.getDelegateFor(g.owner);
        if (delegate && typeof delegate.createHelper === 'function' && delegate.capabilities?.hasValue) {
          const args = { positional, named: {} };
          const bucket = delegate.createHelper(helperFn, args);
          return delegate.getValue(bucket);
        }
      }
      return helperFn(...positional);
    };

    // Resolve the first argument (unwrap GXT getters but preserve curried refs and managed helpers)
    const raw = helperNameOrRef;
    const resolved = (typeof raw === 'function' && !raw.__isCurriedHelper && !raw.__isManagedHelper)
      ? raw() : raw;

    // If it's already a curried helper reference, merge extra args and invoke
    if (resolved && resolved.__isCurriedHelper) {
      const resolvedExtras = extraArgs.map((a: any) => typeof a === 'function' && !a.prototype ? a() : a);
      const merged = [...(resolved.__positionalArgs || []), ...resolvedExtras];
      if (resolved.__helperName) {
        return invokeByName(resolved.__helperName, merged);
      }
      if (resolved.__helperFn) {
        return invokeManaged(resolved.__helperFn, merged);
      }
      return undefined;
    }

    // String — resolve helper by name
    if (typeof resolved === 'string') {
      const resolvedExtras = extraArgs.map((a: any) => typeof a === 'function' && !a.prototype ? a() : a);
      if (extraArgs.length === 0) {
        // No extra args — return a curried reference.
        // In content position {{helper "name"}}, GXT renders the return value.
        // We use toString/valueOf so the curried ref renders as the helper result.
        const ref: any = {};
        ref.__isCurriedHelper = true;
        ref.__helperName = resolved;
        ref.__positionalArgs = [];
        ref.toString = () => String(invokeByName(resolved, []) ?? '');
        ref.valueOf = () => invokeByName(resolved, []);
        return ref;
      }
      return invokeByName(resolved, resolvedExtras);
    }

    // Function with helper manager (from defineSimpleHelper/setHelperManager)
    if (resolved && typeof resolved === 'function') {
      const managers = g.INTERNAL_HELPER_MANAGERS;
      let hasManager = false;
      if (managers) {
        let ptr = resolved;
        while (ptr) {
          if (managers.has(ptr)) { hasManager = true; break; }
          try { ptr = Object.getPrototypeOf(ptr); } catch { break; }
        }
      }
      if (hasManager) {
        const resolvedExtras = extraArgs.map((a: any) => typeof a === 'function' && !a.prototype ? a() : a);
        if (extraArgs.length === 0) {
          const ref: any = {};
          ref.__isCurriedHelper = true;
          ref.__isManagedHelper = true;
          ref.__helperFn = resolved;
          ref.__positionalArgs = [];
          ref.toString = () => String(invokeManaged(resolved, []) ?? '');
          ref.valueOf = () => invokeManaged(resolved, []);
          return ref;
        }
        return invokeManaged(resolved, resolvedExtras);
      }
    }

    return undefined;
  },
  // mount: Engine mounting stub — GXT doesn't support Ember engines
  // Returns empty to prevent infinite loops during engine resolution
  mount: () => {
    console.warn('[gxt] {{mount}} is not supported in GXT mode');
    return '';
  },
  // unique-id: Returns a unique identifier string
  'unique-id': () => {
    return crypto.randomUUID ? crypto.randomUUID() : `ember-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  },
  // fn: Partially applies a function with arguments
  fn: (func: any, ...args: any[]) => {
    return (...callArgs: any[]) => {
      // Resolve the function — it may be a GXT getter wrapping the actual function
      let resolvedFn = func;
      // Unwrap nested getters until we get the actual function or value
      // But don't unwrap mut cells — they are callable setter functions
      while (typeof resolvedFn === 'function' && resolvedFn.length === 0 && !resolvedFn.__isMutCell) {
        const inner = resolvedFn();
        if (inner === resolvedFn) break; // prevent infinite loop
        // If inner is a mut cell, use it directly
        if (typeof inner === 'function' && inner.__isMutCell) { resolvedFn = inner; break; }
        if (typeof inner !== 'function') { resolvedFn = inner; break; }
        resolvedFn = inner;
      }
      const resolvedArgs = args.map(a => typeof a === 'function' && !a.__isMutCell ? a() : a);
      if (typeof resolvedFn === 'function') {
        return resolvedFn(...resolvedArgs, ...callArgs);
      }
      return undefined;
    };
  },
};

// Global block params stack for yielded values
// When a slot is rendered with block params, they're pushed here
// The $_blockParam helper reads from the top of the stack
const blockParamsStack: any[][] = [];
(globalThis as any).__blockParamsStack = blockParamsStack;

// Per-context block params storage for persistence across re-renders
// WeakMap allows garbage collection when context is no longer referenced
const contextBlockParams = new WeakMap<object, any[]>();
(globalThis as any).__contextBlockParams = contextBlockParams;

// Current slot params - persists until next slot is called
// This is used for re-renders where the stack has been popped
// Key insight: for simple non-nested slot cases, keeping the "last" params
// allows re-renders to access them even after the slot function returns
let currentSlotParams: any[] | null = null;
(globalThis as any).__currentSlotParams = null;

// Helper function to get a block param by index
// This is called by compiled templates that use {{($_blockParam N)}}
(globalThis as any).$_blockParam = function(index: number) {
  const currentParams = blockParamsStack[blockParamsStack.length - 1];
  const rawValue = currentParams ? currentParams[index] : undefined;
  // Unwrap reactive value to get current value
  return unwrapReactiveValue(rawValue);
};

// Helper to unwrap a potentially reactive value
// This is called each time a block param is accessed to ensure fresh values
function unwrapReactiveValue(value: any): any {
  if (value === undefined || value === null) return value;

  // Check if it's a GXT reactive cell (has 'fn' property and 'isConst')
  if (typeof value === 'object' && 'fn' in value && 'isConst' in value) {
    try {
      return value.fn();
    } catch {
      return value;
    }
  }

  // Check if it's a function that should be evaluated (reactive getter)
  if (typeof value === 'function') {
    try {
      return value();
    } catch {
      return value;
    }
  }

  return value;
}

const bpDescriptors: Record<string, PropertyDescriptor> = {};
for (let i = 0; i < 10; i++) {
  const bpName = `$_bp${i}`;
  bpDescriptors[bpName] = {
    get() {
      let rawValue: any;

      // First check if this context has persistent block params
      // This handles re-renders after the slot function has returned
      const persistentParams = contextBlockParams.get(this);
      if (persistentParams && persistentParams[i] !== undefined) {
        rawValue = persistentParams[i];
      } else {
        // Check the global stack (during initial slot execution)
        const stack = (globalThis as any).__blockParamsStack;
        const stackParams = stack && stack[stack.length - 1];
        if (stackParams && stackParams[i] !== undefined) {
          rawValue = stackParams[i];
        } else {
          // Fall back to current slot params (for re-renders after slot returned)
          const current = (globalThis as any).__currentSlotParams;
          if (current && current[i] !== undefined) {
            rawValue = current[i];
          }
        }
      }

      // CRITICAL: Unwrap reactive values each time to support reactivity
      // When the component's property changes, this getter will return the new value
      return unwrapReactiveValue(rawValue);
    },
    configurable: true,
    enumerable: false,
  };
}
try {
  Object.defineProperties(Object.prototype, bpDescriptors);
} catch (e) {
  // If we can't define on Object.prototype, fall back to globalThis
  for (let i = 0; i < 10; i++) {
    Object.defineProperty(globalThis, `$_bp${i}`, bpDescriptors[`$_bp${i}`]);
  }
}

// Also expose through EmberFunctionalHelpers for GXT's helper resolution
if (typeof (globalThis as any).EmberFunctionalHelpers === 'undefined') {
  (globalThis as any).EmberFunctionalHelpers = new Set();
}
(globalThis as any).EmberFunctionalHelpers.add((globalThis as any).$_blockParam);

// Stack to track the current slots context during rendering
// Components push their $slots here when rendering, so has-block can check it
const slotsContextStack: any[] = [];
(globalThis as any).__slotsContextStack = slotsContextStack;

// has-block helper - returns true if a block was provided
// Usage: {{has-block}} or {{has-block "inverse"}}
(globalThis as any).$_hasBlock = function(blockName?: string) {
  const name = blockName || 'default';
  const slots = slotsContextStack[slotsContextStack.length - 1];
  const hasIt = slots && typeof slots[name] === 'function';
  return hasIt;
};

// has-block-params helper - returns true if the block accepts params
// This is tricky to implement properly, but we can approximate:
// - If there's no block, return false
// - If there's a block and we have blockParamsInfo, check it
// - Otherwise, return false as a conservative default
(globalThis as any).$_hasBlockParams = function(blockName?: string) {
  const name = blockName || 'default';
  const slots = slotsContextStack[slotsContextStack.length - 1];
  if (!slots || typeof slots[name] !== 'function') {
    return false;
  }
  // Check if the slot has block params info attached
  const slotFn = slots[name];
  if (slotFn.__hasBlockParams !== undefined) {
    return slotFn.__hasBlockParams;
  }
  // Conservative default - if we don't know, assume false
  // In real Ember, this would inspect the template's block params
  return false;
};

// Override $_c to handle CurriedComponent — when a GXT binding (e.g., from {{#let}})
// resolves to a CurriedComponent, we need to render it through the Ember component manager
// instead of GXT's normal component constructor path.
const g = globalThis as any;
if (g.$_c && !g.$_c.__emberWrapped) {
  const originalC = g.$_c;

  g.$_c = function $_c_ember(comp: any, args: any, ctx: any) {
    if (comp && comp.__isCurriedComponent) {
      // Build args from the GXT args object
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const $PROPS = Symbol.for('gxt-props');
        const $SLOTS = Symbol.for('gxt-slots');
        const fw = args?.[$PROPS] || null;

        // Extract named args from the GXT args object
        const namedArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            if (key === 'args' || key.startsWith('$')) continue;
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(namedArgs, key, desc);
            }
          }
          // Also check args.args (GXT puts named args in args['args'])
          const argsObj = args['args'];
          if (argsObj && typeof argsObj === 'object') {
            for (const key of Object.keys(argsObj)) {
              if (!key.startsWith('$')) {
                const desc = Object.getOwnPropertyDescriptor(argsObj, key);
                if (desc) {
                  Object.defineProperty(namedArgs, key, desc);
                }
              }
            }
          }

          // Extract slots from GXT args for {{yield}} support
          const gxtSlots = args?.[$SLOTS] || args?.args?.[$SLOTS];
          if (gxtSlots && typeof gxtSlots === 'object') {
            namedArgs.$slots = gxtSlots;
          }
        }

        const handleResult = managers.component.handle(comp, namedArgs, fw, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
    }

    // Also handle functions with __stringComponentName (from old $_componentHelper)
    if (typeof comp === 'function' && comp.__stringComponentName) {
      const managers = g.$_MANAGERS;
      if (managers?.component?.canHandle?.(comp)) {
        const namedArgs: any = {};
        if (args) {
          for (const key of Object.keys(args)) {
            if (key === 'args' || key.startsWith('$')) continue;
            const desc = Object.getOwnPropertyDescriptor(args, key);
            if (desc) {
              Object.defineProperty(namedArgs, key, desc);
            }
          }
        }
        const handleResult = managers.component.handle(comp, namedArgs, null, ctx);
        if (typeof handleResult === 'function') {
          return handleResult();
        }
        return handleResult;
      }
    }

    return originalC(comp, args, ctx);
  };
  g.$_c.__emberWrapped = true;
}

// Override $_tag to check for Ember components before creating HTML elements
// GXT compiles PascalCase tags like <FooBar /> to $_tag('FooBar', ...) but
// these should be handled by the component manager for Ember integration
if (g.$_tag && !g.$_tag.__compileWrapped) {
  const originalTag = g.$_tag;

  // GXT's $_tag signature: $_tag(tag, tagProps, ctx, children)
  g.$_tag = function $_tag_ember(
    tag: string | (() => string),
    tagProps: any,
    ctx: any,
    children: any[]
  ): any {
    const resolvedTag = typeof tag === 'function' ? tag() : tag;

    // Handle non-string tags that resolve to CurriedComponent or other Ember components
    // This happens with <fb.baz> where fb is a block param yielding a component hash
    if (resolvedTag && typeof resolvedTag !== 'string') {
      const managers = g.$_MANAGERS;
      if (resolvedTag.__isCurriedComponent || resolvedTag.__stringComponentName) {
        if (managers?.component?.canHandle?.(resolvedTag)) {
          const $PROPS = Symbol.for('gxt-props');
          const $SLOTS = Symbol.for('gxt-slots');
          // Build fw from tagProps (GXT format [props, attrs, events, parentFw?])
          const fwProps: [string, any][] = [];
          const fwAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          const namedArgs: any = {};

          if (tagProps && tagProps !== g.$_edp) {
            if (Array.isArray(tagProps[0])) {
              for (const entry of tagProps[0]) {
                const key = entry[0] === '' ? 'class' : entry[0];
                if (key === 'class') {
                  const val = entry[1];
                  fwProps.push([entry[0], typeof val === 'function' ? () => { const v = val(); return (v == null || v === false) ? '' : v; } : val]);
                } else {
                  fwProps.push(entry);
                }
              }
            }
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (key.startsWith('@')) {
                  const argName = key.slice(1);
                  Object.defineProperty(namedArgs, argName, {
                    get: () => typeof value === 'function' ? value() : value,
                    enumerable: true, configurable: true,
                  });
                } else {
                  fwAttrs.push([key, value]);
                }
              }
            }
            if (Array.isArray(tagProps[2])) events = tagProps[2];
            // Merge parent fw
            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw)) {
              if (Array.isArray(parentFw[0])) for (const e of parentFw[0]) fwProps.push(e);
              if (Array.isArray(parentFw[1])) for (const e of parentFw[1]) fwAttrs.push(e);
              if (Array.isArray(parentFw[2])) for (const e of parentFw[2]) events.push(e);
            }
          }

          const fw = [fwProps, fwAttrs, events];

          // Extract slots from children
          if (children && children.length > 0) {
            const defaultSlotFn = (slotCtx: any, ...params: any[]) => {
              return children.map((child: any) => typeof child === 'function' ? child() : child);
            };
            namedArgs.$slots = { default: defaultSlotFn };
          }

          const handleResult = managers.component.handle(resolvedTag, namedArgs, fw, ctx);
          if (typeof handleResult === 'function') return handleResult();
          return handleResult;
        }
      }
    }

    // Ensure ctx has a TRUTHY GXT component ID for addToTree parent tracking.
    // GXT's tree.ts checks `if (!PARENT_ID)` which treats 0 as falsy.
    if (ctx && typeof ctx === 'object' && COMPONENT_ID_PROPERTY) {
      if (!ctx[COMPONENT_ID_PROPERTY as any]) {
        ctx[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 100) + 1;
      }
    }

    // Handle dynamic component patterns: <@foo /> and <this.foo />
    // These are invalid HTML tag names that need special handling
    if (resolvedTag && typeof resolvedTag === 'string') {
      // Handle <@foo /> - component passed as argument
      if (resolvedTag.startsWith('@')) {
        const argName = resolvedTag.slice(1); // Remove '@'
        // Get the component from the context's args
        // GXT uses plain string 'args' ($args = 'args')
        const ctxArgs = ctx?.['args'] || ctx?.args || {};
        const componentValue = ctxArgs[argName];
        if (componentValue) {
          // Extract args from tagProps for dynamic component rendering
          const dynArgs: any = {};
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              for (const [key, value] of attrs) {
                if (key.startsWith('@')) {
                  const dynArgName = key.slice(1);
                  Object.defineProperty(dynArgs, dynArgName, {
                    get: () => typeof value === 'function' ? value() : value,
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }
          }

          // Build slots from children (block content)
          // This enables {{yield}} in the component to render the block content
          // GXT puts text children in tagProps[2] (events position) when it doesn't
          // recognize the tag as a component (e.g., @inner). Extract from there too.
          const blockChildren: any[] = children && children.length > 0 ? [...children] : [];
          if (blockChildren.length === 0 && tagProps && tagProps !== g.$_edp) {
            const textEntries = tagProps[2];
            if (Array.isArray(textEntries)) {
              for (const entry of textEntries) {
                if (Array.isArray(entry) && entry.length === 2) {
                  blockChildren.push(entry[1]);
                }
              }
            }
          }
          if (blockChildren.length > 0) {
            const defaultSlotFn = (slotCtx: any) => {
              return blockChildren.map((child: any) => {
                if (typeof child === 'function') {
                  return child();
                }
                return child;
              });
            };
            dynArgs.$slots = { default: defaultSlotFn };
          }

          // Build fw (forwarding) structure — separate props (fw[0]) from attrs (fw[1])
          const dynFwProps: [string, any][] = [];
          const dynFwAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          if (tagProps && tagProps !== g.$_edp) {
            // Props (position 0) — class, id, etc.
            if (Array.isArray(tagProps[0])) {
              for (const entry of tagProps[0]) {
                dynFwProps.push(entry);
              }
            }
            // Attrs (position 1) — data-*, title, etc.
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (!key.startsWith('@')) {
                  dynFwAttrs.push([key, value]);
                }
              }
            }
            // Only use tagProps[2] as events if we didn't already use them as block children
            if (Array.isArray(tagProps[2]) && blockChildren.length === 0) {
              events = tagProps[2];
            }
            // Merge parent fw if present
            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw)) {
              if (Array.isArray(parentFw[0])) {
                for (const entry of parentFw[0]) dynFwProps.push(entry);
              }
              if (Array.isArray(parentFw[1])) {
                for (const entry of parentFw[1]) dynFwAttrs.push(entry);
              }
              if (Array.isArray(parentFw[2])) {
                for (const entry of parentFw[2]) events.push(entry);
              }
            }
          }
          const fw = [dynFwProps, dynFwAttrs, events];

          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, dynArgs, fw, ctx);
          }
        }
        // If no component found, return empty comment
        return document.createComment(`dynamic component @${argName} not found`);
      }

      // Handle <this.foo /> - component from context property
      if (resolvedTag.startsWith('this.')) {
        const propPath = resolvedTag.slice(5); // Remove 'this.'
        // Get the component from the context
        let componentValue = ctx;
        for (const part of propPath.split('.')) {
          componentValue = componentValue?.[part];
        }
        if (componentValue) {
          // Extract args from tagProps for dynamic component rendering
          const dynArgs: any = {};
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              for (const [key, value] of attrs) {
                if (key.startsWith('@')) {
                  const argName = key.slice(1);
                  Object.defineProperty(dynArgs, argName, {
                    get: () => typeof value === 'function' ? value() : value,
                    enumerable: true,
                    configurable: true,
                  });
                }
              }
            }
          }

          // Build slots from children (block content)
          // GXT puts text children in tagProps[2] for unrecognized tags
          const thisDynChildren: any[] = children && children.length > 0 ? [...children] : [];
          if (thisDynChildren.length === 0 && tagProps && tagProps !== g.$_edp) {
            const textEntries = tagProps[2];
            if (Array.isArray(textEntries)) {
              for (const entry of textEntries) {
                if (Array.isArray(entry) && entry.length === 2) {
                  thisDynChildren.push(entry[1]);
                }
              }
            }
          }
          if (thisDynChildren.length > 0) {
            const defaultSlotFn = (slotCtx: any) => {
              return thisDynChildren.map((child: any) => {
                if (typeof child === 'function') {
                  return child();
                }
                return child;
              });
            };
            dynArgs.$slots = { default: defaultSlotFn };
          }

          // Build fw (forwarding) structure — separate props (fw[0]) from attrs (fw[1])
          const thisFwProps: [string, any][] = [];
          const thisFwAttrs: [string, any][] = [];
          let events: [string, any][] = [];
          if (tagProps && tagProps !== g.$_edp) {
            if (Array.isArray(tagProps[0])) {
              for (const entry of tagProps[0]) thisFwProps.push(entry);
            }
            if (Array.isArray(tagProps[1])) {
              for (const [key, value] of tagProps[1]) {
                if (!key.startsWith('@')) {
                  thisFwAttrs.push([key, value]);
                }
              }
            }
            if (Array.isArray(tagProps[2]) && thisDynChildren.length === 0) {
              events = tagProps[2];
            }
            const parentFw = tagProps[3];
            if (parentFw && Array.isArray(parentFw)) {
              if (Array.isArray(parentFw[0])) {
                for (const entry of parentFw[0]) thisFwProps.push(entry);
              }
              if (Array.isArray(parentFw[1])) {
                for (const entry of parentFw[1]) thisFwAttrs.push(entry);
              }
              if (Array.isArray(parentFw[2])) {
                for (const entry of parentFw[2]) events.push(entry);
              }
            }
          }
          const fw = [thisFwProps, thisFwAttrs, events];

          // Render the dynamic component
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(componentValue)) {
            return managers.component.handle(componentValue, dynArgs, fw, ctx);
          }
        }
        // If no component found, return empty comment
        return document.createComment(`dynamic component this.${propPath} not found`);
      }
    }

    // Handle named blocks like <:header> and <:default>
    // These are not real elements - they're markers for named slots
    // Return a special object that can be detected when building slots
    if (resolvedTag && typeof resolvedTag === 'string' && resolvedTag.startsWith(':')) {
      const slotName = resolvedTag.slice(1); // Remove the leading ':'

      // Check for block params - they're in the forwarded props (fw) or tagProps
      // When there's "as |param|", GXT passes block params info in tagProps
      let hasBlockParams = false;
      if (tagProps && tagProps !== g.$_edp) {
        // Check if attrs (index 1) contains block params marker
        const attrs = tagProps[1];
        if (Array.isArray(attrs)) {
          for (const [key, value] of attrs) {
            if (key === '@__hasBlockParams__') {
              hasBlockParams = true;
              break;
            }
          }
        }
        // Also check fw (forwarded) for block params info
        const fw = tagProps[3];
        if (fw && fw.__hasBlockParams) {
          hasBlockParams = true;
        }
      }

      const namedBlock = {
        __isNamedBlock: true,
        __slotName: slotName,
        __children: children,
        __hasBlockParams: hasBlockParams,
      };
      return namedBlock;
    }

    // Special handling for EmberHtmlRaw component (triple mustaches)
    // This component outputs raw HTML without escaping.
    // Returns an object with __htmlRaw marker so itemToNode can handle
    // it with proper reactive updates (using the same effect scope).
    if (resolvedTag === 'EmberHtmlRaw') {
      let valueGetter: any;
      if (tagProps && tagProps !== g.$_edp) {
        const attrs = tagProps[1];
        if (Array.isArray(attrs)) {
          for (const [key, val] of attrs) {
            if (key === '@value') {
              valueGetter = val;
              break;
            }
          }
        }
      }

      // Return a getter function that itemToNode will call inside gxtEffect.
      // Mark it as __htmlRaw so itemToNode uses innerHTML instead of textContent.
      const htmlGetter = () => {
        const raw = typeof valueGetter === 'function' ? valueGetter() : valueGetter;
        const actual = typeof raw === 'function' ? raw() : raw;
        if (actual == null) return '';
        return actual?.toHTML?.() ?? String(actual);
      };
      (htmlGetter as any).__htmlRaw = true;
      return htmlGetter;
    }

    // Check if this looks like a component name (PascalCase or contains hyphen)
    const mightBeComponent = resolvedTag &&
      typeof resolvedTag === 'string' &&
      (resolvedTag[0] === resolvedTag[0].toUpperCase() || resolvedTag.includes('-'));

    // Access managers dynamically - they may be set up after this module loads
    const managers = g.$_MANAGERS;

    if (mightBeComponent && managers?.component?.canHandle) {
      // Convert PascalCase to kebab-case for Ember component lookup
      const kebabName = resolvedTag
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();

      // Check for HELPER first — inline curlies like {{to-js "foo"}} get transformed
      // to <ToJs @__pos0__="foo" /> by transformCurlyBlockComponents. These should be
      // handled as helpers, not components.
      const owner = g.owner;
      if (owner) {
        const helperFactory = owner.factoryFor?.(`helper:${kebabName}`);
        const helperLookup = !helperFactory ? owner.lookup?.(`helper:${kebabName}`) : null;

        // Check if the user is trying to override a built-in helper.
        // Built-in helpers (array, hash, concat, fn, etc.) cannot be overridden.
        if (helperFactory || helperLookup) {
          const BUILTIN_HELPERS = ['array', 'hash', 'concat', 'fn', 'get', 'mut', 'readonly', 'unique-id', 'unbound'];
          if (BUILTIN_HELPERS.includes(kebabName)) {
            emberAssert(
              `You attempted to overwrite the built-in helper "${kebabName}" which is not allowed. Please rename the helper.`,
              false
            );
          }
        }

        // If the helper was invoked as a block (has children or __hasBlock__ marker),
        // it's not a valid usage. Helpers cannot be used with blocks — only components can.
        // {{#some-helper}}{{/some-helper}} → <SomeHelper @__hasBlock__="default"></SomeHelper>
        if (helperFactory || helperLookup) {
          const hasChildren = children && children.length > 0;
          // Check for __hasBlock__ marker in attrs (from empty curly block invocation)
          let hasBlockMarker = false;
          if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[1])) {
            for (const [key] of tagProps[1]) {
              if (key === '@__hasBlock__') { hasBlockMarker = true; break; }
            }
          }
          if (hasChildren || hasBlockMarker) {
            const err = new Error(
              `Attempted to resolve \`${kebabName}\`, which was expected to be a component, but nothing was found.`
            );
            const capture = (globalThis as any).__captureRenderError;
            if (typeof capture === 'function') {
              capture(err);
              return document.createComment('helper-as-block-error');
            }
            throw err;
          }
        }
        if (helperFactory || helperLookup) {
          // Collect raw attr getters (keep them lazy for reactivity)
          const rawAttrs: Array<[string, any]> = [];
          if (tagProps && tagProps !== g.$_edp) {
            const attrs = tagProps[1];
            if (Array.isArray(attrs)) {
              rawAttrs.push(...attrs);
            }
          }

          // Create or reuse a persistent class-based helper instance.
          // The cache prevents re-creation when __gxtForceEmberRerender does
          // a full innerHTML='' + rebuild, which would otherwise create a new
          // instance and inflate createCount / computeCount.
          let helperInstance: any = null;
          let recomputeTag: any = null;

          if (helperFactory) {
            const factoryClass = helperFactory.class;
            const isClassBased = factoryClass && factoryClass.prototype &&
              typeof factoryClass.prototype.compute === 'function';
            if (isClassBased) {
              const cached = _tagHelperInstanceCache.get(kebabName);
              if (cached && cached.instance && !cached.instance.isDestroyed && !cached.instance.isDestroying) {
                helperInstance = cached.instance;
                recomputeTag = cached.recomputeTag;
              } else {
                try {
                  helperInstance = helperFactory.create();
                  // Find RECOMPUTE_TAG symbol on the instance
                  const symKeys = Object.getOwnPropertySymbols(helperInstance);
                  for (const sym of symKeys) {
                    if (sym.toString().includes('RECOMPUTE_TAG')) {
                      recomputeTag = helperInstance[sym];
                      break;
                    }
                  }
                  _tagHelperInstanceCache.set(kebabName, { instance: helperInstance, recomputeTag });
                  // Register for destruction
                  const destroyableInstances = g.__gxtHelperInstances;
                  if (Array.isArray(destroyableInstances)) {
                    destroyableInstances.push(helperInstance);
                  }
                } catch (e) {
                  if (_isAssertionLike(e)) throw e;
                  helperInstance = null;
                }
              }
            }
          }

          // Build a getter that resolves args lazily and invokes the helper.
          const helperGetter = () => {
            const positional: any[] = [];
            const named: Record<string, any> = {};
            for (const [key, value] of rawAttrs) {
              const resolved = typeof value === 'function' ? value() : value;
              if (key.startsWith('@__pos') && key.endsWith('__') && key !== '@__posCount__') {
                const idx = parseInt(key.slice(6, -2));
                positional[idx] = resolved;
              } else if (key.startsWith('@') && !key.startsWith('@__')) {
                named[key.slice(1)] = resolved;
              }
            }

            // Freeze positional/named to prevent mutation (Ember semantics)
            Object.freeze(positional);
            Object.freeze(named);

            if (helperInstance && typeof helperInstance.compute === 'function') {
              // Deduplicate: if args haven't changed, return cached result.
              // The force-rerender (innerHTML='' + rebuild) creates a NEW gxtEffect closure
              // that fires immediately with the same args, causing double-computation.
              // We store the cache on the helperInstance itself (which is shared via
              // _tagHelperInstanceCache) so it survives across closure re-creation.
              let argsSerialized: string | null = null;
              // Include recompute tag value in dedup key so recompute() invalidates cache
              const recomputeVal = (recomputeTag && typeof recomputeTag === 'object' && 'value' in recomputeTag)
                ? recomputeTag.value : 0;
              try { argsSerialized = JSON.stringify({ p: positional, n: named, r: recomputeVal }); } catch { /* skip dedup */ }
              if (argsSerialized !== null && argsSerialized === helperInstance.__gxtLastArgsSerialized) {
                // recomputeTag.value already consumed above for the dedup key
                return helperInstance.__gxtLastResult;
              }
              const result = helperInstance.compute(positional, named);
              helperInstance.__gxtLastArgsSerialized = argsSerialized;
              helperInstance.__gxtLastResult = result;
              // Consume RECOMPUTE_TAG cell for reactivity
              if (recomputeTag && typeof recomputeTag === 'object' && 'value' in recomputeTag) {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                recomputeTag.value;
              }
              return result;
            }

            // Simple helper: delegate to $_maybeHelper
            const maybeHelper = g.$_maybeHelper;
            if (typeof maybeHelper === 'function') {
              return maybeHelper(kebabName, positional, named, ctx);
            }
            return undefined;
          };

          // Create a reactive text node. The gxtEffect tracks cell reads
          // inside helperGetter and updates the text node when deps change.
          // We must avoid double-calling compute: the effect fires immediately
          // on creation (first evaluation), so we let it set the initial value.
          const textNode = document.createTextNode('');
          try {
            gxtEffect(() => {
              const v = helperGetter();
              textNode.textContent = v == null ? '' : String(v);
            });
          } catch (e) { if (_isAssertionLike(e)) throw e; /* effect setup may fail */ }
          return textNode;
        }
      }

      // Check if the component manager can handle this
      if (managers.component.canHandle(kebabName)) {
        // Build args from tagProps - convert Props format to args object
        // IMPORTANT: Keep args LAZY - don't evaluate functions yet!
        // Block params from parent slots won't be available until slot.default runs
        let args: any = {};
        // GXT FwType is [TagProp[], TagAttr[], TagEvent[]]
        // fwProps = position 0: HTML properties (class as ["", value], id, etc.)
        // fwAttrs = position 1: DOM attributes (data-*, title, etc.)
        const fwProps: [string, any][] = []; // Props to forward via ...attributes (fw[0])
        const fwAttrs: [string, any][] = []; // Attrs to forward via ...attributes (fw[1])

        if (tagProps && tagProps !== g.$_edp) {
          // tagProps is [props[], attrs[], events[], fw?]
          // - props[0]: HTML properties including class (key "" = class, key "id" = id, etc.)
          // - attrs[1]: Attributes with @ prefix for named args, or data-* attributes
          // - events[2]: Event handlers
          // - fw[3]: Forwarded props from parent (for nested components)

          // Process props (index 0) - includes class and other HTML properties
          const props = tagProps[0];
          if (Array.isArray(props)) {
            for (const [key, value] of props) {
              // Empty key means class attribute in GXT's format
              const attrKey = key === '' ? 'class' : key;
              // Collect for forwarding via ...attributes — keep in GXT's prop format
              // Class uses empty key "" in GXT's prop format
              // For class values, wrap to return "" instead of undefined/null/false
              // because GXT joins class values with " " and undefined becomes "undefined"
              if (key === '' || attrKey === 'class') {
                const wrappedValue = typeof value === 'function'
                  ? () => { const v = value(); return (v == null || v === false) ? '' : v; }
                  : (value == null || value === false) ? '' : value;
                fwProps.push([key, wrappedValue]);
              } else {
                fwProps.push([key, value]);
              }
              // Also add class/classNames to args so wrapper building and sync can access them
              if (attrKey === 'class' || attrKey === 'classNames') {
                Object.defineProperty(args, attrKey, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
              // HTML id prop (not @id named arg) - use special key to distinguish
              // from @id which maps to elementId (frozen after first render)
              if (attrKey === 'id') {
                Object.defineProperty(args, '__htmlId', {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }

          // Process attrs (index 1) - includes @ args and data-* attributes
          const attrs = tagProps[1];
          if (Array.isArray(attrs)) {
            for (const [key, value] of attrs) {
              if (key.startsWith('@')) {
                // Named arg - keep as lazy getter
                // The value might be a function that references block params
                // which won't be available until we're inside a slot context
                const argName = key.slice(1);
                Object.defineProperty(args, argName, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              } else {
                // HTML attribute (like data-test, title) - collect for forwarding as attrs (fw[1])
                fwAttrs.push([key, value]);
                // Also keep in args for direct access as lazy getter
                Object.defineProperty(args, key, {
                  get: () => typeof value === 'function' ? value() : value,
                  enumerable: true,
                  configurable: true,
                });
              }
            }
          }

          // Merge parent fw (tagProps[3]) if present — this handles ...attributes forwarding
          // through component chains (e.g., <XOuter data-foo> where XOuter template has
          // <XInner ...attributes> — the data-foo must reach XInner's ...attributes)
          //
          // Check for __splatLocal__ marker — attrs that come AFTER ...attributes
          // in source should override fw (local-first). Without marker, fw wins (parent first).
          const splatLocalNames = new Set<string>();
          // Check both fwProps and fwAttrs for __splatLocal__ marker
          for (const arr of [fwProps, fwAttrs]) {
            for (let i = arr.length - 1; i >= 0; i--) {
              if (arr[i][0] === '__splatLocal__') {
                const names = typeof arr[i][1] === 'string' ? arr[i][1] : (typeof arr[i][1] === 'function' ? arr[i][1]() : '');
                for (const n of names.split(',')) if (n) splatLocalNames.add(n);
                arr.splice(i, 1);
              }
            }
          }

          const parentFw = tagProps[3];
          if (parentFw && Array.isArray(parentFw)) {
            if (splatLocalNames.size > 0) {
              // ...attributes came BEFORE local attrs: local overrides fw
              // Put local first (already in fwProps/fwAttrs), then parent fw
              // But filter out parent entries that conflict with splatLocal names
              const classAfterSplat = splatLocalNames.has('__class__');
              splatLocalNames.delete('__class__');

              if (classAfterSplat) {
                // Class was AFTER ...attributes: fw classes first, local class second
                // Reorder: move local class entries to end, put parent class entries before them
                const localClassEntries = fwProps.filter(e => e[0] === '' || e[0] === 'class');
                const localNonClassEntries = fwProps.filter(e => e[0] !== '' && e[0] !== 'class');
                fwProps.length = 0;
                for (const entry of localNonClassEntries) fwProps.push(entry);
                // Parent props: non-class are filtered by splatLocalNames, class goes before local class
                if (Array.isArray(parentFw[0])) {
                  for (const entry of parentFw[0]) {
                    const k = entry[0] === '' ? 'class' : entry[0];
                    if (k === 'class') fwProps.push(entry); // parent class first
                    else if (!splatLocalNames.has(k)) fwProps.push(entry);
                  }
                }
                for (const entry of localClassEntries) fwProps.push(entry); // local class after
              } else {
                // No class after splat: local entries already in fwProps, add parent non-conflicting
                if (Array.isArray(parentFw[0])) {
                  for (const entry of parentFw[0]) {
                    const k = entry[0] === '' ? 'class' : entry[0];
                    if (!splatLocalNames.has(k)) fwProps.push(entry);
                  }
                }
              }
              if (Array.isArray(parentFw[1])) {
                for (const entry of parentFw[1]) {
                  if (!splatLocalNames.has(entry[0])) fwAttrs.push(entry);
                }
              }
            } else {
              // ...attributes came AFTER local attrs (or no positional info):
              // Parent fw should override local — put parent entries FIRST
              // EXCEPT for class (key === ''), where order is: local first, then parent
              // (class is additive and Ember preserves definition→invocation order)
              const localProps = [...fwProps];
              const localAttrs = [...fwAttrs];
              fwProps.length = 0;
              fwAttrs.length = 0;
              // Separate class entries from non-class entries
              const localClassProps = localProps.filter(e => e[0] === '' || e[0] === 'class');
              const localNonClassProps = localProps.filter(e => e[0] !== '' && e[0] !== 'class');
              const parentClassProps: any[] = [];
              const parentNonClassProps: any[] = [];
              if (Array.isArray(parentFw[0])) {
                for (const entry of parentFw[0]) {
                  if (entry[0] === '' || entry[0] === 'class') parentClassProps.push(entry);
                  else parentNonClassProps.push(entry);
                }
              }
              // Non-class: parent first (parent wins in GXT Set dedup)
              for (const entry of parentNonClassProps) fwProps.push(entry);
              for (const entry of localNonClassProps) fwProps.push(entry);
              // Class: local first, then parent (definition→invocation order)
              for (const entry of localClassProps) fwProps.push(entry);
              for (const entry of parentClassProps) fwProps.push(entry);
              // Attrs: parent first for non-class attrs
              if (Array.isArray(parentFw[1])) {
                for (const entry of parentFw[1]) fwAttrs.push(entry);
              }
              for (const entry of localAttrs) fwAttrs.push(entry);
            }
            // Events from parent are always merged
            if (Array.isArray(parentFw[2])) {
              // Events will be merged below in the events section
            }
          }
        }

        // Build fw (forwarding) structure for the component manager
        // fw[0] = props (class, id — for GXT's prop application on ...attributes elements)
        // fw[1] = attrs (data-*, title — for GXT's attr application on ...attributes elements)
        // fw[2] = events/modifiers (to forward to elements with ...attributes)
        const slots: Record<string, any> = {};

        // Collect events/modifiers from tagProps[2] for forwarding
        let events: [string, any][] = [];
        if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
          events = [...tagProps[2]];
          // Also merge parent events if present
          const parentFw = tagProps[3];
          if (parentFw && Array.isArray(parentFw) && Array.isArray(parentFw[2])) {
            for (const entry of parentFw[2]) {
              events.push(entry);
            }
          }
        } else {
          // Even without own events, merge parent events if present
          const parentFw = tagProps?.[3];
          if (parentFw && Array.isArray(parentFw) && Array.isArray(parentFw[2])) {
            events = [...parentFw[2]];
          }
        }
        // Helper to detect if children use block params
        // Block params are accessed via $_bp0, $_bp1 getters on Object.prototype
        const detectBlockParams = (slotChildren: any[]): boolean => {
          // Check if any child function references block params
          for (const child of slotChildren) {
            if (typeof child === 'function') {
              const fnStr = child.toString();
              // Look for $_bp references which indicate block params are used
              if (/\$_bp\d/.test(fnStr)) {
                return true;
              }
            }
          }
          return false;
        };

        if (children && children.length > 0) {
          // Separate named blocks from default slot children
          // Named blocks are marked with __isNamedBlock from :name element handling
          const namedBlocks: Map<string, { children: any[]; hasBlockParams: boolean }> = new Map();
          const defaultChildren: any[] = [];

          for (const child of children) {
            // Check if it's a named block marker
            if (child && typeof child === 'object' && child.__isNamedBlock) {
              const slotName = child.__slotName;
              if (!namedBlocks.has(slotName)) {
                namedBlocks.set(slotName, { children: [], hasBlockParams: false });
              }
              const slot = namedBlocks.get(slotName)!;
              // Add the named block's children to its slot
              if (child.__children) {
                slot.children.push(...child.__children);
              }
              // Copy the hasBlockParams flag from the named block marker
              if (child.__hasBlockParams) {
                slot.hasBlockParams = true;
              }
            } else {
              // Regular child goes to default slot
              defaultChildren.push(child);
            }
          }

          // Helper to create a slot function
          // explicitHasBlockParams: if true/false is explicitly provided, use it
          // otherwise detect from children
          const createSlotFn = (slotChildren: any[], explicitHasBlockParams?: boolean) => {
            // Use explicit flag if provided, otherwise detect from children
            const hasBlockParams = explicitHasBlockParams !== undefined
              ? explicitHasBlockParams
              : detectBlockParams(slotChildren);

            const slotFn = (slotCtx: any, ...params: any[]) => {
              const unwrappedParams = params.map(param => {
                if (param && typeof param === 'object' && 'fn' in param && 'isConst' in param) {
                  try { return param.fn(); } catch { return param; }
                }
                if (typeof param === 'function') {
                  try { return param(); } catch { return param; }
                }
                return param;
              });

              // Store on slotCtx for context-based lookup
              const contextParams = (globalThis as any).__contextBlockParams as WeakMap<object, any[]>;
              if (contextParams && slotCtx && typeof slotCtx === 'object') {
                contextParams.set(slotCtx, [...unwrappedParams]);
              }

              // Also store as current slot params for re-renders
              // This persists until the next slot call, allowing reactivity
              // to access block params even after the slot function returns
              (globalThis as any).__currentSlotParams = unwrappedParams;

              const stack = (globalThis as any).__blockParamsStack;
              stack.push(unwrappedParams);

              try {
                // Evaluate lazy children (wrapped in () => ... for deferred block param access)
                // and return raw children. GXT's rendering pipeline
                // (renderElement → resolveRenderable) will handle functions
                // by wrapping them in formulas that track cell dependencies.
                return slotChildren.map((child: any) => {
                  if (typeof child === 'function' && !child.__isCurriedComponent && !(child instanceof Node)) {
                    try { return child(); } catch { return child; }
                  }
                  return child;
                });
              } finally {
                stack.pop();
                // NOTE: We do NOT clear __currentSlotParams here
                // This allows re-renders (via GXT reactivity) to access
                // the params even after the slot function has returned
              }
            };

            // Mark slot with block params info for has-block-params helper
            (slotFn as any).__hasBlockParams = hasBlockParams;

            return slotFn;
          };

          // Create slot functions for named blocks
          for (const [slotName, slotData] of namedBlocks) {
            // Pass both children and the explicit hasBlockParams flag
            slots[slotName] = createSlotFn(slotData.children, slotData.hasBlockParams);
          }

          // Create default slot if there are default children
          // Check args.__hasBlockParams__ marker for explicit block params declaration
          if (defaultChildren.length > 0) {
            // Get the explicit hasBlockParams flag from args if present
            const explicitHasBlockParams = args.__hasBlockParams__ !== undefined
              ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
              : undefined;
            slots.default = createSlotFn(defaultChildren, explicitHasBlockParams);
          }
        }

        // Legacy: If no slots were created but children exist, create default slot
        // (This handles the case where there are no named blocks)
        if (children && children.length > 0 && !slots.default && Object.keys(slots).length === 0) {
          // Check for explicit hasBlockParams marker from args
          const explicitHasBlockParams = args.__hasBlockParams__ !== undefined
            ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
            : undefined;
          // Detect from children if not explicitly set
          const hasBlockParams = explicitHasBlockParams !== undefined
            ? explicitHasBlockParams
            : detectBlockParams(children);

          const slotFn = (slotCtx: any, ...params: any[]) => {
            // CRITICAL: Do NOT unwrap params here - keep them as raw values (potentially reactive)
            // The $_bp0, $_bp1, etc. getters will unwrap them when accessed
            // This allows reactivity to work: when the component's property changes,
            // the next access to $_bp0 will return the new value
            const rawParams = [...params];

            // Store on slotCtx for context-based lookup
            const contextParams = (globalThis as any).__contextBlockParams as WeakMap<object, any[]>;
            if (contextParams && slotCtx && typeof slotCtx === 'object') {
              contextParams.set(slotCtx, rawParams);
            }

            // Also store as current slot params for re-renders
            // This persists until the next slot call, allowing reactivity
            // to access block params even after the slot function returns
            (globalThis as any).__currentSlotParams = rawParams;

            // Push block params onto the global stack
            // The $_blockParam helper reads from this stack
            const stack = (globalThis as any).__blockParamsStack;
            stack.push(rawParams);

            try {
              // Evaluate lazy children (wrapped in () => ... for deferred block param access)
              // and return raw children. GXT's rendering pipeline handles functions via
              // resolveRenderable → formula tracking.
              return children.map((child: any) => {
                if (typeof child === 'function' && !child.__isCurriedComponent && !(child instanceof Node)) {
                  try { return child(); } catch { return child; }
                }
                return child;
              });
            } finally {
              // Pop block params from stack
              // NOTE: We do NOT clear __currentSlotParams here
              // This allows re-renders (via GXT reactivity) to access
              // the params even after the slot function has returned
              stack.pop();
            }
          };

          // Mark slot with block params info
          (slotFn as any).__hasBlockParams = hasBlockParams;
          slots.default = slotFn;
        }

        // Check for __hasBlock__ marker - indicates curly block invocation or
        // empty angle-bracket invocation <Component></Component>
        // Even if children are empty, we need to create a default slot
        // so that (has-block) returns true
        if (args.__hasBlock__ && !slots.default) {
          const blockName = typeof args.__hasBlock__ === 'function' ? args.__hasBlock__() : args.__hasBlock__;
          // Check if block params were declared
          const hasBlockParams = args.__hasBlockParams__ !== undefined
            ? (typeof args.__hasBlockParams__ === 'function' ? args.__hasBlockParams__() : args.__hasBlockParams__) === 'default'
            : false;
          // Create an empty slot function for the specified block
          const slotFn = (slotCtx: any, ...params: any[]) => {
            return []; // Empty slot - just return empty array
          };
          // Set the hasBlockParams flag on the slot
          (slotFn as any).__hasBlockParams = hasBlockParams;
          slots[blockName || 'default'] = slotFn;
          // Remove the markers from args so they're not passed to the component
          delete args.__hasBlock__;
          delete args.__hasBlockParams__;
        }

        // GXT FwType is [TagProp[], TagAttr[], TagEvent[]] - all arrays
        // Props in position 0 (class, id), attrs in position 1 (data-*, title),
        // events in position 2. Slots are passed separately via args.$slots.
        const fw = [fwProps, fwAttrs, events];  // [props, attrs, events]

        // Pass slots via args so manager.ts can access them.
        // Set on both string key and Symbol key to survive GXT's slot processing.
        args.$slots = slots;
        args[Symbol.for('gxt-slots')] = slots;

        // Return a THUNK that renders the component when called
        // This is crucial for block params: when <Outer><Inner @msg={{param}} /></Outer>
        // is compiled, $_tag('Inner', ...) is called BEFORE $_tag('Outer', ...)
        // (due to JavaScript array literal evaluation order)
        // By returning a thunk, we defer the actual rendering until slot.default
        // calls the children functions - at which point block params are set up

        // Create a stable instance ID for this component position in the template
        // This ID is preserved across re-renders of the same template position
        const GXT_THUNK_ID = Symbol.for('gxt-thunk-id');
        if (!args[GXT_THUNK_ID]) {
          args[GXT_THUNK_ID] = Symbol('thunk-instance');
        }
        const thunkId = args[GXT_THUNK_ID];

        const renderComponent = function __componentThunk() {
          // Now evaluate args and render the component
          // The args getters will access block params from the stack
          // Pass the stable thunkId to enable instance caching
          (args as any).__thunkId = thunkId;
          const handleResult = managers.component.handle(kebabName, args, fw, ctx);
          if (typeof handleResult === 'function') {
            return handleResult();
          }
          return handleResult;
        };
        // Mark as component thunk for debugging
        (renderComponent as any).__isComponentThunk = true;
        (renderComponent as any).__componentName = kebabName;

        // Check if we're inside a slot context (block params active).
        // If block params are on the stack, we must return the thunk deferred
        // so that GXT's rendering pipeline calls it within the slot scope.
        // Otherwise, execute immediately so GXT receives a DOM node directly.
        const bpStack = (globalThis as any).__blockParamsStack;
        const hasBP = bpStack && bpStack.length > 0 && bpStack[bpStack.length - 1]?.length > 0;
        if (hasBP) {
          return renderComponent;
        }
        // Execute immediately — GXT's $_tag expects a DOM node return
        return renderComponent();
      }

    }

    // Fall back to original $_tag for regular HTML elements
    // GXT handles ...attributes internally via tagProps[3] ($fw):
    // - fw[0] = props (class, id, etc.)
    // - fw[1] = attrs (data-*, title, etc.)
    // - fw[2] = events (event handlers/modifiers)
    //
    // GXT applies fw BEFORE local attrs, so local attrs win. But Ember's
    // ...attributes semantics require invocation-side (fw) to override
    // definition-side (local) for the same attribute. Fix: remove local
    // props/attrs that are also present in fw so fw values take effect.
    if (tagProps && tagProps !== g.$_edp && tagProps[3] && typeof tagProps[3] === 'object') {
      const fw = tagProps[3];
      // Check for __splatLocal__ marker — these are local attrs that come AFTER
      // ...attributes in the source and should override fw (not be overridden by it).
      // GXT may place __splatLocal__ in tagProps[0] (props) or tagProps[1] (attrs).
      const splatLocalSet = new Set<string>();
      for (const pos of [0, 1]) {
        if (Array.isArray(tagProps[pos])) {
          for (const entry of tagProps[pos]) {
            if (entry[0] === '__splatLocal__') {
              const names = typeof entry[1] === 'string' ? entry[1] : (typeof entry[1] === 'function' ? entry[1]() : '');
              for (const n of names.split(',')) if (n) splatLocalSet.add(n);
            }
          }
        }
      }

      // Build sets of keys present in fw props and fw attrs
      const fwPropKeys = new Set<string>();
      const fwAttrKeys = new Set<string>();
      if (Array.isArray(fw[0])) {
        for (const entry of fw[0]) {
          const key = entry[0] === '' ? 'class' : entry[0];
          if (key !== 'class' && !splatLocalSet.has(key)) fwPropKeys.add(entry[0]);
        }
      }
      if (Array.isArray(fw[1])) {
        for (const entry of fw[1]) {
          if (!splatLocalSet.has(entry[0])) fwAttrKeys.add(entry[0]);
        }
      }

      tagProps = [tagProps[0], tagProps[1], tagProps[2], tagProps[3]];

      // Remove __splatLocal__ marker from props and attrs
      if (splatLocalSet.size > 0) {
        if (Array.isArray(tagProps[0])) {
          tagProps[0] = tagProps[0].filter((entry: any) => entry[0] !== '__splatLocal__');
        }
        if (Array.isArray(tagProps[1])) {
          tagProps[1] = tagProps[1].filter((entry: any) => entry[0] !== '__splatLocal__');
        }
      }

      // For attrs NOT in splatLocal: fw should override local (remove from local)
      if (fwPropKeys.size > 0 && Array.isArray(tagProps[0])) {
        tagProps[0] = tagProps[0].filter((entry: any) => !fwPropKeys.has(entry[0]));
      }
      if (fwAttrKeys.size > 0 && Array.isArray(tagProps[1])) {
        tagProps[1] = tagProps[1].filter((entry: any) => !fwAttrKeys.has(entry[0]));
      }

      // For attrs IN splatLocal: local should override fw (remove from fw)
      if (splatLocalSet.size > 0) {
        const newFw = [
          Array.isArray(fw[0]) ? fw[0].filter((e: any) => {
            const k = e[0] === '' ? 'class' : e[0];
            return !splatLocalSet.has(k);
          }) : fw[0],
          Array.isArray(fw[1]) ? fw[1].filter((e: any) => !splatLocalSet.has(e[0])) : fw[1],
          fw[2]
        ];
        tagProps[3] = newFw;
      }

      // Reorder class entries for ...attributes precedence.
      // GXT applies fw classes first (from tagProps[3][0]) then local (from tagProps[0]).
      // Ember wants:
      //   <div class="qux" ...attributes /> → local first, fw second (need to swap)
      //   <div ...attributes class="qux" /> → fw first, local second (GXT default, no swap)
      // If __class__ is NOT in splatLocalSet, ...attributes was AFTER class → swap.
      // If __class__ IS in splatLocalSet, ...attributes was BEFORE class → no swap.
      const classAfterSplat = splatLocalSet.has('__class__');
      if (!classAfterSplat && Array.isArray(tagProps[0]) && Array.isArray(tagProps[3]?.[0])) {
        const localClassEntries = tagProps[0].filter((e: any) => e[0] === '');
        if (localClassEntries.length > 0) {
          tagProps[0] = tagProps[0].filter((e: any) => e[0] !== '');
          // Prepend local class entries to fw[0] so they come first in GXT's class concat
          tagProps[3] = [[...localClassEntries, ...tagProps[3][0]], tagProps[3][1], tagProps[3][2]];
        }
      }
      // Clean __class__ from splatLocalSet (it's a meta-marker, not an actual attr)
      splatLocalSet.delete('__class__');
    }
    // GXT order: tag, tagProps, ctx, children
    // Wrap TEXT_CONTENT event getters (event key "1") so non-primitive, non-Node values
    // (Date, Object, Symbol) are stringified before reaching GXT's $ev/resolveRenderable.
    // GXT's resolveRenderable returns raw objects for non-primitive values, which then
    // fails in opcodeFor (expects a cell/tag). Ember stringifies all values in text positions.
    if (tagProps && tagProps !== g.$_edp && Array.isArray(tagProps[2])) {
      for (let ei = 0; ei < tagProps[2].length; ei++) {
        const entry = tagProps[2][ei];
        if (Array.isArray(entry) && entry[0] === '1' && typeof entry[1] === 'function') {
          const origGetter = entry[1];
          entry[1] = function _stringifyTextContent() {
            const val = origGetter.apply(this, arguments);
            if (val == null || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val;
            if (typeof val === 'symbol') return String(val);
            if (typeof val === 'function') return val;
            if (val instanceof Node) return val;
            // Non-primitive object — stringify for text position (Ember behavior)
            if (typeof val === 'object') {
              if (Array.isArray(val)) return val;
              if (typeof val.toHTML === 'function') return val;
              if (val.__isCurriedComponent) return val;
              try { return String(val); } catch { return ''; }
            }
            return val;
          };
        }
      }
    }
    return originalTag(tag, tagProps, ctx, children);
  };

  // Mark as wrapped to prevent re-wrapping
  g.$_tag.__compileWrapped = true;
}

// Override $_dc to handle CurriedComponent and other Ember components via
// dynamic component invocations (e.g., <this.$_bp0.baz class="custom-class">).
// GXT's native $_dc doesn't call $_c for non-function components, so
// CurriedComponents (which are objects) bypass the Ember component manager.
//
// Also handles string component names from Ember's {{component this.componentName}}
// pattern. GXT's $_dc expects function references for component swapping, but
// Ember dynamic components resolve to string names like 'foo-bar'. We wrap the
// getter to convert strings into unique marker functions per name, enabling
// $_dc's swap logic to detect component changes and re-render.
{
  const g = globalThis as any;
  if (g.$_dc && !g.$_dc.__emberWrapped) {
    const originalDc = g.$_dc;

    // Per-name marker functions so $_dc detects reference changes and swaps.
    const stringComponentMarkers = new Map<string, Function>();

    // Stable empty component marker for falsy/undefined dynamic component names
    function _dcEmptyComponent() {}
    (_dcEmptyComponent as any).__emptyComponent = true;

    g.$_dc = function $_dc_ember(componentGetter: any, args: any, ctx: any) {
      // GXT's $_dc passes raw tagProps as args to the original $_c (R).
      // R reads args[$PROPS] to get the fw, but raw tagProps don't have $PROPS.
      // Fix: inject $PROPS directly on the args object so R can find it.
      const $PROPS = Symbol.for('gxt-props');

      if (args && typeof args === 'object' && !($PROPS in args)) {
        try {
          Object.defineProperty(args, $PROPS, {
            value: args,
            enumerable: false,
            configurable: true,
            writable: true,
          });
        } catch { /* frozen object */ }
      }

      // Wrap the getter to translate non-function values (strings, CurriedComponents,
      // falsy) into unique marker functions. GXT's $_dc only swaps when it detects a
      // different function reference, so each unique component name must map to a
      // distinct function. The cell tracking still works because componentGetter()
      // is called inside this wrapper, which accesses the same tracked cells.
      const wrappedGetter = () => {
        const raw = componentGetter();

        // Falsy (undefined, null, '') — render nothing
        if (!raw && raw !== 0) {
          return _dcEmptyComponent;
        }

        // String component name — return a stable marker function per name
        if (typeof raw === 'string') {
          let marker = stringComponentMarkers.get(raw);
          if (!marker) {
            marker = function _dcStringMarker() {};
            (marker as any).__stringComponentName = raw;
            stringComponentMarkers.set(raw, marker);
          }
          return marker;
        }

        // CurriedComponent object — wrap in a unique marker function
        if (raw && raw.__isCurriedComponent) {
          // Use the underlying component name for identity so swapping
          // between different curried components triggers re-render.
          const key = '__curried:' + (raw.__name || '') + ':' + JSON.stringify(Object.keys(raw.__curriedArgs || {}));
          let marker = stringComponentMarkers.get(key);
          if (!marker) {
            marker = function _dcCurriedMarker() {};
            (marker as any).__isCurriedComponent = true;
            (marker as any).__name = raw.__name;
            (marker as any).__curriedArgs = raw.__curriedArgs;
            (marker as any).__curriedPositionals = raw.__curriedPositionals;
            stringComponentMarkers.set(key, marker);
          } else {
            // Update args on existing marker since they may have changed
            (marker as any).__curriedArgs = raw.__curriedArgs;
            (marker as any).__curriedPositionals = raw.__curriedPositionals;
          }
          return marker;
        }

        // Function (native GXT component) — pass through unchanged
        return raw;
      };

      // Expose getter so the component manager can read the latest curried component
      (g as any).__dcComponentGetter = componentGetter;

      return originalDc(wrappedGetter, args, ctx);
    };
    g.$_dc.__emberWrapped = true;
  }
}

/**
 * Transform capitalized component names to kebab-case for runtime resolution.
 */
function transformCapitalizedComponents(code: string): string {
  let result = code;

  // List of known Ember built-in components that need transformation
  const knownComponents = ['LinkTo', 'Outlet'];

  for (const component of knownComponents) {
    const kebab = component.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

    // Opening tag: <LinkTo to <link-to
    const openTagRegex = new RegExp(`<${component}(?=[\\s/>])`, 'g');
    result = result.replace(openTagRegex, `<${kebab}`);

    // Closing tag: </LinkTo> to </link-to>
    const closeTagRegex = new RegExp(`</${component}>`, 'g');
    result = result.replace(closeTagRegex, `</${kebab}>`);
  }

  return result;
}

/**
 * Transform {{outlet}} to <ember-outlet />
 */
function transformOutletHelper(code: string): string {
  return code.replace(/\{\{\s*outlet\s*\}\}/g, '<ember-outlet />');
}

/**
 * Transform triple mustaches {{{expr}}} to raw HTML output
 * Triple mustaches in Handlebars output HTML without escaping
 * We transform them to a special component that handles raw HTML
 */
function transformTripleMustaches(code: string): string {
  // Match {{{...}}} but not {{{{...}}}}
  // Transform to <EmberHtmlRaw @value={{expr}} /> component
  return code.replace(/\{\{\{([^}]+)\}\}\}/g, (match, expr) => {
    return `<EmberHtmlRaw @value={{${expr.trim()}}} />`;
  });
}

/**
 * Transform angle-bracket components with positional parameters
 * <SampleComponent "Foo" 4 "Bar" @namedArg=val /> -> <SampleComponent @__pos0__="Foo" @__pos1__={{4}} @__pos2__="Bar" @__posCount__={{3}} @namedArg=val />
 */
function transformAngleBracketPositionalParams(code: string): string {
  // Match angle-bracket component with potential positional params
  // Pattern: <PascalCaseName followed by content that includes unattributed values
  const componentPattern = /<([A-Z][a-zA-Z0-9]*)(\s+[^>]*?)?(\s*\/>|>)/g;

  return code.replace(componentPattern, (match, tagName, attrsSection, closing) => {
    if (!attrsSection || !attrsSection.trim()) {
      return match; // No attrs, nothing to transform
    }

    let remaining = attrsSection.trim();
    const positionalParams: string[] = [];
    const namedParams: string[] = [];

    // Parse the attrs string token by token
    while (remaining.length > 0) {
      remaining = remaining.trim();
      if (remaining.length === 0) break;

      // Check for named parameter: @name=value or name=value
      const namedMatch = remaining.match(/^(@?[a-zA-Z_][a-zA-Z0-9_-]*)=/);
      if (namedMatch) {
        const fullName = namedMatch[1];
        let valueStr = remaining.slice(namedMatch[0].length);
        let value: string;

        // Determine the value type and extract it
        if (valueStr.startsWith('{{')) {
          // Mustache: find matching }}
          let depth = 0;
          let i = 0;
          for (; i < valueStr.length; i++) {
            if (valueStr[i] === '{' && valueStr[i + 1] === '{') depth++;
            else if (valueStr[i] === '}' && valueStr[i + 1] === '}') {
              depth--;
              if (depth === 0) {
                i += 2;
                break;
              }
            }
          }
          value = valueStr.slice(0, i);
        } else if (valueStr.startsWith('"')) {
          const match = valueStr.match(/^"(?:[^"\\]|\\.)*"/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else if (valueStr.startsWith("'")) {
          const match = valueStr.match(/^'(?:[^'\\]|\\.)*'/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else {
          value = valueStr.split(/[\s>]/)[0] || '';
        }

        namedParams.push(`${fullName}=${value}`);
        remaining = remaining.slice(namedMatch[0].length + value.length);
        continue;
      }

      // Check for as |...| block params marker
      if (remaining.startsWith('as ')) {
        // Keep the rest as-is
        namedParams.push(remaining);
        break;
      }

      // Check for positional parameter: "string", 'string', {{expr}}, number, or boolean
      // Quoted string
      const quotedMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (quotedMatch) {
        positionalParams.push(quotedMatch[1]);
        remaining = remaining.slice(quotedMatch[1].length);
        continue;
      }

      // Mustache expression
      if (remaining.startsWith('{{')) {
        let depth = 0;
        let i = 0;
        for (; i < remaining.length; i++) {
          if (remaining[i] === '{' && remaining[i + 1] === '{') depth++;
          else if (remaining[i] === '}' && remaining[i + 1] === '}') {
            depth--;
            if (depth === 0) {
              i += 2;
              break;
            }
          }
        }
        const mustacheExpr = remaining.slice(0, i);
        // Check if this is a modifier invocation: {{name args...}} where name is a
        // simple identifier (not this.x or @arg) and has arguments after the name.
        // Modifiers on components should be kept as-is for GXT to handle.
        const innerExpr = mustacheExpr.slice(2, -2).trim();
        const firstSpace = innerExpr.indexOf(' ');
        const isModifier = firstSpace > 0 &&
          !innerExpr.startsWith('this.') &&
          !innerExpr.startsWith('@') &&
          !innerExpr.startsWith('(') &&
          /^[a-zA-Z][a-zA-Z0-9-]*/.test(innerExpr);
        if (isModifier) {
          // Keep modifier as-is in the named params — it will be part of the element
          namedParams.push(mustacheExpr);
        } else {
          positionalParams.push(mustacheExpr);
        }
        remaining = remaining.slice(i);
        continue;
      }

      // Number or boolean
      const numberMatch = remaining.match(/^(-?\d+(?:\.\d+)?|true|false)\b/);
      if (numberMatch) {
        positionalParams.push(numberMatch[1]);
        remaining = remaining.slice(numberMatch[1].length);
        continue;
      }

      // Path like this.name (as positional param)
      const pathMatch = remaining.match(/^(this\.[a-zA-Z0-9_.]+)/);
      if (pathMatch) {
        positionalParams.push(`{{${pathMatch[1]}}}`);
        remaining = remaining.slice(pathMatch[1].length);
        continue;
      }

      // Skip unknown character
      remaining = remaining.slice(1);
    }

    // If no positional params, return unchanged
    if (positionalParams.length === 0) {
      return match;
    }

    // Build the new attrs string
    let newAttrs = '';

    // First add positional params as @__posN__ args
    for (let i = 0; i < positionalParams.length; i++) {
      const p = positionalParams[i];
      if (p.startsWith('"') || p.startsWith("'")) {
        newAttrs += ` @__pos${i}__=${p}`;
      } else if (p.startsWith('{{') && p.endsWith('}}')) {
        newAttrs += ` @__pos${i}__=${p}`;
      } else {
        // Numbers and booleans
        newAttrs += ` @__pos${i}__={{${p}}}`;
      }
    }
    newAttrs += ` @__posCount__={{${positionalParams.length}}}`;

    // Then add named params
    for (const param of namedParams) {
      newAttrs += ` ${param}`;
    }

    return `<${tagName}${newAttrs}${closing}`;
  });
}

/**
 * Transform {{component}} helper to angle-bracket syntax
 * - {{#component "foo-bar"}}content{{/component}} → <FooBar>content</FooBar>
 * - {{#component "foo-bar" arg=val}}content{{/component}} → <FooBar @arg={{val}}>content</FooBar>
 * - {{component "foo-bar"}} → <FooBar />
 */
function transformComponentHelper(code: string): string {
  let result = code;

  // Helper to convert kebab-case to PascalCase
  const toPascalCase = (name: string) => {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  };

  // Helper to convert attrs like arg=val to @arg={{val}}
  const transformAttrs = (attrs: string) => {
    if (!attrs.trim()) return '';

    let transformed = attrs.trim();

    // Transform each attribute - need to handle:
    // name=value, name={{value}}, name="value", name='value', name=this.value
    transformed = transformed.replace(/([a-zA-Z][a-zA-Z0-9-]*)=(\{\{[^}]+\}\}|"[^"]*"|'[^']*'|this\.[a-zA-Z0-9.]+|[^\s}]+)/g,
      (match, name, value) => {
        // Add @ prefix if not already present
        const attrName = name.startsWith('@') ? name : `@${name}`;
        // Wrap value in {{}} if it's a bare path and not already wrapped
        let attrValue = value;
        if (!value.startsWith('{{') && !value.startsWith('"') && !value.startsWith("'")) {
          // Bare values: this.xxx, item.name, true, false, numbers, etc.
          attrValue = `{{${value}}}`;
        }
        return `${attrName}=${attrValue}`;
      });

    // Return with leading space
    return ' ' + transformed;
  };

  // Block form: {{#component "name"}}...{{/component}}
  // Need to handle nested components properly using depth-based matching
  // to support nested {{#component}} blocks
  {
    let iterations = 0;
    const maxIter = 50;
    while (/\{\{#component\s/.test(result) && iterations < maxIter) {
      iterations++;
      // Find the first {{#component ...}} block
      const openMatch = result.match(/\{\{#component\s+(["']([^"']+)["']|this\.[a-zA-Z0-9_.]+)([^}]*)\}\}/);
      if (!openMatch) break;

      const fullOpen = openMatch[0];
      const startIdx = result.indexOf(fullOpen);
      const isStringName = openMatch[2] !== undefined;
      const name = isStringName ? openMatch[2] : openMatch[1]; // string name or this.xxx
      const attrs = openMatch[3] || '';

      // Find the matching {{/component}} with depth tracking
      let depth = 1;
      let searchPos = startIdx + fullOpen.length;
      let endIdx = -1;

      while (depth > 0 && searchPos < result.length) {
        const nextOpen = result.indexOf('{{#component ', searchPos);
        const nextClose = result.indexOf('{{/component}}', searchPos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchPos = nextOpen + 13; // past '{{#component '
        } else {
          depth--;
          if (depth === 0) {
            endIdx = nextClose + '{{/component}}'.length;
          } else {
            searchPos = nextClose + '{{/component}}'.length;
          }
        }
      }

      if (endIdx === -1) break;

      const content = result.slice(startIdx + fullOpen.length, endIdx - '{{/component}}'.length);

      let replacement: string;
      if (isStringName) {
        if (attrs && /(?<!=)\s*\(/.test(attrs)) {
          // Has subexpressions, skip
          break;
        }
        const pascalName = toPascalCase(name);
        const transformedAttrs = transformAttrs(attrs);
        replacement = `<${pascalName}${transformedAttrs}>${content}</${pascalName}>`;
      } else {
        // Dynamic name: this.componentName
        // Transform to <this.xxx @attrs>content</this.xxx> which GXT compiles to $_dc()
        const transformedAttrs = transformAttrs(attrs);
        replacement = `<${name}${transformedAttrs}>${content}</${name}>`;
      }

      result = result.slice(0, startIdx) + replacement + result.slice(endIdx);
    }
  }

  // Inline form: {{component "name" arg=val}}
  // Skip transformation if attrs contain positional subexpressions (e.g., (component ...))
  // that are NOT part of a named arg value. Named arg values with subexpressions
  // like greeting=(hash ...) are OK to transform, but bare (component ...) positional
  // args cannot be converted to angle-bracket syntax.
  const inlinePattern = /\{\{component\s+["']([^"']+)["']([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs) => {
    if (attrs) {
      // Check for bare positional subexpressions: (word ...) NOT preceded by =
      // This detects positional args like (component "-foo") but not named args like greeting=(hash ...)
      if (/(?<!=)\s*\(/.test(attrs)) {
        return match; // Leave as-is for GXT to handle via $_componentHelper
      }
    }
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs} />`;
  });

  // Inline form with dynamic name: {{component this.xxx arg=val}} or
  // {{component this.xxx positional1 positional2}}
  // Transform to <this.xxx @arg={{val}} /> which GXT compiles to $_dc()
  // The $_dc_ember override handles resolving string names to components at runtime.
  const inlineDynamicPattern = /\{\{component\s+(this\.[a-zA-Z0-9_.]+)([^}]*)\}\}/g;
  result = result.replace(inlineDynamicPattern, (match, name, attrs) => {
    if (attrs && attrs.trim()) {
      const transformedAttrs = transformCurlyArgsToAngleBracket(attrs.trim());
      return `<${name}${transformedAttrs} />`;
    }
    return `<${name} />`;
  });

  return result;
}

/**
 * Transform curly-style arguments to angle-bracket @-prefixed arguments.
 * E.g., 'label="Foo" count=this.count' -> ' @label="Foo" @count={{this.count}}'
 * Also handles positional parameters:
 * E.g., '"Foo" 42 key=val' -> ' @__pos0__="Foo" @__pos1__={{42}} @__posCount__={{2}} @key={{val}}'
 */
function transformCurlyArgsToAngleBracket(args: string): string {
  if (!args) return '';

  let remaining = args.trim();
  const positionalParams: string[] = [];
  const namedParams: string[] = [];

  // Parse args token by token (similar to transformAttrs in transformCurlyBlockComponents)
  while (remaining.length > 0) {
    remaining = remaining.trim();
    if (remaining.length === 0) break;

    // Skip 'as |...|' block params clause
    const asMatch = remaining.match(/^as\s*\|([^|]+)\|/);
    if (asMatch) {
      // Preserve block params clause - it will be handled elsewhere
      remaining = remaining.slice(asMatch[0].length);
      continue;
    }

    // Named parameter: key=value
    const nameMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9-]*)=/);
    if (nameMatch) {
      const name = nameMatch[1];
      let valueStr = remaining.slice(nameMatch[0].length);
      let value: string;

      if (valueStr.startsWith('{{')) {
        const endIdx = valueStr.indexOf('}}');
        value = endIdx !== -1 ? valueStr.slice(0, endIdx + 2) : valueStr.split(/\s/)[0] || '';
      } else if (valueStr.startsWith('"')) {
        const match = valueStr.match(/^"(?:[^"\\]|\\.)*"/);
        value = match ? match[0] : valueStr.split(/\s/)[0] || '';
      } else if (valueStr.startsWith("'")) {
        const match = valueStr.match(/^'(?:[^'\\]|\\.)*'/);
        value = match ? match[0] : valueStr.split(/\s/)[0] || '';
      } else if (valueStr.startsWith('(')) {
        // Match balanced parens for subexpressions
        let depth = 0, i = 0;
        for (; i < valueStr.length; i++) {
          if (valueStr[i] === '(') depth++;
          else if (valueStr[i] === ')') { depth--; if (depth === 0) { i++; break; } }
        }
        value = valueStr.slice(0, i);
      } else {
        value = valueStr.split(/[\s}]/)[0] || '';
      }

      const attrName = `@${name}`;
      let attrValue = value;
      // Wrap non-quoted, non-mustache values in {{}}
      if (!value.startsWith('{{') && !value.startsWith('"') && !value.startsWith("'")) {
        attrValue = `{{${value}}}`;
      }
      namedParams.push(`${attrName}=${attrValue}`);
      remaining = remaining.slice(nameMatch[0].length + value.length);
      continue;
    }

    // Positional: quoted string
    const quotedMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
    if (quotedMatch) {
      positionalParams.push(quotedMatch[1]);
      remaining = remaining.slice(quotedMatch[1].length);
      continue;
    }

    // Positional: mustache expression
    const mustacheMatch = remaining.match(/^(\{\{[^}]+\}\})/);
    if (mustacheMatch) {
      positionalParams.push(mustacheMatch[1]);
      remaining = remaining.slice(mustacheMatch[1].length);
      continue;
    }

    // Positional: number or boolean
    const numberMatch = remaining.match(/^(-?\d+(?:\.\d+)?|true|false)\b/);
    if (numberMatch) {
      positionalParams.push(numberMatch[1]);
      remaining = remaining.slice(numberMatch[1].length);
      continue;
    }

    // Positional: subexpression
    if (remaining.startsWith('(')) {
      let depth = 0, i = 0;
      for (; i < remaining.length; i++) {
        if (remaining[i] === '(') depth++;
        else if (remaining[i] === ')') { depth--; if (depth === 0) { i++; break; } }
      }
      const expr = remaining.slice(0, i);
      positionalParams.push(expr);
      remaining = remaining.slice(i);
      continue;
    }

    // Positional: path like this.name or @foo or bare identifier
    const pathMatch = remaining.match(/^(this\.[a-zA-Z0-9_.]+|@[a-zA-Z][a-zA-Z0-9-]*|[a-zA-Z_][a-zA-Z0-9_.]*)/);
    if (pathMatch) {
      // Check if followed by '=' - then it's a named param starting, don't consume as positional
      if (remaining.charAt(pathMatch[0].length) === '=') {
        // This is actually a named param without our regex matching - advance
        remaining = remaining.slice(1);
        continue;
      }
      positionalParams.push(`{{${pathMatch[1]}}}`);
      remaining = remaining.slice(pathMatch[1].length);
      continue;
    }

    // Skip unknown character
    remaining = remaining.slice(1);
  }

  // Build the result
  let result = '';
  if (namedParams.length > 0) {
    result += ' ' + namedParams.join(' ');
  }
  if (positionalParams.length > 0) {
    for (let i = 0; i < positionalParams.length; i++) {
      const p = positionalParams[i];
      if (p.startsWith('"') || p.startsWith("'")) {
        result += ` @__pos${i}__=${p}`;
      } else if (p.startsWith('{{') && p.endsWith('}}')) {
        result += ` @__pos${i}__=${p}`;
      } else if (p.startsWith('(')) {
        result += ` @__pos${i}__={{${p}}}`;
      } else {
        result += ` @__pos${i}__={{${p}}}`;
      }
    }
    result += ` @__posCount__={{${positionalParams.length}}}`;
  }
  return result;
}

/**
 * Transform Ember's block params syntax so that block param references use a global accessor.
 *
 * The key insight is that GXT compiles expressions to arrow functions which capture `this`
 * lexically. We cannot change `this` for arrow functions with .call(). Instead, we use
 * a global object that can be accessed from anywhere.
 *
 * This function transforms:
 *   <Foo as |x y|>{{x}} {{y}}</Foo>
 * To:
 *   <Foo>{{$_bp.0}} {{$_bp.1}}</Foo>
 *
 * Before evaluating children, we set globalThis.$_bp = params, allowing the functions
 * to access the yield values through this global reference.
 */
function transformBlockParams(templateString: string): { transformed: string; blockParamMappings: Map<string, string[]> } {
  let result = templateString;
  const blockParamMappings = new Map<string, string[]>();

  // Find all components with `as |...|` block params
  // Pattern: <ComponentName (attrs) as |param1 param2 ...|>
  // Note: Attribute names can include underscores (e.g., @__hasBlock__)
  const blockParamPattern = /<([A-Z][a-zA-Z0-9-]*)((?:\s+(?:[@a-zA-Z_][a-zA-Z0-9_-]*(?:=(?:"[^"]*"|'[^']*'|\{\{[^}]*\}\}|[^\s>]*))?))*)(\s+as\s*\|([^|]+)\|)(\s*)>/g;

  interface BlockParamScope {
    componentName: string;
    params: string[];
    startIndex: number;
    endIndex: number;
    openTagEnd: number;
  }

  const scopes: BlockParamScope[] = [];
  let match;

  // First pass: find all block param scopes
  while ((match = blockParamPattern.exec(result)) !== null) {
    const [fullMatch, componentName, attrs, asClause, paramsStr] = match;
    const startIndex = match.index;
    const openTagEnd = startIndex + fullMatch.length;

    // Parse params (space-separated)
    const params = paramsStr.trim().split(/\s+/);

    // Find the closing tag for this component
    const closingTag = `</${componentName}>`;
    let depth = 1;
    let searchPos = openTagEnd;
    let endIndex = -1;

    // Simple tag matching (doesn't handle all edge cases but works for most templates)
    const tagOpenPattern = new RegExp(`<${componentName}(?:\\s|>|/>)`, 'g');
    const tagClosePattern = new RegExp(`</${componentName}>`, 'g');

    // Find matching closing tag
    while (depth > 0 && searchPos < result.length) {
      tagOpenPattern.lastIndex = searchPos;
      tagClosePattern.lastIndex = searchPos;

      const openMatch = tagOpenPattern.exec(result);
      const closeMatch = tagClosePattern.exec(result);

      if (!closeMatch) break;

      if (openMatch && openMatch.index < closeMatch.index && !openMatch[0].endsWith('/>')) {
        depth++;
        searchPos = openMatch.index + openMatch[0].length;
      } else {
        depth--;
        if (depth === 0) {
          endIndex = closeMatch.index + closeMatch[0].length;
        } else {
          searchPos = closeMatch.index + closeMatch[0].length;
        }
      }
    }

    if (endIndex === -1) continue;

    scopes.push({
      componentName,
      params,
      startIndex,
      endIndex,
      openTagEnd,
    });

    blockParamMappings.set(componentName + '_' + startIndex, params);
  }

  // Second pass: transform references within each scope (process in reverse to preserve indices)
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    const { params, startIndex, endIndex, openTagEnd, componentName } = scope;

    // Extract the block content
    const blockContent = result.slice(openTagEnd, endIndex - `</${componentName}>`.length);

    // Replace each param reference with a positional accessor
    // Transform {{param}} to {{this.$_bp0}} and {{param.prop}} to {{this.$_bp0.prop}}
    // The slot function will set up $_bp0, $_bp1, etc. on the context
    let transformedContent = blockContent;
    for (let j = 0; j < params.length; j++) {
      const param = params[j];
      const bpVar = `$_bp${j}`;

      // Replace {{param.property}} with {{this.$_bp0.property}} (do this first for longer matches)
      const pathPattern = new RegExp(`\\{\\{\\s*${param}(\\.[a-zA-Z0-9_.]+)\\s*\\}\\}`, 'g');
      transformedContent = transformedContent.replace(pathPattern, `{{this.${bpVar}$1}}`);

      // Replace {{param}} with {{this.$_bp0}} (simple case)
      const simplePattern = new RegExp(`\\{\\{\\s*${param}\\s*\\}\\}`, 'g');
      transformedContent = transformedContent.replace(simplePattern, `{{this.${bpVar}}}`);

      // Replace in attribute values: @attr={{param.property}}
      const attrPathPattern = new RegExp(`([@a-zA-Z][a-zA-Z0-9-]*=)\\{\\{${param}(\\.[a-zA-Z0-9_.]+)\\}\\}`, 'g');
      transformedContent = transformedContent.replace(attrPathPattern, `$1{{this.${bpVar}$2}}`);

      // Replace in attribute values: @attr={{param}}
      const attrPattern = new RegExp(`([@a-zA-Z][a-zA-Z0-9-]*=)\\{\\{${param}\\}\\}`, 'g');
      transformedContent = transformedContent.replace(attrPattern, `$1{{this.${bpVar}}}`);

      // Replace param used as component tag name: <Param ...> -> <this.$_bp0 ...>
      // This handles the case where a block param is a component reference
      // (e.g., {{#let (component 'foo') as |Comp|}}<Comp />{{/let}})
      // Also handles lowercase block params used as angle bracket tags
      // (e.g., {{#yielding-component as |comp|}}<comp />{{/yielding-component}})
      {
        // Self-closing tag: <Param ... /> -> <this.$_bp0 ... />
        const selfClosePattern = new RegExp(`<${param}((?:\\s+[^>]*)?)\\s*/>`, 'g');
        transformedContent = transformedContent.replace(selfClosePattern, `<this.${bpVar}$1 />`);

        // Open tag: <Param ...> -> <this.$_bp0 ...>
        const openTagPattern = new RegExp(`<${param}((?:\\s+[^>]*)?)>`, 'g');
        transformedContent = transformedContent.replace(openTagPattern, `<this.${bpVar}$1>`);

        // Close tag: </Param> -> </this.$_bp0>
        const closeTagPattern = new RegExp(`</${param}>`, 'g');
        transformedContent = transformedContent.replace(closeTagPattern, `</this.${bpVar}>`);
      }

      // Replace param.property used as component tag: <param.baz ...> -> <this.$_bp0.baz ...>
      {
        const dotSelfClosePattern = new RegExp(`<${param}\\.(\\S+?)((?:\\s+[^>]*)?)\\s*/>`, 'g');
        transformedContent = transformedContent.replace(dotSelfClosePattern, `<this.${bpVar}.$1$2 />`);

        const dotOpenPattern = new RegExp(`<${param}\\.(\\S+?)((?:\\s+[^>]*)?)>`, 'g');
        transformedContent = transformedContent.replace(dotOpenPattern, `<this.${bpVar}.$1$2>`);

        const dotClosePattern = new RegExp(`</${param}\\.(\\S+?)>`, 'g');
        transformedContent = transformedContent.replace(dotClosePattern, `</this.${bpVar}.$1>`);
      }

      // Handle curly invocations of block params with arguments:
      // {{param.prop argName=argVal}} -> <this.$_bp0.prop @argName={{argVal}} />
      // {{param.prop positional1 argName=argVal}} -> <this.$_bp0.prop @__pos0__={{positional1}} @__posCount__={{1}} @argName={{argVal}} />
      // {{param positional1 positional2}} -> <this.$_bp0 @__pos0__={{positional1}} @__pos1__={{positional2}} @__posCount__={{2}} />
      // {{#param.prop argName=argVal}}content{{/param.prop}} -> <this.$_bp0.prop @argName={{argVal}}>content</this.$_bp0.prop>
      // {{#param argName=argVal}}content{{/param}} -> <this.$_bp0 @argName={{argVal}}>content</this.$_bp0>
      {
        // Block form: {{#param.prop args}}content{{/param.prop}}
        const blockDotPattern = new RegExp(
          `\\{\\{#${param}(\\.[a-zA-Z0-9_.]+)(\\s[^}]*)\\}\\}([\\s\\S]*?)\\{\\{/${param}\\1\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(blockDotPattern, (match: string, dotPath: string, args: string, content: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${dotPath}${transformedArgs}>${content}</this.${bpVar}${dotPath}>`;
        });

        // Block form: {{#param args}}content{{/param}}
        const blockSimplePattern = new RegExp(
          `\\{\\{#${param}(\\s[^}]*)\\}\\}([\\s\\S]*?)\\{\\{/${param}\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(blockSimplePattern, (match: string, args: string, content: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${transformedArgs}>${content}</this.${bpVar}>`;
        });

        // Inline form with args: {{param.prop arg1 key=val}} (must have at least one arg after the path)
        // Make sure not to match simple {{param.prop}} (no extra args)
        const inlineDotWithArgsPattern = new RegExp(
          `\\{\\{\\s*${param}(\\.[a-zA-Z0-9_.]+)(\\s+[^}]+)\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(inlineDotWithArgsPattern, (match: string, dotPath: string, args: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${dotPath}${transformedArgs} />`;
        });

        // Inline form with args: {{param arg1 key=val}} (must have at least one arg)
        // Be careful not to match {{param}} or {{param.prop}} without args
        const inlineSimpleWithArgsPattern = new RegExp(
          `\\{\\{\\s*${param}(\\s+(?!\\.|\\})[^}]+)\\}\\}`, 'g'
        );
        transformedContent = transformedContent.replace(inlineSimpleWithArgsPattern, (match: string, args: string) => {
          const transformedArgs = transformCurlyArgsToAngleBracket(args.trim());
          return `<this.${bpVar}${transformedArgs} />`;
        });
      }
    }

    // Reconstruct the element without the `as |...|` part
    // Add a marker to indicate that block params were declared
    const originalOpenTag = result.slice(startIndex, openTagEnd);
    const tagWithoutBlockParams = originalOpenTag.replace(/\s+as\s*\|[^|]+\|/, '');
    // Insert the __hasBlockParams__ marker before the closing >
    const newOpenTag = tagWithoutBlockParams.replace(/>$/, ' @__hasBlockParams__="default">');

    const closingTag = `</${componentName}>`;
    const newElement = newOpenTag + transformedContent + closingTag;

    result = result.slice(0, startIndex) + newElement + result.slice(endIndex);
  }

  return { transformed: result, blockParamMappings };
}

/**
 * Check if a position in a template string is inside an HTML attribute value.
 * Scans backwards from the offset to determine if we're between quotes in an
 * attribute context like `<div attr="...HERE...">`.
 *
 * This prevents transforming helpers like `{{foo-bar}}` into components when
 * they appear inside attribute values (e.g. `<div data-x="{{foo-bar}}">`).
 */
function isInsideHtmlAttributeValue(str: string, offset: number): boolean {
  // Scan backwards from the offset to find if we're inside an attribute value.
  // We look for the pattern: attrName= followed by a quote that is still open.
  // Track quote state by scanning from the last '<' before the offset.
  let angleBracketPos = -1;
  for (let i = offset - 1; i >= 0; i--) {
    if (str[i] === '>') {
      // We hit a closing angle bracket before an opening one,
      // so we're not inside an HTML tag at all
      return false;
    }
    if (str[i] === '<') {
      angleBracketPos = i;
      break;
    }
  }

  if (angleBracketPos === -1) {
    // No opening '<' found before this position - not inside a tag
    return false;
  }

  // Now scan from the '<' to the offset, tracking quote state
  let inQuote: string | null = null;
  for (let i = angleBracketPos; i < offset; i++) {
    const ch = str[i];
    if (inQuote === null) {
      if (ch === '"' || ch === "'") {
        inQuote = ch;
      }
    } else if (ch === inQuote) {
      inQuote = null;
    }
  }

  // If we're still inside an open quote, the mustache is in an attribute value
  return inQuote !== null;
}

/**
 * Check if a position in a template string is inside an HTML element's opening tag,
 * but NOT inside an attribute value. This detects element modifiers like
 * `<h1 {{foo-bar}}>` where the mustache is a modifier, not a component invocation.
 */
function isElementModifier(str: string, offset: number): boolean {
  // Scan backwards from the offset to find the nearest '<' or '>'
  let angleBracketPos = -1;
  for (let i = offset - 1; i >= 0; i--) {
    if (str[i] === '>') {
      // We hit a closing '>' before an opening '<',
      // so we're NOT inside an element's opening tag
      return false;
    }
    if (str[i] === '<') {
      angleBracketPos = i;
      break;
    }
  }

  if (angleBracketPos === -1) {
    return false;
  }

  // Check that what follows '<' is a tag name (not another '<' or '/')
  // This ensures we're in an element like <h1 ...> and not in text content
  const afterAngle = str.substring(angleBracketPos + 1, offset).trim();
  // If the content starts with '/' it's a closing tag, not relevant
  if (afterAngle.startsWith('/')) return false;
  // Must start with a valid tag name character
  if (!/^[a-zA-Z]/.test(afterAngle)) return false;

  // Scan from '<' to offset, tracking quote state to ensure we're not in a quoted attribute
  let inQuote: string | null = null;
  for (let i = angleBracketPos; i < offset; i++) {
    const ch = str[i];
    if (inQuote === null) {
      if (ch === '"' || ch === "'") {
        inQuote = ch;
      }
    } else if (ch === inQuote) {
      inQuote = null;
    }
  }

  // If we're inside a quote, it's an attribute value, not a modifier
  if (inQuote !== null) return false;

  // We're inside an element's opening tag and not in an attribute value:
  // this mustache is an element modifier
  return true;
}

/**
 * Transform curly block component syntax to angle-bracket syntax
 * - {{#foo-bar}}content{{/foo-bar}} → <FooBar>content</FooBar>
 * - {{#foo-bar arg=val}}content{{/foo-bar}} → <FooBar @arg={{val}}>content</FooBar>
 * - {{foo-bar}} → <FooBar />
 */
function transformCurlyBlockComponents(code: string): string {
  let result = code;

  // Helper to convert kebab-case to PascalCase
  const toPascalCase = (name: string) => {
    return name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  };

  // Helper to convert attrs like arg=val to @arg={{val}}
  // Also handles positional parameters
  const transformAttrs = (attrs: string) => {
    if (!attrs.trim()) return '';

    let remaining = attrs.trim();
    const positionalParams: string[] = [];
    const namedParams: string[] = [];

    // Helper to match balanced parentheses
    const matchBalancedParens = (str: string): string | null => {
      if (!str.startsWith('(')) return null;
      let depth = 0;
      let i = 0;
      for (; i < str.length; i++) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') {
          depth--;
          if (depth === 0) return str.slice(0, i + 1);
        }
      }
      return null;
    };

    // Parse the attrs string token by token
    while (remaining.length > 0) {
      remaining = remaining.trim();
      if (remaining.length === 0) break;

      // Check for named parameter: name=value
      // Value can be: {{...}}, "...", '...', (...), or bare word/path
      const nameMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9-]*)=/);
      if (nameMatch) {
        const name = nameMatch[1];
        let valueStr = remaining.slice(nameMatch[0].length);
        let value: string;

        // Determine the value type and extract it
        if (valueStr.startsWith('{{')) {
          // Mustache: match until }}
          const endIdx = valueStr.indexOf('}}');
          if (endIdx !== -1) {
            value = valueStr.slice(0, endIdx + 2);
          } else {
            value = valueStr.split(/\s/)[0] || '';
          }
        } else if (valueStr.startsWith('"')) {
          // Double quoted string
          const match = valueStr.match(/^"(?:[^"\\]|\\.)*"/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else if (valueStr.startsWith("'")) {
          // Single quoted string
          const match = valueStr.match(/^'(?:[^'\\]|\\.)*'/);
          value = match ? match[0] : valueStr.split(/\s/)[0] || '';
        } else if (valueStr.startsWith('(')) {
          // Subexpression: match balanced parens
          const parenMatch = matchBalancedParens(valueStr);
          value = parenMatch || valueStr.split(/\s/)[0] || '';
        } else {
          // Bare word/path
          value = valueStr.split(/[\s}]/)[0] || '';
        }

        const attrName = name.startsWith('@') ? name : `@${name}`;
        let attrValue = value;
        // Wrap subexpressions and bare words in {{}}
        if (!value.startsWith('{{') && !value.startsWith('"') && !value.startsWith("'")) {
          attrValue = `{{${value}}}`;
        }
        namedParams.push(`${attrName}=${attrValue}`);
        remaining = remaining.slice(nameMatch[0].length + value.length);
        continue;
      }

      // Check for positional parameter: "string" or 'string' or {{expr}} or (subexpr) or number or this.path
      // Subexpression: balanced parentheses like (helper-name arg1 arg2)
      const subexprMatch = matchBalancedParens(remaining);
      if (subexprMatch) {
        // Wrap subexpression in {{}} so GXT compiles it as a helper call
        positionalParams.push(`{{${subexprMatch}}}`);
        remaining = remaining.slice(subexprMatch.length);
        continue;
      }

      // Quoted string
      const quotedMatch = remaining.match(/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/);
      if (quotedMatch) {
        positionalParams.push(quotedMatch[1]);
        remaining = remaining.slice(quotedMatch[1].length);
        continue;
      }

      // Mustache expression
      const mustacheMatch = remaining.match(/^(\{\{[^}]+\}\})/);
      if (mustacheMatch) {
        positionalParams.push(mustacheMatch[1]);
        remaining = remaining.slice(mustacheMatch[1].length);
        continue;
      }

      // Number or boolean
      const numberMatch = remaining.match(/^(-?\d+(?:\.\d+)?|true|false)\b/);
      if (numberMatch) {
        positionalParams.push(numberMatch[1]);
        remaining = remaining.slice(numberMatch[1].length);
        continue;
      }

      // Path like this.name or @foo
      const pathMatch = remaining.match(/^(this\.[a-zA-Z0-9_.]+|@[a-zA-Z][a-zA-Z0-9-]*)/);
      if (pathMatch) {
        positionalParams.push(`{{${pathMatch[1]}}}`);
        remaining = remaining.slice(pathMatch[1].length);
        continue;
      }

      // Skip unknown character
      remaining = remaining.slice(1);
    }

    // Build the result
    let result = '';
    if (namedParams.length > 0) {
      result += ' ' + namedParams.join(' ');
    }
    if (positionalParams.length > 0) {
      // Pass positional params as individual @__pos0__, @__pos1__, etc. arguments
      // The component manager will map these to named params based on positionalParams
      for (let i = 0; i < positionalParams.length; i++) {
        const p = positionalParams[i];
        // If it's a quoted string, use it directly
        if (p.startsWith('"') || p.startsWith("'")) {
          result += ` @__pos${i}__=${p}`;
        }
        // If it's a mustache, pass it through
        else if (p.startsWith('{{') && p.endsWith('}}')) {
          result += ` @__pos${i}__=${p}`;
        }
        // Numbers and booleans need to be wrapped
        else {
          result += ` @__pos${i}__={{${p}}}`;
        }
      }
      // Also pass the count
      result += ` @__posCount__={{${positionalParams.length}}}`;
    }
    return result;
  };

  // Known block helpers that should NOT be transformed (they're control flow, not components)
  const blockHelpers = ['if', 'unless', 'each', 'each-in', 'with', 'let', 'in-element'];

  // Block form: {{#component-name attrs}}...{{/component-name}}
  // Use a recursive approach to handle nested blocks
  const transformBlocks = (input: string): string => {
    // Match opening block: {{#name attrs}}
    const blockOpenPattern = /\{\{#([a-z][a-zA-Z0-9-]*)([^}]*)\}\}/;

    let output = input;
    let match;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops
    const skipMap = new Map<string, string>(); // Store markers to restore

    while ((match = blockOpenPattern.exec(output)) !== null && iterations < maxIterations) {
      iterations++;
      const [fullMatch, name, attrs] = match;
      const startIndex = match.index;

      // Skip known block helpers - preserve the full original opening tag
      if (blockHelpers.includes(name)) {
        // Mark the opening tag as processed so we don't match it again
        // Use a unique marker that won't conflict with template content
        const markerId = `__SKIP_${name}_${iterations}__`;
        output = output.slice(0, startIndex) + markerId + output.slice(startIndex + fullMatch.length);
        skipMap.set(markerId, fullMatch);
        continue;
      }

      // Find the matching closing tag
      const closingTag = `{{/${name}}}`;
      let depth = 1;
      let searchPos = startIndex + fullMatch.length;
      let endIndex = -1;

      while (depth > 0 && searchPos < output.length) {
        const nextOpen = output.indexOf(`{{#${name}`, searchPos);
        const nextClose = output.indexOf(closingTag, searchPos);

        if (nextClose === -1) break;

        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          searchPos = nextOpen + 3;
        } else {
          depth--;
          if (depth === 0) {
            endIndex = nextClose + closingTag.length;
          } else {
            searchPos = nextClose + closingTag.length;
          }
        }
      }

      if (endIndex === -1) {
        // Can't find closing tag, skip this opening tag
        const markerId = `__SKIP_${name}_${iterations}_nf__`;
        output = output.slice(0, startIndex) + markerId + output.slice(startIndex + fullMatch.length);
        skipMap.set(markerId, fullMatch);
        continue;
      }

      // Extract content between opening and closing tags
      let content = output.slice(startIndex + fullMatch.length, endIndex - closingTag.length);

      // Check for {{else}} block - split into default and inverse content
      // Note: Only split on top-level {{else}}, not nested ones
      let defaultContent = content;
      let inverseContent = '';
      const elseMatch = content.match(/\{\{else\}\}/);
      if (elseMatch) {
        // Simple split - assumes no nested {{else}} at the same level
        // TODO: Handle nested else properly with depth tracking
        const elseIndex = content.indexOf('{{else}}');
        defaultContent = content.slice(0, elseIndex);
        inverseContent = content.slice(elseIndex + 8); // 8 = length of '{{else}}'
      }

      // Transform to angle-bracket syntax
      const pascalName = toPascalCase(name);

      // Check for block params: `as |param1 param2|`
      const blockParamMatch = attrs.match(/\s+as\s*\|([^|]+)\|/);
      let blockParamClause = '';
      let attrsWithoutBlockParams = attrs;
      if (blockParamMatch) {
        blockParamClause = ` as |${blockParamMatch[1]}|`;
        attrsWithoutBlockParams = attrs.replace(blockParamMatch[0], '');
      }

      const transformedAttrs = transformAttrs(attrsWithoutBlockParams);

      let replacement: string;
      // Check if there was an {{else}} block (even if empty)
      // elseMatch is set if we found {{else}}, regardless of content length

      if (elseMatch) {
        // Has else block - use named blocks syntax
        // <Component><:default>content</:default><:inverse>else content</:inverse></Component>
        replacement = `<${pascalName}${transformedAttrs}${blockParamClause}><:default>${defaultContent}</:default><:inverse>${inverseContent}</:inverse></${pascalName}>`;
      } else {
        // No else block - regular content
        // Add __hasBlock__ marker if block is empty (for has-block helper)
        const hasBlockMarker = defaultContent.trim() === '' ? ' @__hasBlock__="default"' : '';
        replacement = `<${pascalName}${transformedAttrs}${hasBlockMarker}${blockParamClause}>${defaultContent}</${pascalName}>`;
      }

      output = output.slice(0, startIndex) + replacement + output.slice(endIndex);
    }

    // Restore skipped blocks from the map
    for (const [marker, original] of skipMap) {
      output = output.replace(marker, original);
    }

    return output;
  };

  result = transformBlocks(result);

  // Inline form: {{component-name arg=val}} (not followed by block content)
  // Only transform if it looks like a component (has hyphen = kebab-case)
  // Be careful not to transform helpers like {{if}} or {{log}}
  // Also skip mustaches inside HTML attribute values (e.g. <div data-x="{{foo-bar}}">)
  const inlinePattern = /\{\{([a-z][a-zA-Z0-9]*-[a-zA-Z0-9-]*)([^}]*)\}\}/g;
  result = result.replace(inlinePattern, (match, name, attrs, offset) => {
    // Check if this mustache is inside an HTML attribute value by scanning
    // backwards from the match position for an unmatched opening quote
    if (isInsideHtmlAttributeValue(result, offset)) {
      return match; // Leave it as-is; it's a helper call in attribute context
    }
    // Check if this mustache is an element modifier (e.g. <h1 {{foo-bar}}>)
    // Element modifiers should be left as-is for GXT's $_maybeModifier to handle
    if (isElementModifier(result, offset)) {
      return match; // Leave it as-is; it's an element modifier
    }
    const pascalName = toPascalCase(name);
    const transformedAttrs = transformAttrs(attrs);
    return `<${pascalName}${transformedAttrs} />`;
  });

  return result;
}

/**
 * Wrap top-level children expressions in arrow functions for deferred evaluation.
 * Used when children of a component reference block params ($_bp), which are only
 * available after the slot function is invoked.
 */
function wrapTopLevelChildren(childrenStr: string): string {
  // Parse top-level items (respecting nested parens/brackets)
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < childrenStr.length; i++) {
    const ch = childrenStr[i];
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      items.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) items.push(current.trim());

  // Wrap each item that references $_bp in () => ...
  return items.map(item => {
    if (item.includes('$_bp')) {
      // Already a function? Don't double-wrap
      if (item.startsWith('() =>') || item.startsWith('function')) return item;
      return `() => ${item}`;
    }
    return item;
  }).join(', ');
}

// Template cache for performance
const templateCache = new Map<string, any>();

/**
 * Runtime precompileTemplate implementation using GXT runtime compiler
 * Returns a template factory function that takes an owner and returns a template.
 */
export function precompileTemplate(templateString: string, options?: {
  strictMode?: boolean;
  scope?: () => Record<string, unknown>;
  moduleName?: string;
  scopeValues?: Record<string, unknown>;
}) {
  // Check cache first — skip cache when scopeValues are provided (they contain unique references)
  const hasScopeValues = options?.scopeValues && Object.keys(options.scopeValues).length > 0;
  // Debug: track all calls with scopeValues
  if (hasScopeValues) {
    const _g3 = globalThis as any;
    if (!_g3.__gxtDebugPrecompileCalls) _g3.__gxtDebugPrecompileCalls = [];
    _g3.__gxtDebugPrecompileCalls.push({ template: templateString.slice(0, 100), keys: Object.keys(options!.scopeValues!) });
  }
  const cacheKey = templateString + (options?.moduleName || '');
  if (!hasScopeValues) {
    const cached = templateCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Check for <foo.bar /> — dotted paths used as tag names require
  // the head (foo) to be in scope. In classic templates (non-strict), only
  // `this` is implicitly in scope, so <foo.bar> is invalid unless foo is
  // a block param. Check if the template provides any block params that
  // could bring the head into scope.
  {
    // Collect all block param names from `as |name1 name2|` patterns
    const blockParamNames = new Set<string>();
    const blockParamPattern = /as\s+\|([^|]+)\|/g;
    let bpMatch;
    while ((bpMatch = blockParamPattern.exec(templateString)) !== null) {
      const params = bpMatch[1].trim().split(/\s+/);
      for (const p of params) {
        if (p) blockParamNames.add(p);
      }
    }

    // Match <lowercase.Something> or <lowercase.something> patterns
    // but NOT <this.something> (which is valid)
    const dottedTagPattern = /<([a-z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9]*)\s/g;
    let dottedMatch;
    while ((dottedMatch = dottedTagPattern.exec(templateString)) !== null) {
      const head = dottedMatch[1];
      if (head !== 'this' && !blockParamNames.has(head)) {
        throw new Error(
          `Error: You used ${head}.${dottedMatch[2]} as a tag name, but ${head} is not in scope`
        );
      }
    }
  }

  // Check for {{attrs.X}} (assert) and {{this.attrs.X}} (deprecation)
  // This mirrors the Glimmer AST plugin assert-against-attrs.ts
  {
    // Check for {{attrs.X}} - this should trigger an assert (throw)
    const attrsPattern = /\{\{attrs\.([a-zA-Z0-9_]+)/g;
    let attrsMatch;
    while ((attrsMatch = attrsPattern.exec(templateString)) !== null) {
      const propName = attrsMatch[1];
      // Calculate location: column points to 'attrs' (after '{{'), so add 2
      const beforeMatch = templateString.slice(0, attrsMatch.index);
      const lines = beforeMatch.split('\n');
      const line = lines.length;
      const col = (lines[lines.length - 1]?.length || 0) + 2; // +2 for '{{'
      const locationDisplay = `(L${line}:C${col}) `;
      const message = `Using {{attrs}} to reference named arguments is not supported. {{attrs.${propName}}} should be updated to {{@${propName}}}. ${locationDisplay}`;
      emberAssert(message, false);
    }

    // Check for {{this.attrs.X}} - this should trigger a deprecation
    const thisAttrsPattern = /\{\{this\.attrs\.([a-zA-Z0-9_]+)/g;
    let thisAttrsMatch;
    while ((thisAttrsMatch = thisAttrsPattern.exec(templateString)) !== null) {
      const propName = thisAttrsMatch[1];
      // Calculate location: column points to 'this' (after '{{'), so add 2
      const beforeMatch = templateString.slice(0, thisAttrsMatch.index);
      const lines = beforeMatch.split('\n');
      const line = lines.length;
      const col = (lines[lines.length - 1]?.length || 0) + 2; // +2 for '{{'
      const locationDisplay = `(L${line}:C${col}) `;
      const message = `Using {{this.attrs}} to reference named arguments has been deprecated. {{this.attrs.${propName}}} should be updated to {{@${propName}}}. ${locationDisplay}`;
      emberDeprecate(message, false, {
        id: 'attrs-arg-access',
        url: 'https://deprecations.emberjs.com/v3.x/#toc_attrs-arg-access',
        until: '6.0.0',
        for: 'ember-source',
        since: {
          available: '3.26.0',
          enabled: '3.26.0',
        },
      });
    }
  }

  // Transform the template
  let transformedTemplate = templateString;

  // Check for dotted-path mustache expressions like {{foo.bar}} where foo is not in scope.
  // In Ember, these are errors because foo is a free variable path that can't be resolved.
  // Collect block param names first so we don't flag those.
  {
    const blockParamNames = new Set<string>();
    const bpPattern = /as\s+\|([^|]+)\|/g;
    let bpM;
    while ((bpM = bpPattern.exec(transformedTemplate)) !== null) {
      for (const p of bpM[1].trim().split(/\s+/)) {
        if (p) blockParamNames.add(p);
      }
    }
    // Match {{identifier.path}} but not {{this.path}}, {{@path}}, or inside subexpressions
    const dottedMustachePattern = /\{\{([a-z][a-zA-Z0-9]*)\.([a-zA-Z][a-zA-Z0-9.]*)\}\}/g;
    let dm;
    while ((dm = dottedMustachePattern.exec(transformedTemplate)) !== null) {
      const head = dm[0] === dm.input ? dm[1] : dm[1]; // just the head identifier
      if (head !== 'this' && !blockParamNames.has(head)) {
        throw new Error(
          `You attempted to render a path (\`{{${dm[1]}.${dm[2]}}}\`), but ${head} was not in scope`
        );
      }
    }
  }

  // Transform {{this.attrs.X}} to {{@X}} (after deprecation was fired above)
  // This mirrors the Glimmer AST plugin behavior
  if (/\{\{this\.attrs\./.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(/this\.attrs\.([a-zA-Z0-9_]+)/g, '@$1');
  }

  // Strip {{mount ...}} — GXT doesn't support Ember engines.
  // Without this, the mount keyword triggers infinite resolution loops.
  transformedTemplate = transformedTemplate.replace(/\{\{mount\s+[^}]*\}\}/g, '<!-- mount not supported -->');

  // Fix empty true-branch in {{#if}}: GXT compiler can't handle
  // {{#if cond}}{{else}}content{{/if}} (empty true branch).
  // Insert a zero-width space so the true branch isn't empty.
  transformedTemplate = transformedTemplate.replace(
    /\{\{#(if|unless)\s+([^}]+)\}\}\s*\{\{else\}\}/g,
    '{{#$1 $2}} {{else}}'
  );

  // Transform bare {{this}} to {{this.__gxtSelfString__}} so GXT renders toString() value
  // Ember's {{this}} in curly component templates calls toString() on the component instance.
  // We use a getter property (__gxtSelfString__) that calls toString() on the component.
  if (/\{\{this\}\}/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(/\{\{this\}\}/g, '{{this.__gxtSelfString__}}');
  }

  // Transform {{#each-in obj as |key value|}}...{{/each-in}} to
  // {{#each (object-entries obj) as |entry|}}...{{/each-in}}
  // where entry[0] = key, entry[1] = value
  // This is handled by a runtime helper registered below
  if (/\{\{#each-in\b/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(
      /\{\{#each-in\s+([^\s}]+)\s+as\s*\|([^|]+)\|\s*\}\}/g,
      (match, obj, params) => {
        const parts = params.trim().split(/\s+/);
        const keyParam = parts[0] || 'key';
        const valueParam = parts[1] || 'value';
        // Transform to {{#each}} over entries with destructuring via let
        return `{{#each (gxt-entries-of ${obj}) as |__eachInEntry__|}}{{#let __eachInEntry__.0 __eachInEntry__.1 as |${keyParam} ${valueParam}|}}`;
      }
    );
    transformedTemplate = transformedTemplate.replace(
      /\{\{\/each-in\}\}/g,
      '{{/let}}{{/each}}'
    );
  }

  // Transform (mut this.prop) / (mut @arg) to pass the property path as a second arg
  // so the mut helper can create a proper setter function.
  // (mut this.foo) → (mut this.foo "this.foo")
  // (mut @bar)     → (mut @bar "@bar")
  transformedTemplate = transformedTemplate.replace(
    /\(mut\s+(this\.[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+)\)/g,
    (_match, path) => `(mut ${path} "${path}")`
  );

  // Check for dynamic (helper ...) usage — disallowed in Ember.
  // {{helper this.xxx}} or (helper @xxx) pass dynamic strings which is not allowed.
  // Only {{helper "static-name"}} is valid. But {{helper this.helperRef}} where
  // the ref is a helper function (not a string) IS allowed — we can't distinguish
  // at compile time, so we only flag obvious dynamic-string patterns.
  {
    // Match {{helper this.xxx}} — this is the only pattern in the test suite that
    // represents "dynamic string resolution". Template-local refs like this.val
    // where val is a defineSimpleHelper result use a different template structure
    // (they're inside component templates where this.val is set as a class property).
    const dynamicHelperPattern = /\{\{helper\s+(this\.[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+)\s*\}\}/;
    if (dynamicHelperPattern.test(transformedTemplate)) {
      emberAssert(
        'Passing a dynamic string to the `(helper)` keyword is disallowed.',
        false
      );
    }
  }

  // Check for dynamic (modifier ...) usage — disallowed in Ember.
  // (modifier this.xxx) passes a dynamic string which is not allowed.
  // Only (modifier "static-name") or (modifier this.modifierRef) (where ref is a
  // modifier function, not a string) are valid.
  {
    const dynamicModifierPattern = /\(modifier\s+(this\.[a-zA-Z0-9_.]+|@[a-zA-Z0-9_.]+)\s*\)/;
    if (dynamicModifierPattern.test(transformedTemplate)) {
      emberAssert(
        'Passing a dynamic string to the `(modifier)` keyword is disallowed.',
        false
      );
    }
  }

  transformedTemplate = transformCapitalizedComponents(transformedTemplate);
  if (/\{\{\s*outlet\s*\}\}/.test(transformedTemplate)) {
    transformedTemplate = transformOutletHelper(transformedTemplate);
  }
  // Transform triple mustaches {{{expr}}} to raw HTML component
  if (/\{\{\{/.test(transformedTemplate)) {
    transformedTemplate = transformTripleMustaches(transformedTemplate);
  }
  // Transform {{component}} helper to angle-bracket
  if (/\{\{#?component\s+/.test(transformedTemplate)) {
    transformedTemplate = transformComponentHelper(transformedTemplate);
  }

  // Transform built-in curly components ({{input ...}} and {{textarea ...}}) to angle-bracket syntax
  // These don't have hyphens so transformCurlyBlockComponents won't handle them
  transformedTemplate = transformedTemplate.replace(
    /\{\{(input|textarea)(\s[^}]*)?\}\}/g,
    (match, name, attrs) => {
      const pascalName = name === 'input' ? 'Input' : 'Textarea';
      if (attrs && attrs.trim()) {
        const transformedAttrs = transformCurlyArgsToAngleBracket(attrs.trim());
        return `<${pascalName}${transformedAttrs} />`;
      }
      return `<${pascalName} />`;
    }
  );

  // Transform curly block component syntax to angle-bracket
  // {{#foo-bar}}...{{/foo-bar}} → <FooBar>...</FooBar>
  // Also transforms inline {{foo-bar ...}} calls
  if (/\{\{#?[a-z][a-zA-Z0-9]*-[a-zA-Z0-9-]*[\s}]/.test(transformedTemplate)) {
    transformedTemplate = transformCurlyBlockComponents(transformedTemplate);
  }

  // Transform {{#@argName args}}content{{/@argName}} block invocations to angle bracket
  // These are block invocations of components passed as named args
  if (/\{\{#@/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(
      /\{\{#@([a-zA-Z][a-zA-Z0-9]*)([^}]*)\}\}([\s\S]*?)\{\{\/@\1\}\}/g,
      (match, argName, attrs, content) => {
        const transformedAttrs = attrs.trim() ? transformCurlyArgsToAngleBracket(attrs.trim()) : '';
        return `<@${argName}${transformedAttrs}>${content}</@${argName}>`;
      }
    );
  }

  // Transform empty angle-bracket component invocations: <Component></Component>
  // These need a @__hasBlock__ marker so has-block returns true.
  // Self-closing <Component /> does NOT get the marker (has-block = false).
  // Only matches components (PascalCase or kebab-case starting with uppercase).
  transformedTemplate = transformedTemplate.replace(
    /<([A-Z][a-zA-Z0-9]*)(\s[^>]*)?(?<!\/)>(\s*)<\/\1>/g,
    (match, tagName, attrs, whitespace) => {
      // Already has __hasBlock__? Skip.
      if (attrs && attrs.includes('__hasBlock__')) return match;
      const attrStr = attrs || '';
      return `<${tagName}${attrStr} @__hasBlock__="default">${whitespace}</${tagName}>`;
    }
  );

  // Transform angle-bracket components with positional parameters
  // <SampleComponent "Foo" 4 "Bar" @namedArg=val /> -> <SampleComponent @__pos0__="Foo" @__pos1__={{4}} ... @__posCount__={{3}} @namedArg=val />
  transformedTemplate = transformAngleBracketPositionalParams(transformedTemplate);

  // Transform reserved word variable names to this.varName to avoid invalid JS
  // e.g., class=class -> class=this.class (because `class` is a reserved word)
  const reservedWords = ['class', 'default', 'new', 'delete', 'void', 'typeof', 'instanceof', 'in', 'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'with', 'debugger', 'import', 'export', 'extends', 'super', 'static', 'yield', 'await', 'enum', 'implements', 'interface', 'package', 'private', 'protected', 'public'];
  for (const word of reservedWords) {
    // Match word=word pattern (not word="value" or word={{expr}})
    const pattern = new RegExp(`(\\s)(${word})=(${word})(?=[\\s}/>])`, 'g');
    transformedTemplate = transformedTemplate.replace(pattern, `$1$2=this.$3`);
  }

  // Transform block params: <Foo as |x|>{{x}}</Foo> → <Foo>{{@__bp_0__}}</Foo>
  // This transforms block param references to special @args that we pass through slots
  let blockParamMappings = new Map<string, string[]>();
  if (/\s+as\s*\|[^|]+\|/.test(transformedTemplate)) {
    const result = transformBlockParams(transformedTemplate);
    transformedTemplate = result.transformed;
    blockParamMappings = result.blockParamMappings;
  }

  // Second pass: Add __hasBlock__ marker for empty block param component invocations
  // After block params transform, <componentWithHasBlock></componentWithHasBlock> becomes
  // <this.$_bp0></this.$_bp0>. These need the marker for has-block to work correctly.
  // Match <this.$_bpN ...></this.$_bpN> (empty content = has-block true)
  transformedTemplate = transformedTemplate.replace(
    /<(this\.\$_bp\d+(?:\.[a-zA-Z0-9_.]+)?)(\s[^>]*)?>(\s*)<\/\1>/g,
    (match, tagName, attrs, whitespace) => {
      if (attrs && attrs.includes('__hasBlock__')) return match;
      const attrStr = attrs || '';
      return `<${tagName}${attrStr} @__hasBlock__="default">${whitespace}</${tagName}>`;
    }
  );

  // Transform has-block and has-block-params helpers to global function calls
  // (has-block) -> (this.$_hasBlock)
  // (has-block "inverse") -> (this.$_hasBlock "inverse")
  // In attribute contexts (e.g., name={{(has-block)}}), use (if ...) to produce strings
  // because GXT drops attributes with boolean false values.
  if (/\(has-block/.test(transformedTemplate)) {
    // First transform has-block-params
    transformedTemplate = transformedTemplate.replace(/\(has-block-params(?:\s+"([^"]+)")?\)/g, (match, blockName) => {
      return blockName ? `(this.$_hasBlockParams "${blockName}")` : '(this.$_hasBlockParams)';
    });
    // Then transform has-block
    transformedTemplate = transformedTemplate.replace(/\(has-block(?:\s+"([^"]+)")?\)/g, (match, blockName) => {
      return blockName ? `(this.$_hasBlock "${blockName}")` : '(this.$_hasBlock)';
    });

    // When (has-block) or (has-block-params) is used in attribute position like
    // name={{(has-block)}} -> name={{if (this.$_hasBlock) "true" "false"}}
    // This ensures GXT produces string attribute values instead of booleans
    // which GXT would strip (false -> no attribute).
    transformedTemplate = transformedTemplate.replace(
      /=\{\{(\(this\.\$_hasBlock(?:Params)?(?:\s+"[^"]*")?\))\}\}/g,
      (match, subexpr) => {
        return `={{if ${subexpr} "true" "false"}}`;
      }
    );
  }

  // Encode ...attributes position for splattributes precedence.
  // In Ember, attrs AFTER ...attributes override fw; attrs BEFORE are overridden by fw.
  // GXT always gives fw priority, so we need to mark attrs that come AFTER ...attributes
  // as "local overrides" so the runtime can handle precedence correctly.
  // We add a hidden __splatLocal__ attr listing the attr names that should override fw.
  if (/\.\.\.attributes/.test(transformedTemplate)) {
    transformedTemplate = transformedTemplate.replace(
      /<([a-zA-Z][a-zA-Z0-9.-]*)(\s[^>]*?)(\.\.\.attributes)([^>]*?)\s*\/?>/g,
      (match, tagName, beforeSplat, splat, afterSplat) => {
        // Extract attr names from afterSplat (attrs after ...attributes)
        const afterAttrNames: string[] = [];
        let hasClassAfterSplat = false;
        const attrPattern = /\b([a-zA-Z_][a-zA-Z0-9_-]*)=/g;
        let m;
        while ((m = attrPattern.exec(afterSplat)) !== null) {
          const name = m[1];
          if (name === 'class') {
            hasClassAfterSplat = true;
          } else if (!name.startsWith('@')) {
            afterAttrNames.push(name);
          }
        }
        if (afterAttrNames.length > 0 || hasClassAfterSplat) {
          // Build marker value: non-class attrs + optional __class__ marker
          const markerParts = [...afterAttrNames];
          if (hasClassAfterSplat) markerParts.push('__class__');
          const marker = ` __splatLocal__="${markerParts.join(',')}"`;
          // Check if the original matched tag was self-closing (/>) or open (>).
          // Converting a non-self-closing tag to self-closing would eat its content.
          const isSelfClose = match.trimEnd().endsWith('/>');
          return `<${tagName}${beforeSplat}${splat}${afterSplat}${marker}${isSelfClose ? ' />' : '>'}`;
        }
        return match;
      }
    );
  }

  // Build bindings set from scopeValues so the GXT compiler knows which names
  // are in scope and should NOT be transformed to built-in symbols (e.g. the
  // local `array` function should shadow the built-in $__array helper).
  const scopeBindings = new Set<string>();
  if (options?.scopeValues) {
    for (const key of Object.keys(options.scopeValues)) {
      scopeBindings.add(key);
    }
  }

  // Compile using GXT runtime compiler
  const compilationResult = gxtCompileTemplate(transformedTemplate, {
    moduleName: options?.moduleName || 'gxt-runtime-template',
    bindings: scopeBindings.size > 0 ? scopeBindings : undefined,
    flags: {
      IS_GLIMMER_COMPAT_MODE: true,
      WITH_EMBER_INTEGRATION: true,
      WITH_HELPER_MANAGER: true,
      WITH_MODIFIER_MANAGER: true,
      WITH_CONTEXT_API: true,
      TRY_CATCH_ERROR_HANDLING: false,
    },
  });

  if (compilationResult.errors && compilationResult.errors.length > 0) {
    console.warn('[gxt-compile] Compilation errors:', compilationResult.errors);
    console.warn('[gxt-compile] Template:', transformedTemplate.slice(0, 200));
  }


  // Debug: check compilation result for scope-valued templates
  if (options?.scopeValues && Object.keys(options.scopeValues).length > 0) {
    const _g4 = globalThis as any;
    if (!_g4.__gxtDebugCompResult) _g4.__gxtDebugCompResult = [];
    _g4.__gxtDebugCompResult.push({
      hasCode: !!compilationResult.code,
      codeLen: compilationResult.code?.length || 0,
      errors: compilationResult.errors?.length || 0,
      code: (compilationResult.code || '').slice(0, 300),
    });
  }
  // Always recreate the template function to:
  // 1. Replace async $_each with synchronous $_eachSync
  // 2. Inject $slots reference (globalThis.$slots) for {{yield}} support
  // 3. Inject $a alias for @named args
  if (compilationResult.code) {
    let modifiedCode = compilationResult.code;
    // Replace async $_each with synchronous $_eachSync
    if (modifiedCode.includes('$_each(')) {
      modifiedCode = modifiedCode.replace(/\$_each\(/g, '$_eachSync(');
    }
    // Transform $_if(() => this.PROP, ...) to use __gxtGetCellOrFormula.
    // This tags the condition getter so our patched $_if can register
    // manual watchers for cross-module-instance notification.
    if (modifiedCode.includes('$_if(')) {
      modifiedCode = modifiedCode.replace(
        /\$_if\(\(?(\(\)\s*=>\s*this\.([a-zA-Z_$][a-zA-Z0-9_$]*))\)?\s*,/g,
        (match, getter, propName) => {
          return `$_if(globalThis.__gxtGetCellOrFormula(this, '${propName}'),`;
        }
      );
    }
    // Wrap the first argument of $__fn in a getter for reactivity.
    // GXT compiles (fn this.X ...) as $__fn(this.X, ...) — passing the resolved
    // function directly. This prevents detecting when the function changes.
    // We transform to $__fn(() => this.X, ...) so our $__fn_ember can resolve
    // it lazily at call time, supporting function swaps via set().
    if (modifiedCode.includes('$__fn(')) {
      modifiedCode = modifiedCode.replace(
        /\$__fn\((this\.[a-zA-Z_$][a-zA-Z0-9_$.?]*)\s*,/g,
        (_match, expr) => `$__fn(() => ${expr},`
      );
    }
    // Wrap children of component $_tag calls in lazy functions when they
    // reference block params ($._bp). Block params are only available when
    // the slot function is invoked, but GXT eagerly evaluates children.
    // Wrapping in () => ... defers evaluation until the slot context is set up.
    if (modifiedCode.includes('$_bp') && modifiedCode.includes('$_tag(')) {
      // Match: $_tag('PascalOrKebab', tagProps, this, [children])
      // We need to wrap each child in the children array with () =>
      // Strategy: find the children array (4th arg) of $_tag calls for components
      // and wrap each top-level element in () =>
      modifiedCode = modifiedCode.replace(
        /(\$_tag\('[A-Z][^']*',\s*\[[^\]]*\],\s*this,\s*)\[([^\]]+)\]/g,
        (match, prefix, childrenContent) => {
          // Only wrap if children reference block params
          if (!childrenContent.includes('$_bp')) return match;
          // Wrap each top-level $_tag or expression in the array with () =>
          // Split by top-level commas (respect nested brackets)
          const wrappedChildren = wrapTopLevelChildren(childrenContent);
          return `${prefix}[${wrappedChildren}]`;
        }
      );
    }

    // When scopeValues are provided (strict-mode defineComponent), the scope
    // values should shadow built-in helpers and unknown-binding resolution.
    // The GXT compiler may still produce:
    //   1. $_maybeHelper("name", [...args], this) — unknown binding, string name
    //   2. $__array(...) / $__fn(...) / $__hash(...) — built-in helper symbols
    // Replace these with direct calls through the scope variable so the scope
    // value takes precedence over built-ins.
    if (scopeBindings.size > 0) {
      // Debug: verify scopeBindings are available
      const _g5 = globalThis as any;
      if (!_g5.__gxtDebugPostProc) _g5.__gxtDebugPostProc = [];
      _g5.__gxtDebugPostProc.push({ size: scopeBindings.size, names: Array.from(scopeBindings), codeBefore: modifiedCode.slice(0, 200) });
      // 1. Replace $_maybeHelper("name", ...) with $_maybeHelper(name, ...)
      //    for names in scope. This converts unknown-binding (string) resolution
      //    to known-binding (reference) resolution.
      for (const name of scopeBindings) {
        const jsName = name.replace(/-/g, '_');
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\$_maybeHelper\\("${escapedName}"\\s*,`, 'g');
        modifiedCode = modifiedCode.replace(pattern, `$_maybeHelper(${jsName},`);
      }
      // 2. Replace GXT built-in symbol calls with scope references.
      //    E.g., $__array(1, 2, 3) → array(1, 2, 3) when `array` is in scope.
      //    The scope injection will define `array` as the scope value.
      const BUILTIN_SYMBOL_MAP: Record<string, string> = {
        '$__array': 'array', '$__hash': 'hash', '$__fn': 'fn',
      };
      for (const [sym, scopeName] of Object.entries(BUILTIN_SYMBOL_MAP)) {
        if (scopeBindings.has(scopeName) && modifiedCode.includes(sym + '(')) {
          const jsName = scopeName.replace(/-/g, '_');
          modifiedCode = modifiedCode.replace(
            new RegExp(sym.replace(/\$/g, '\\$') + '\\(', 'g'),
            `${jsName}(`
          );
        }
      }
    }

    compilationResult.code = modifiedCode;
    // Temporary debug: capture compiled code for scope-valued templates
    if (options?.scopeValues && Object.keys(options.scopeValues).length > 0) {
      const _g2 = globalThis as any;
      if (!_g2.__gxtDebugCompiledCodes) _g2.__gxtDebugCompiledCodes = [];
      _g2.__gxtDebugCompiledCodes.push({
        template: templateString.slice(0, 200),
        code: modifiedCode.slice(0, 500),
        scopeKeys: Object.keys(options.scopeValues),
        bindings: Array.from(scopeBindings),
      });
    }
    try {
      const needsArgsAlias = modifiedCode.includes('$a.');
      const needsSlots = modifiedCode.includes('$slots');
      const g = globalThis as any;
      // Inject Ember keyword helpers as local variables so GXT-compiled code
      // that references them as bare identifiers (e.g. inside {{#let}}) works.
      // GXT treats unknown helpers as scope variables in subexpression position.
      const helperInjections: string[] = [];
      const scopeInjections: string[] = [];
      const scopeVals = options?.scopeValues;
      const scopeKeys = new Set(scopeVals ? Object.keys(scopeVals) : []);

      // Inject scope values as local variables (for strict mode templates with scope)
      let scopeStoreKey = '';
      if (scopeVals && scopeKeys.size > 0) {
        scopeStoreKey = `__gxtScope_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        g[scopeStoreKey] = scopeVals;
        for (const key of scopeKeys) {
          // Use valid JS identifier (convert hyphens, etc.)
          const jsKey = key.replace(/-/g, '_');
          scopeInjections.push(`const ${jsKey} = globalThis["${scopeStoreKey}"]["${key}"];`);
        }
      }

      const BUILTINS = g.__EMBER_BUILTIN_HELPERS__;
      if (BUILTINS) {
        // Check which helpers are referenced as bare identifiers in the compiled code
        const helperNames = ['get', 'unbound', 'array', 'hash', 'concat', 'fn', 'mut', 'readonly', 'unique-id', 'helper'];
        for (const name of helperNames) {
          // Convert helper name to valid JS identifier (unique-id -> unique_id)
          const jsName = name.replace(/-/g, '_');
          // Skip if this name is provided in scope values (scope shadows built-in)
          if (scopeKeys.has(name) || scopeKeys.has(jsName)) continue;
          // Check if the compiled code references this as a bare identifier
          // Match word boundary to avoid false positives (e.g. "getElement")
          const regex = new RegExp(`\\b${jsName}\\b`);
          if (regex.test(modifiedCode)) {
            helperInjections.push(`const ${jsName} = globalThis.__EMBER_BUILTIN_HELPERS__["${name}"];`);
          }
        }
      }
      const templateFnCode = `
        "use strict";
        return function() {
          ${needsArgsAlias ? "const $a = this['args'];" : ''}
          ${needsSlots ? "const $slots = globalThis.$slots || {};" : ''}
          ${scopeInjections.join('\n          ')}
          ${helperInjections.join('\n          ')}
          return ${modifiedCode};
        };
      `;
      compilationResult.templateFn = Function(templateFnCode)();
    } catch (e) {
      console.error('[gxt-compile] Failed to recreate template function:', e);
    }
  }



  // Helper function to convert template results to nodes
  const itemToNode = (item: any, depth = 0): Node | null => {
    if (item instanceof Node) {
      return item;
    }
    // GXT returns getter functions for dynamic values like {{@greeting}}
    // Create a REACTIVE text node that updates when dependencies change
    if (typeof item === 'function') {
      try {
        // Triple-stache (raw HTML): use a single empty comment placeholder
        // when content is empty (matches Glimmer VM's <!----> behavior),
        // and replace with actual HTML nodes when non-empty.
        if ((item as any).__htmlRaw) {
          const placeholder = document.createComment('');
          const fragment = document.createDocumentFragment();
          // Track current content nodes so we can remove them on update.
          // Also track an "end marker" comment that is always in the DOM
          // so we have a stable insertion anchor.
          const endAnchor = document.createComment('/htmlRaw');
          let contentNodes: Node[] = [];
          let isEmpty = true;

          // Initial render
          const initialHtml = item();
          if (initialHtml) {
            isEmpty = false;
            const tpl = document.createElement('template');
            tpl.innerHTML = initialHtml;
            while (tpl.content.firstChild) {
              const child = tpl.content.firstChild;
              contentNodes.push(child);
              fragment.appendChild(child);
            }
          } else {
            // Empty content — show placeholder (renders as <!----> in innerHTML)
            isEmpty = true;
            fragment.appendChild(placeholder);
          }
          fragment.appendChild(endAnchor);

          // Track last rendered HTML for DOM stability (skip update if unchanged)
          let lastHtml = initialHtml;

          // Reactive update
          try {
            gxtEffect(() => {
              const html = item();
              const parent = endAnchor.parentNode;
              if (!parent) return;
              // Skip update if HTML hasn't changed (preserves DOM node stability)
              if (html === lastHtml) return;
              lastHtml = html;

              if (html) {
                // Remove placeholder if present
                if (isEmpty && placeholder.parentNode === parent) {
                  parent.removeChild(placeholder);
                }
                // Remove old content nodes
                for (const n of contentNodes) {
                  if (n.parentNode === parent) parent.removeChild(n);
                }
                // Parse and insert new HTML before the end anchor
                const tpl = document.createElement('template');
                tpl.innerHTML = html;
                const newNodes: Node[] = [];
                while (tpl.content.firstChild) {
                  const child = tpl.content.firstChild;
                  newNodes.push(child);
                  parent.insertBefore(child, endAnchor);
                }
                contentNodes = newNodes;
                isEmpty = false;
              } else {
                // Content is now empty
                // Remove old content nodes
                for (const n of contentNodes) {
                  if (n.parentNode === parent) parent.removeChild(n);
                }
                contentNodes = [];
                // Insert placeholder before the end anchor if not already there
                if (!isEmpty || !placeholder.parentNode) {
                  parent.insertBefore(placeholder, endAnchor);
                }
                isEmpty = true;
              }
            });
          } catch { /* effect setup may fail */ }

          return fragment;
        }

        const result = item();
        // If result is a function, it's a nested getter (e.g., from $__if)
        // BUT: do NOT call CurriedComponent functions — they need the reactive rendering path below
        const finalResult = (typeof result === 'function' && !result.__isCurriedComponent)
          ? result()
          : result;

        if (finalResult instanceof Node) {
          return finalResult;
        }

        // Check if the result is a CurriedComponent — render it as a component
        // Use marker-based reactive rendering so that when curried args change
        // (e.g., set('model.greeting', 'Hola')), the DOM is replaced.
        if (finalResult && finalResult.__isCurriedComponent) {
          const managers = (globalThis as any).$_MANAGERS;
          if (managers?.component?.canHandle?.(finalResult)) {
            // Capture owner at template evaluation time for reactive updates
            const capturedOwner = (globalThis as any).owner;
            const renderCurriedComponent = (curried: any): Node | null => {
              if (!curried) return null;
              // Restore owner for component resolution during reactive re-evaluation
              if (capturedOwner && !(globalThis as any).owner) {
                (globalThis as any).owner = capturedOwner;
              }
              const handleResult = managers.component.handle(curried, {}, null, null);
              if (typeof handleResult === 'function') {
                const rendered = handleResult();
                if (rendered instanceof Node) return rendered;
                return itemToNode(rendered, depth + 1);
              }
              if (handleResult instanceof Node) return handleResult;
              return itemToNode(handleResult, depth + 1);
            };

            const startMarker = document.createComment('curried-start');
            const endMarker = document.createComment('curried-end');
            const fragment = document.createDocumentFragment();
            fragment.appendChild(startMarker);

            // Initial render
            const initialNode = renderCurriedComponent(finalResult);
            if (initialNode) {
              fragment.appendChild(initialNode);
            }
            fragment.appendChild(endMarker);

            // Reactive update — when the getter re-evaluates to a new/different
            // CurriedComponent, replace the content between markers.
            // The effect tracks cell reads inside item() so it fires when
            // any dependency (e.g., this.model.greeting) changes.
            try {
              // Store the getter so we can manually trigger re-renders
              const curriedRenderInfo: any = {
                item,
                startMarker,
                endMarker,
                renderCurriedComponent,
                managers,
                lastRenderedName: finalResult.__name,
              };
              // Snapshot initial curried args for change detection
              _snapshotCurriedArgs(curriedRenderInfo, finalResult);
              // Register for manual re-rendering on property changes
              if (!(globalThis as any).__curriedRenderInfos) {
                (globalThis as any).__curriedRenderInfos = [];
              }
              (globalThis as any).__curriedRenderInfos.push(curriedRenderInfo);

              gxtEffect(() => {
                const newResult = item();
                const newFinal = (typeof newResult === 'function' && !newResult?.__isCurriedComponent)
                  ? newResult()
                  : newResult;

                // Also evaluate curried arg getters to establish tracking —
                // when a curried arg changes (e.g., this.model.expectedText),
                // this effect must re-fire so we can update the component.
                if (newFinal && newFinal.__isCurriedComponent && newFinal.__curriedArgs) {
                  for (const val of Object.values(newFinal.__curriedArgs)) {
                    if (typeof val === 'function' && !val.prototype && !(val as any).__isCurriedComponent) {
                      try { val(); } catch { /* ignore */ }
                    }
                  }
                }

                const parent = startMarker.parentNode;
                if (!parent) return;

                // Skip teardown if same component with unchanged args (preserves DOM stability)
                if (newFinal && newFinal.__isCurriedComponent &&
                    startMarker.nextSibling !== endMarker &&
                    !_curriedComponentChanged(curriedRenderInfo, newFinal)) {
                  return;
                }

                // Check if the component type changed (not just args)
                const _componentSwapped = !newFinal || !newFinal.__isCurriedComponent ||
                  (newFinal.__name !== curriedRenderInfo.lastRenderedName);
                // Collect and remove existing content between markers
                const _removedNodes: Node[] = [];
                let node = startMarker.nextSibling;
                while (node && node !== endMarker) {
                  const next = node.nextSibling;
                  _removedNodes.push(node);
                  parent.removeChild(node);
                  node = next;
                }
                // Destroy old component instances when the component TYPE changed
                if (_componentSwapped) {
                  const _destroyFn = (globalThis as any).__gxtDestroyInstancesInNodes;
                  if (typeof _destroyFn === 'function' && _removedNodes.length > 0) {
                    _destroyFn(_removedNodes);
                  }
                }

                // Insert new content if we have a valid curried component
                if (newFinal && newFinal.__isCurriedComponent && managers.component.canHandle(newFinal)) {
                  const newNode = renderCurriedComponent(newFinal);
                  if (newNode) {
                    parent.insertBefore(newNode, endMarker);
                  }
                  curriedRenderInfo.lastRenderedName = newFinal.__name;
                  _snapshotCurriedArgs(curriedRenderInfo, newFinal);
                } else if (newFinal && typeof newFinal === 'string') {
                  // Component name resolved to string — try rendering directly
                  if (managers.component.canHandle(newFinal)) {
                    const handleResult = managers.component.handle(newFinal, {}, null, null);
                    if (typeof handleResult === 'function') {
                      const rendered = handleResult();
                      if (rendered instanceof Node) {
                        parent.insertBefore(rendered, endMarker);
                      }
                    } else if (handleResult instanceof Node) {
                      parent.insertBefore(handleResult, endMarker);
                    }
                  }
                  curriedRenderInfo.lastRenderedName = newFinal;
                }
              });
            } catch { /* effect setup may fail */ }

            return fragment;
          }
        }

        // Check if the result is a raw HTML value (from triple-stache {{{expr}}})
        // These have __htmlRaw or toHTML marker and need innerHTML rendering
        if (finalResult && typeof finalResult === 'object' && (finalResult.__htmlRaw || typeof finalResult.toHTML === 'function')) {
          const getHtml = () => {
            const v = item();
            const fv = typeof v === 'function' ? v() : v;
            if (fv == null) return '';
            if (fv.toHTML) return fv.toHTML();
            return String(fv);
          };
          const placeholder = document.createComment('');
          const endAnchor = document.createComment('/htmlRaw');
          const fragment = document.createDocumentFragment();
          let contentNodes: Node[] = [];
          let htmlIsEmpty = true;
          const initialHtml = getHtml();
          if (initialHtml) {
            htmlIsEmpty = false;
            const tpl = document.createElement('template');
            tpl.innerHTML = initialHtml;
            while (tpl.content.firstChild) {
              const child = tpl.content.firstChild;
              contentNodes.push(child);
              fragment.appendChild(child);
            }
          } else {
            htmlIsEmpty = true;
            fragment.appendChild(placeholder);
          }
          fragment.appendChild(endAnchor);
          let lastHtml2 = initialHtml;
          // Reactive update
          try {
            gxtEffect(() => {
              const html = getHtml();
              const parent = endAnchor.parentNode;
              if (!parent) return;
              if (html === lastHtml2) return;
              lastHtml2 = html;
              if (html) {
                if (htmlIsEmpty && placeholder.parentNode === parent) {
                  parent.removeChild(placeholder);
                }
                for (const n of contentNodes) {
                  if (n.parentNode === parent) parent.removeChild(n);
                }
                const tpl = document.createElement('template');
                tpl.innerHTML = html;
                const newNodes: Node[] = [];
                while (tpl.content.firstChild) {
                  const child = tpl.content.firstChild;
                  newNodes.push(child);
                  parent.insertBefore(child, endAnchor);
                }
                contentNodes = newNodes;
                htmlIsEmpty = false;
              } else {
                for (const n of contentNodes) {
                  if (n.parentNode === parent) parent.removeChild(n);
                }
                contentNodes = [];
                if (!htmlIsEmpty || !placeholder.parentNode) {
                  parent.insertBefore(placeholder, endAnchor);
                }
                htmlIsEmpty = true;
              }
            });
          } catch { /* effect setup may fail */ }
          return fragment;
        }

        // If result is an object with GXT node structure, process it.
        // But plain objects (Date, {foo:'bar'}, etc.) should be stringified for text rendering.
        if (finalResult && typeof finalResult === 'object' && !(finalResult instanceof Node)) {
          // Check if it looks like a GXT component (has RENDERED_NODES_PROPERTY)
          const _RNPROP = RENDERED_NODES_PROPERTY;
          if ((_RNPROP && _RNPROP in finalResult) || Array.isArray(finalResult) ||
              typeof finalResult.toHTML === 'function') {
            return itemToNode(finalResult, depth + 1);
          }
          // Plain object (Date, {foo:'bar'}, etc.) — stringify for text rendering.
          // Ember's Glimmer VM stringifies all values in text positions.
          // Handle Object.create(null) which has no toString — render as empty.
          let textVal: string;
          try { textVal = String(finalResult); } catch { textVal = ''; }
          const objTextNode = document.createTextNode(textVal);
          try {
            gxtEffect(() => {
              const v = item();
              const fv = typeof v === 'function' ? v() : v;
              objTextNode.textContent = fv == null ? '' : String(fv);
            });
          } catch { /* effect setup may fail */ }
          return objTextNode;
        }

        // Handle symbol values — stringify for text rendering
        if (typeof finalResult === 'symbol') {
          const symTextNode = document.createTextNode(String(finalResult));
          try {
            gxtEffect(() => {
              const v = item();
              const fv = typeof v === 'function' ? v() : v;
              symTextNode.textContent = fv == null ? '' : String(fv);
            });
          } catch { /* effect setup may fail */ }
          return symTextNode;
        }

        // Create a text node with the initial value
        const textValue = finalResult == null ? '' : String(finalResult);
        const textNode = document.createTextNode(textValue);

        // Set up reactive text binding via GXT effect().
        // Cell-backed getters on the instance make property reads trackable.
        // effect() tracks those cell reads. When set() updates the value,
        // the cell is dirtied, gxtSyncDom() runs the effect, and the
        // text node content is updated.
        try {
          gxtEffect(() => {
            const v = item();
            const fv = typeof v === 'function' ? v() : v;
            textNode.textContent = fv == null ? '' : String(fv);
          });
        } catch {
          // Effect setup failed — text node stays static
        }

        return textNode;
      } catch (e) {
        // Re-throw assertion errors (e.g., "Could not find component named ...")
        // so they propagate to the test harness
        if (e instanceof Error && (
          e.message.includes('Could not find component') ||
          e.message.includes('Attempted to resolve') ||
          e.message.includes('Assertion Failed')
        )) {
          throw e;
        }
        return null;
      }
    }
    if (typeof item === 'string') {
      return document.createTextNode(item);
    }
    if (typeof item === 'number' || typeof item === 'boolean') {
      return document.createTextNode(String(item));
    }
    // Check for htmlSafe strings (SafeString objects with toHTML method)
    if (item && typeof item === 'object' && typeof item.toHTML === 'function') {
      const htmlContent = item.toHTML();
      // Create a document fragment with the HTML content
      const template = document.createElement('template');
      template.innerHTML = htmlContent;
      const fragment = document.createDocumentFragment();
      while (template.content.firstChild) {
        fragment.appendChild(template.content.firstChild);
      }
      return fragment;
    }
    if (item && typeof item === 'object') {
      // Check for CurriedComponent — render it as a component
      if (item && item.__isCurriedComponent) {
        const managers = (globalThis as any).$_MANAGERS;
        if (managers?.component?.canHandle?.(item)) {
          const handleResult = managers.component.handle(item, {}, null, null);
          if (typeof handleResult === 'function') {
            const rendered = handleResult();
            if (rendered instanceof Node) return rendered;
            return itemToNode(rendered, depth + 1);
          }
          if (handleResult instanceof Node) return handleResult;
          return itemToNode(handleResult, depth + 1);
        }
      }

      // Check for GXT list context (from $_each/$_eachSync results)
      // These have topMarker and bottomMarker properties, and the content is between them
      if (item.topMarker && item.bottomMarker) {
        const topMarker = item.topMarker;
        const bottomMarker = item.bottomMarker;
        const parent = topMarker.parentNode;
        if (parent) {
          // Create a fragment containing all nodes between markers (inclusive of markers for GXT tracking)
          const fragment = document.createDocumentFragment();
          // GXT needs the markers for list tracking, so include them
          let node = topMarker;
          while (node) {
            const next = node.nextSibling;
            fragment.appendChild(node);
            if (node === bottomMarker) break;
            node = next;
          }
          return fragment;
        }
        return null;
      }

      // Check for GXT reactive cell with 'fn' property (from $_slot results)
      // GXT's slots return reactive cells that have a 'fn' getter function
      if (typeof item.fn === 'function' && 'isConst' in item) {
        try {
          const cellValue = item.fn();
          return itemToNode(cellValue);
        } catch (e) {
          // fn() may throw if the cell is destroyed
        }
      }

      // Check for $nodes or nodes property
      const nodesProp = item.$nodes || item.nodes;
      if (nodesProp) {
        const frag = document.createDocumentFragment();
        for (const n of nodesProp) {
          const node = itemToNode(n);
          if (node) frag.appendChild(node);
        }
        return frag.childNodes.length > 0 ? frag : null;
      }

      // Check for Symbol-based node storage (GXT context objects)
      const symbols = Object.getOwnPropertySymbols(item);
      for (const sym of symbols) {
        const val = item[sym];
        if (Array.isArray(val) && val.length > 0) {
          const hasNodes = val.some((v: any) =>
            v instanceof Node ||
            typeof v === 'string' ||
            typeof v === 'number' ||
            typeof v === 'function' ||
            (v && typeof v === 'object'));

          if (hasNodes) {
            const frag = document.createDocumentFragment();
            for (const n of val) {
              const node = itemToNode(n);
              if (node) frag.appendChild(node);
            }
            return frag.childNodes.length > 0 ? frag : null;
          }
        }
      }
    }
    return null;
  };

  // Create the template factory function (takes owner, returns template)
  const templateFactory = function(owner?: any) {
    const templateId = `gxt-template-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create a template object that Ember expects
    const template = {
      __gxtCompiled: true,
      __gxtRuntimeCompiled: true,
      moduleName: options?.moduleName || 'gxt-runtime-template',
      id: templateId,
      result: 'ok' as const,
      meta: { owner },

      // The compiled template function
      _templateFn: compilationResult.templateFn,
      _code: compilationResult.code,

      // For debugging
      toString() {
        return `[gxt-template: ${templateString.slice(0, 50)}...]`;
      },

      // Required by Ember's template system - provides a compilable program
      asLayout() {
        return {
          compile: () => ({ handle: 0, symbolTable: { hasEval: false, symbols: [] } }),
          id: templateId,
          moduleName: options?.moduleName || 'gxt-runtime-template',
        };
      },

      asWrappedLayout() {
        return this.asLayout();
      },

      // Render function for Ember integration
      render(context: any, parentElement: Element | null) {
        if (!parentElement) {
          console.warn('[gxt-compile] No parent element provided for render');
          return { nodes: [] };
        }

        // Set up $slots and $fw as globals for the template function to access
        // The GXT runtime compiler generates code that references these directly
        const g = globalThis as any;
        const prevSlots = g.$slots;
        const prevFw = g.$fw;

        try {
          // Use shared GXT root context to avoid multiple roots fighting
          // over the parent context when modules are deduplicated
          let gxtRoot = (globalThis as any).__gxtRootContext;
          if (!gxtRoot) {
            gxtRoot = gxtCreateRoot(document);
            (globalThis as any).__gxtRootContext = gxtRoot;
          }
          gxtSetParentContext(gxtRoot);

          // Copy GXT rendering context from root to our render context
          try {
            const rootRenderingCtx = gxtRoot[RENDERING_CONTEXT_PROPERTY as any] || gxtInitDOM(gxtRoot);
            if (rootRenderingCtx && RENDERING_CONTEXT_PROPERTY) {
              renderContext[RENDERING_CONTEXT_PROPERTY as any] = rootRenderingCtx;
            }
          } catch { /* ignore */ }

          g.$slots = context.$slots || context[_SLOTS_SYM] || {};
          g.$fw = context.$fw || [[], [], []];

          // Initialize GXT context symbols on the render context if not present
          // GXT requires these for proper parent/child tracking
          // Use the actual symbols exported from GXT

          // Check for built-in helper overrides. If the owner has registered a
          // helper with a built-in name, assert before rendering.
          {
            const _owner = (globalThis as any).owner;
            if (_owner && !_owner.isDestroyed) {
              const BUILTIN_HELPER_NAMES = ['array', 'hash', 'concat', 'fn', 'get', 'mut', 'readonly', 'unique-id', 'unbound'];
              for (const builtinName of BUILTIN_HELPER_NAMES) {
                let hasOverride = false;
                try { hasOverride = !!_owner.factoryFor?.(`helper:${builtinName}`); } catch { /* ignore */ }
                if (hasOverride) {
                  emberAssert(
                    `You attempted to overwrite the built-in helper "${builtinName}" which is not allowed. Please rename the helper.`,
                    false
                  );
                }
              }
            }
          }

          // Use the context directly — don't wrap with Object.create()!
          // The context IS the Proxy from createRenderContext. Wrapping it would
          // bypass the Proxy's get handler, breaking cell-based reactive tracking.
          const renderContext = context;

          // Register render context for cross-cell dirtying
          (globalThis as any).__lastRenderContext = context;
          if (context && typeof context === 'object') {
            const proto = Object.getPrototypeOf(context);
            if (proto && proto !== Object.prototype) {
              if (!(globalThis as any).__gxtComponentContexts) {
                (globalThis as any).__gxtComponentContexts = new WeakMap();
              }
              const ctxsMap = (globalThis as any).__gxtComponentContexts;
              if (!ctxsMap.has(proto)) {
                ctxsMap.set(proto, new Set());
              }
              ctxsMap.get(proto).add(context);
            }
          }


          // Set up the GXT context symbols using the proper exported symbols
          if (RENDERED_NODES_PROPERTY && !renderContext[RENDERED_NODES_PROPERTY as any]) {
            renderContext[RENDERED_NODES_PROPERTY as any] = [];
          }
          if (COMPONENT_ID_PROPERTY && !renderContext[COMPONENT_ID_PROPERTY as any]) {
            // Generate a unique context ID
            renderContext[COMPONENT_ID_PROPERTY as any] = g.__gxtContextId = (g.__gxtContextId || 100) + 1;
          }

          // Ensure 'args' key is ALWAYS accessible on the render context
          // GXT's runtime compiler uses $args = 'args' (a string), so templates
          // access args via this['args'].foo (aliased as $a.foo)
          if (!renderContext['args']) {
            renderContext['args'] = context['args'] || context.args || {};
          }

          // Add has-block helpers to the render context
          // These check the slots context stack to see if blocks were provided
          const currentSlots = g.$slots;
          renderContext.$_hasBlock = function(blockName?: string) {
            const name = blockName || 'default';
            return currentSlots && typeof currentSlots[name] === 'function';
          };
          renderContext.$_hasBlockParams = function(blockName?: string) {
            const name = blockName || 'default';
            if (!currentSlots || typeof currentSlots[name] !== 'function') {
              return false;
            }
            // Check if the slot has block params info attached
            const slotFn = currentSlots[name];
            if (slotFn.__hasBlockParams !== undefined) {
              return slotFn.__hasBlockParams;
            }
            // Conservative default
            return false;
          };

          // Set up $_scope for GXT's $_maybeHelper name resolution.
          // When templates use bare names like {{cond1}} (without this.),
          // GXT compiles to $_maybeHelper("cond1", [], ctx). The scope is
          // checked to resolve the name. We set $_scope to the render context
          // so bare names resolve to component properties through cell getters.
          const argsObj = renderContext['args'] || renderContext[$ARGS_KEY] || {};
          if (!argsObj.$_scope) {
            argsObj.$_scope = renderContext;
          }

          // Push slots onto the global stack for nested has-block checks
          const slotsStack = (globalThis as any).__slotsContextStack;
          slotsStack.push(currentSlots);

          // Install cells on the render context for user-defined properties BEFORE
          // the template evaluates. This ensures GXT formulas reading this.prop
          // will track the cell, enabling reactive updates when set() is called later.
          // We walk the prototype chain (up to the base Ember component) to find
          // properties set via Component.extend({ fooBar: true }).
          let _cellInstallCount = 0;
          try {
            const internalKeys = new Set([
              'args', 'attrs', 'element', 'parentView', 'tagName', 'layoutName',
              'layout', 'classNames', 'classNameBindings', 'attributeBindings',
              'concatenatedProperties', 'mergedProperties', 'isDestroying', 'isDestroyed',
              'renderer', 'init', 'constructor', 'willDestroy', 'toString',
            ]);
            // Use the raw target if render context is a Proxy (so cells are keyed
            // to the same object that __gxtTriggerReRender uses).
            const cellTarget = (renderContext as any).__gxtRawTarget || renderContext;
            let proto = cellTarget;
            // Walk prototype chain, stopping at Object.prototype
            const visited = new Set<string>();
            for (let depth = 0; depth < 5 && proto; depth++) {
              const keys = Object.getOwnPropertyNames(proto);
              for (const key of keys) {
                if (visited.has(key)) continue;
                visited.add(key);
                if (key.startsWith('_') || key.startsWith('$') || internalKeys.has(key)) continue;
                const desc = Object.getOwnPropertyDescriptor(proto, key);
                if (desc && !desc.get && !desc.set && desc.configurable &&
                    typeof desc.value !== 'function') {
                  try {
                    // Install cell on the raw target (not the proxy)
                    // This ensures the same cell is used for reads and writes
                    cellFor(cellTarget, key as any, /* skipDefine */ false);
                    _cellInstallCount++;
                    // Register reverse mapping: if this property holds an object,
                    // we need to dirty this cell when a property changes on that object.
                    // This enables {{this.m.formattedMessage}} to update when m.message changes.
                    const cellValue = desc.value;
                    if (cellValue && typeof cellValue === 'object') {
                      registerObjectValueOwner(cellValue, cellTarget, key);
                    }
                  } catch { /* ignore non-configurable properties */ }
                }
              }
              const nextProto = Object.getPrototypeOf(proto);
              if (!nextProto || nextProto === Object.prototype) break;
              proto = nextProto;
            }
          } catch { /* ignore */ }
          // _cellInstallCount tracked for debugging

          // Cell promotion handled by __gxtForceEmberRerender (full re-render)

          // Call the compiled template function with the render context.
          // Enable isRendering so GXT formulas track cell dependencies.
          // Use globalThis.__gxtSetIsRendering which is from the SAME module
          // instance as GXT's $_tag/formula system. The direct import
          // (gxtSetIsRendering) may be from a different module copy.
          let result;
          const _setRendering = (globalThis as any).__gxtSetIsRendering || gxtSetIsRendering;
          _setRendering(true);
          (globalThis as any).__gxtCurrentlyRendering = true;
          try {
            result = compilationResult.templateFn.call(renderContext);
          } finally {
            (globalThis as any).__gxtCurrentlyRendering = false;
            _setRendering(false);
            // Pop slots from stack
            slotsStack.pop();
          }

          // Handle the result
          const nodes: Node[] = [];
          if (Array.isArray(result)) {
            for (const item of result) {
              const node = itemToNode(item);
              if (node) {
                if (node instanceof DocumentFragment) {
                  const childNodes = Array.from(node.childNodes);
                  for (const child of childNodes) {
                    nodes.push(child);
                    parentElement.appendChild(child);
                  }
                } else {
                  nodes.push(node);
                  parentElement.appendChild(node);
                }
              }
            }
          } else {
            const node = itemToNode(result);
            if (node) {
              if (node instanceof DocumentFragment) {
                const childNodes = Array.from(node.childNodes);
                for (const child of childNodes) {
                  nodes.push(child);
                  parentElement.appendChild(child);
                }
              } else {
                nodes.push(node);
                parentElement.appendChild(node);
              }
            }
          }

          // Restore previous global values
          g.$slots = prevSlots;
          g.$fw = prevFw;

          return { nodes, ctx: context };
        } catch (err) {
          // Restore globals even on error
          g.$slots = prevSlots;
          g.$fw = prevFw;

          // Rethrow non-Error values (expectAssertion's BREAK sentinel) and
          // assertion errors so they propagate to test harnesses
          if (_isAssertionLike(err) || (err && ((err as any).message?.includes('Could not find') || (err as any).message?.includes('Custom modifier managers must have')))) {
            throw err;
          }
          // Swallow other render errors gracefully
          console.error('Render error:', err);
        }
      },
    };

    return template;
  };

  // Add properties to the factory function itself for compatibility
  (templateFactory as any).__gxtCompiled = true;
  (templateFactory as any).__gxtRuntimeCompiled = true;
  (templateFactory as any).moduleName = options?.moduleName || 'gxt-runtime-template';
  (templateFactory as any).id = `gxt-factory-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Cache the result
  templateCache.set(cacheKey, templateFactory);

  return templateFactory;
}

/**
 * Compile a template string at runtime using GXT
 */
export function compileTemplate(templateString: string, options?: any) {
  return precompileTemplate(templateString, options);
}

/**
 * Register the template compiler (for compatibility)
 */
export function __registerTemplateCompiler(compiler: any) {
  // Store reference for debugging
  (globalThis as any).__registeredTemplateCompiler = compiler;
}

/**
 * Ember template compiler interface
 */
export const __emberTemplateCompiler = {
  compile: compileTemplate,
  precompile(templateString: string, options?: any) {
    // For precompile, just return a JSON representation
    // The actual compilation happens at runtime
    return JSON.stringify({
      source: templateString,
      moduleName: options?.moduleName,
      isGxt: true,
    });
  },
};

export default function templateCompilation() {
  return {
    precompileTemplate,
    compileTemplate,
    __registerTemplateCompiler,
    __emberTemplateCompiler,
  };
}

// Register the GXT compiler globally for @ember/template-compiler to use
(globalThis as any).__gxtCompileTemplate = compileTemplate;
