/**
 * Lightweight Glimmer VM global context setup.
 *
 * The heavy Ember-specific implementations (metal get/set, EmberArray iteration,
 * proxy truthiness, HTMLSafe style checking) are registered lazily by
 * environment.ts during full Ember app boot. For standalone renderComponent
 * usage, the simple fallbacks here are sufficient.
 */
import { assert, deprecate, warn } from '@ember/debug';
import type { DeprecationOptions } from '@ember/debug';
import { schedule, _backburner } from '@ember/runloop';
import { DEBUG } from '@glimmer/env';
import setGlobalContext from '@glimmer/global-context';
import { debug } from '@glimmer/validator';

///////////

// Lazy integration for heavy Ember-specific implementations.
// Simple fallbacks are used until registerEmberGlobalContextImplementations()
// is called by environment.ts (only loaded in full Ember apps).

let _getProp: (obj: object, key: string) => unknown = (obj, key) =>
  (obj as Record<string, unknown>)[key];
let _setProp: (obj: object, key: string, value: unknown) => void = (obj, key, value) => {
  (obj as Record<string, unknown>)[key] = value;
};
let _getPath: (obj: object, key: string) => unknown = (obj, key) =>
  (obj as Record<string, unknown>)[key];
let _setPath: (obj: object, key: string, value: unknown) => unknown = (obj, key, value) => {
  (obj as Record<string, unknown>)[key] = value;
  return value;
};
let _toBool: (value: unknown) => boolean = Boolean;
let _toIterator: (value: unknown) => any = () => null;
let _isHTMLSafe: (value: unknown) => boolean = () => false;

export function registerEmberGlobalContextImplementations(impls: {
  _getProp: typeof _getProp;
  _setProp: typeof _setProp;
  get: typeof _getPath;
  set: typeof _setPath;
  toBool: typeof _toBool;
  toIterator: typeof _toIterator;
  isHTMLSafe: typeof _isHTMLSafe;
}) {
  _getProp = impls._getProp;
  _setProp = impls._setProp;
  _getPath = impls.get;
  _setPath = impls.set;
  _toBool = impls.toBool;
  _toIterator = impls.toIterator;
  _isHTMLSafe = impls.isHTMLSafe;
}

///////////

const VM_DEPRECATION_OVERRIDES: (DeprecationOptions & {
  disabled?: boolean;
  message?: string;
})[] = [
  {
    id: 'setting-on-hash',
    until: '4.4.0',
    for: 'ember-source',
    since: {
      available: '3.28.0',
      enabled: '3.28.0',
    },
  },
];

const VM_ASSERTION_OVERRIDES: { id: string; message: string }[] = [];

///////////

setGlobalContext({
  FEATURES: {
    DEFAULT_HELPER_MANAGER: true,
  },

  scheduleRevalidate() {
    _backburner.ensureInstance();
  },

  toBool: (value: unknown) => _toBool(value),
  toIterator: (value: unknown) => _toIterator(value),

  getProp: (obj: object, key: string) => _getProp(obj, key),
  setProp: (obj: object, key: string, value: unknown) => _setProp(obj, key, value),
  getPath: (obj: object, key: string) => _getPath(obj, key),
  setPath: (obj: object, key: string, value: unknown) => _setPath(obj, key, value),

  scheduleDestroy(destroyable, destructor) {
    schedule('actions', null, destructor, destroyable);
  },

  scheduleDestroyed(finalizeDestructor) {
    schedule('destroy', null, finalizeDestructor);
  },

  warnIfStyleNotTrusted(value: unknown) {
    warn(
      `Binding style attributes may introduce cross-site scripting vulnerabilities; please ensure that the \`${String(value)}\` string is trusted.`,
      (() => {
        if (value === null || value === undefined || _isHTMLSafe(value)) {
          return true;
        }
        return false;
      })(),
      { id: 'ember-htmlbars.style-xss-warning' }
    );
  },

  assert(test: unknown, msg: string, options?: { id: string }) {
    if (DEBUG) {
      let id = options?.id;
      let override = VM_ASSERTION_OVERRIDES.filter((o) => o.id === id)[0];
      assert(override?.message ?? msg, test);
    }
  },

  deprecate(msg: string, test: unknown, options: { id: string }) {
    if (DEBUG) {
      let { id } = options;

      if (id === 'argument-less-helper-paren-less-invocation') {
        throw new Error(
          `A resolved helper cannot be passed as a named argument as the syntax is ` +
            `ambiguously a pass-by-reference or invocation. Use the ` +
            `\`{{helper 'foo-helper}}\` helper to pass by reference or explicitly ` +
            `invoke the helper with parens: \`{{(fooHelper)}}\`.`
        );
      }

      let override = VM_DEPRECATION_OVERRIDES.filter((o) => o.id === id)[0];

      if (!override) throw new Error(`deprecation override for ${id} not found`);

      if (!override.disabled) {
        deprecate(override.message ?? msg, Boolean(test), override);
      }
    }
  },
});

if (DEBUG) {
  debug?.setTrackingTransactionEnv?.({
    debugMessage(obj, keyName) {
      let dirtyString = keyName ? `\`${keyName}\` on \`${String(obj)}\`` : `\`${String(obj)}\``;

      return `You attempted to update ${dirtyString}, but it had already been used previously in the same computation.  Attempting to update a value after using it in a computation can cause logical errors, infinite revalidation bugs, and performance issues, and is not supported.`;
    },
  });
}
