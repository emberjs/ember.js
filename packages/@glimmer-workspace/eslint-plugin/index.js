// @ts-check

import node from 'eslint-plugin-n';
import tslint, { config } from 'typescript-eslint';

import * as filters from './lib/filters.js';

export { filters };

export { default as javascript } from './lib/base/javascript.js';
export { default as typescript } from './lib/base/typescript.js';
export { code, compat, jsons, override, workspace } from './lib/workspace.js';

export { config, node, tslint };
