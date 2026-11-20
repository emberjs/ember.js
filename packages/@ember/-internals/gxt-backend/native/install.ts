// gxt NATIVE layer — the one place the native layer wires itself into gxt.
// Imported for its side effect by native/renderer.ts (the module every Ember
// render path and the application registry load, the edge classic uses for its
// VM global context). Registers once; named imports only, so nothing else of
// gxt is retained.
import { DEBUG } from '@glimmer/env';
import { registerHostHooks, registerHostManagers } from '@lifeart/gxt';
import {
  installRenderLoop,
  normalizeAttrValue,
  scheduleRevalidate,
  toBool,
  trustedAttrValue,
} from './host-hooks';
import { helperManager } from './helper-manager';
import { componentManager, instanceOfNode, resolveComponentName } from './managers';
import { modifierManager } from './modifier-manager';
import { Outlet } from './outlet';
import { assertLooseBuiltins, resolveComponentOrHelper } from './resolver';
import { getDebuggerCallback } from './runtime-helpers';
import { classifyContent, eachInEntries, getProp, hostAssert } from './content';

let installed = false;

// gxt's item reference follow runtime (a yielded block and an `{{#in-element}}`
// of a `key="@index"` or `{{#each-in}}` row follow the item now at the row) is
// not installed here for every app: a template that keys a list by position
// or renders `{{#each-in}}` installs it from `@lifeart/gxt/item-references`
// where it is compiled, and the runtime compiler installs it for a template
// compiled at runtime (gxt `setupGlobalScope`).

function debuggerHook(self: unknown, get: (path: string) => unknown): void {
  const context =
    self !== null && typeof self === 'object' && instanceOfNode(self) === null ? null : self;
  getDebuggerCallback()(context, get);
}

export function install(): void {
  if (installed) return;
  installed = true;
  registerHostHooks({
    scheduleRevalidate,
    toBool,
    normalizeAttrValue,
    // A trusting `style={{{value}}}` (gxt `$_trustAttr`): marked so the DEV
    // untrusted-style warning in normalizeAttrValue skips it (Glimmer's
    // TrustingDynamicAttribute). Production has no warning and no marker.
    trustedAttrValue: DEBUG ? trustedAttrValue : undefined,
    resolveComponentName,
    // `{{outlet}}` (`$_outlet(ctx)` under NATIVE_FLAGS.EMBER_OUTLET)
    outletComponent: Outlet,
    // Template property reads (every member segment of a `this.*` /
    // `@arg.*` / block-param path compiles to `$__tag(obj, "key")` under
    // NATIVE_FLAGS.EMBER_PROPERTY_TAGS): Glimmer's global-context getProp —
    // consumes tagFor(obj, key) (+ the `[]` tag of an array value) and honours
    // `unknownProperty`, so `set()` / `notifyPropertyChange()` on untracked
    // properties re-render; plus an ArrayProxy's iteration tag (content.ts).
    getProp,
    // Loose-mode ambiguous append (a content-position `{{name …}}` in a
    // loose template compiles to `$_looseAppend` under
    // NATIVE_FLAGS.EMBER_LOOSE_COMPONENTS): component, else helper.
    resolveComponentOrHelper,
    // Loose-mode built-ins gxt lowers itself (`array` / `fn` / `hash` /
    // `unique-id`): the classic resolver's overwritten-built-in assertion.
    looseBuiltins: DEBUG ? assertLooseBuiltins : undefined,
    // Glimmer dynamic content: `{{value}}` renders trusted HTML /
    // components / helpers by what the value is.
    classifyContent,
    // `{{#each-in}}` entries: Glimmer's toEachInIterator + tags.
    eachInEntries,
    // gxt's Glimmer-parity runtime assertions (in-element) via @ember/debug.
    assert: hostAssert,
    // `{{debugger}}`: Glimmer's debugger callback (`setDebuggerCallback`),
    // each time the statement renders, with the template's self — `null` for
    // a template-only component (no instance), which selects the
    // template-only hint — and gxt's `get(path)`.
    debugger: debuggerHook,
  });
  registerHostManagers({
    component: componentManager as never,
    helper: helperManager as never,
    modifier: modifierManager as never,
  });
  installRenderLoop();
}

install();
