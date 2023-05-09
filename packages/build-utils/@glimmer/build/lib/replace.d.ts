import type { Plugin } from 'rollup';

export function createReplacePlugin(
  test: (id: string) => boolean,
  replacements: Record<string, string>,
  sourcemap: boolean
): Plugin;
