import loadConfigFromMeta from '@embroider/config-meta-loader';
import { assert } from '@ember/debug';

// In SSR (Node.js) context there is no DOM to read meta tags from,
// so we provide a default configuration that works for server-side rendering.
// The locationType is set to 'none' since there is no browser history API.
const config =
  typeof document !== 'undefined'
    ? loadConfigFromMeta('v2-app-template')
    : {
        modulePrefix: 'v2-app-template',
        podModulePrefix: '',
        environment: 'production',
        rootURL: '/',
        locationType: 'none',
        APP: {},
      };

assert(
  'config is not an object',
  typeof config === 'object' && config !== null
);
assert(
  'modulePrefix was not detected on your config',
  'modulePrefix' in config && typeof config.modulePrefix === 'string'
);
assert(
  'locationType was not detected on your config',
  'locationType' in config && typeof config.locationType === 'string'
);
assert(
  'rootURL was not detected on your config',
  'rootURL' in config && typeof config.rootURL === 'string'
);
assert(
  'APP was not detected on your config',
  'APP' in config && typeof config.APP === 'object'
);

export default config;
