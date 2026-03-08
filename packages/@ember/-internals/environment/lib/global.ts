import type { GlobalContext } from './context';

declare global {
  var Ember: Partial<GlobalContext> | undefined;
  var EmberENV:
    | (Record<string, unknown> & {
        EXTEND_PROTOTYPES?: boolean;
        EMBER_LOAD_HOOKS?: Record<string, unknown>;
        FEATURES?: Record<string, unknown>;
      })
    | undefined;
}

// export real global
export default globalThis;
