// @ts-check

import { basename } from 'node:path';

import { createFormat } from '@pnpm/meta-updater';
import {} from '@pnpm/workspace.find-packages';
import { loadJsonFile } from 'load-json-file';
import { equals } from 'ramda';
import { writeJsonFile } from 'write-json-file';
import { update } from '../update.mjs';

/**
 * @import { PackageJson } from 'type-fest';
 * @import { FormatPlugin } from '@pnpm/meta-updater';
 * @import {ProjectManifest} from '@pnpm/types';
 */

/**
 * @type {FormatPlugin<Record<string, import('load-json-file').JsonValue>>}
 */
export const json = createFormat({
  read({ resolvedPath }) {
    return loadJsonFile(resolvedPath);
  },
  update(actual, updater, options) {
    return updater(actual, options);
  },
  equal(expected, actual) {
    return equals(actual, expected);
  },
  async write(expected, options) {
    await update(options.resolvedPath, expected, async (content, path) => {
      if (content && basename(path) === 'package.json') {
        await options._writeProjectManifest(/** @type {ProjectManifest} */ (content));
      } else {
        await writeJsonFile(path, content, { detectIndent: true });
      }
    });
  },
});

/**
 * @type {FormatPlugin<PackageJson>}
 */
export const packageJson = createFormat({
  read({ resolvedPath }) {
    return loadJsonFile(resolvedPath);
  },
  update(actual, updater, options) {
    return updater(actual, options);
  },
  equal(expected, actual) {
    return equals(actual, expected);
  },
  async write(expected, options) {
    await update(options.resolvedPath, expected, async (content) => {
      await options._writeProjectManifest(/** @type {ProjectManifest} */ (content));
    });
  },
});
