import { readFileSync, writeFileSync } from 'node:fs';

import { createFormat } from '@pnpm/meta-updater';
import { equals } from 'ramda';
import { update } from '../update.mjs';

/**
 * @import { FormatPlugin } from '@pnpm/meta-updater';
 */

/**
 * @returns {FormatPlugin<string>}
 */
export const code = createFormat({
  read({ resolvedPath }) {
    return readFileSync(resolvedPath, { encoding: 'utf-8' });
  },
  update(actual, updater, options) {
    return updater(actual, options);
  },
  equal(expected, actual) {
    return equals(actual, expected);
  },
  async write(expected, options) {
    await update(options.resolvedPath, expected, writeFileSync);
  },
});
