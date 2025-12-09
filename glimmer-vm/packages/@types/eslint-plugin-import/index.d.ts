import type { Linter } from 'eslint';

interface ImportPlugin {
  flatConfigs: {
    recommended: Linter.Config;
    typescript: Linter.Config;
  };
}

declare const DEFAULT: ImportPlugin;

export default DEFAULT;
