/// <reference types="vite/client" />

import { createReplacePlugin } from './replace.js';

const MODE = process.env['MODE'] ?? 'development';
const DEV = MODE === 'development';
const PROD = MODE === 'production';
const STARBEAM_TRACE = process.env['STARBEAM_TRACE'] ?? false;

export default createReplacePlugin(
  (id) => /\.[jt]sx?$/u.test(id),
  {
    // Intended to be left in the build during publish
    // currently compiled away to `@glimmer/debug`
    'import.meta.env.MODE': process.env['MODE'] ?? 'development',
    'import.meta.env.DEV': DEV ? 'true' : 'false',
    'import.meta.env.PROD': PROD ? 'true' : 'false',
    // Not exposed at publish, compiled away
    'import.meta.env.VM_LOCAL_DEV': DEV ? 'true' : 'false',
    'import.meta.env.STARBEAM_TRACE': STARBEAM_TRACE ? 'true' : 'false',
  },
  true
);
