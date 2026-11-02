import {
  captureRenderTree as _captureRenderTree,
  inspect,
  registerDeprecationHandler,
} from '@ember/debug';
import type { Owner, DeprecationHandler } from '../types';

export const debug = {
  /**
   * Captures the current component render tree for the component inspector.
   */
  captureRenderTree(app: Owner) {
    return _captureRenderTree(app as any);
  },

  /**
   * Convert any value to a human-readable string representation.
   */
  inspect(value: unknown): string {
    return inspect(value);
  },

  /**
   * Register a custom handler for deprecation warnings.
   */
  registerDeprecationHandler(handler: DeprecationHandler): void {
    registerDeprecationHandler(handler as any);
  },
};
