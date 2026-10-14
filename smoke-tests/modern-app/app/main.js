// Boot entry. No `dt7948` global: decorators import decorator-transforms'
// runtime in every variant (babel for .js; for .gjs on gxt, the compiler's
// output gets the import, see scripts/gxt-native-package/decorator-runtime.mjs).
import App from './app.js';
import config from './config/environment.js';

App.create(config.APP);
