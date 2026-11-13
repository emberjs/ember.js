// Boot entry. No `dt7948` global: decorators import decorator-transforms'
// runtime in every variant (babel for .js; for .gjs on gxt, the gxt compiler
// imports it under WITH_EMBER_INTEGRATION).
import App from './app.js';
import config from './config/environment.js';

App.create(config.APP);
