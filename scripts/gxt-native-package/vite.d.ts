import type { Plugin } from 'vite';

export interface EmberGxtNativeOptions {
  /**
   * Which Ember dist and gxt compile mode to use. Default: `development` for
   * the dev server and `vite build --mode development`, `production` otherwise.
   */
  mode?: 'development' | 'production';
  /** Turn off the gxt hot-reload footer in development. */
  disableHMR?: boolean;
}

/**
 * Resolves Ember's modules into this package's dist and compiles `.gjs` / `.gts`
 * / `precompileTemplate()` with the gxt compiler under the dist's own flags.
 */
export function emberGxtNative(options?: EmberGxtNativeOptions): Plugin[];
export default emberGxtNative;
