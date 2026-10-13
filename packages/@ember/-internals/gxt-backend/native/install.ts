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
import { componentManager, resolveComponentName } from './managers';
import { modifierManager } from './modifier-manager';
import { Outlet } from './outlet';
import { assertLooseBuiltins, resolveComponentOrHelper } from './resolver';
import { classifyContent, eachInEntries, getProp, hostAssert } from './content';

let installed = false;

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
  });
  registerHostManagers({
    component: componentManager as never,
    helper: helperManager as never,
    modifier: modifierManager as never,
  });
  installRenderLoop();
}

install();
