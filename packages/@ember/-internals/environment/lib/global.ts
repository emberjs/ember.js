import type { GlobalContext } from './context';

export interface EmberGlobal {
  Ember?: Partial<GlobalContext>;
  EmberENV?: Record<string, unknown> & {
    EXTEND_PROTOTYPES?: boolean;
    EMBER_LOAD_HOOKS?: Record<string, unknown>;
    FEATURES?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

// export real global
export default globalThis as unknown as EmberGlobal;
