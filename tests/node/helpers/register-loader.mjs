// Preload file (--import) that registers a custom ESM loader to stub
// @embroider/macros for direct Node.js import of dist packages in tests.
import { register } from 'node:module';
register('./macros-loader.mjs', import.meta.url);
