import type { ESLint } from '@types/eslint';

interface QUnitPlugin extends ESLint.Plugin {
  configs: {
    recommended: ESLint.PluginConfig;
  };
}

declare const DEFAULT: QUnitPlugin;

export default DEFAULT;
