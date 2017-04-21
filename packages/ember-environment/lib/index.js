/* globals module */
import global from './global';
import { defaultFalse, defaultTrue, normalizeExtendPrototypes } from './utils';

/**
  The hash of environment variables used to control various configuration
  settings. To specify your own or override default settings, add the
  desired properties to a global hash named `EmberENV` (or `ENV` for
  backwards compatibility with earlier versions of Ember). The `EmberENV`
  hash must be created before loading Ember.

  @class EmberENV
  @type Object
  @public
*/
export const ENV = (typeof global.EmberENV === 'object' && global.EmberENV) ||
                   (typeof global.ENV === 'object' && global.ENV) || {};

// ENABLE_ALL_FEATURES was documented, but you can't actually enable non optional features.
if (ENV.ENABLE_ALL_FEATURES) {
  ENV.ENABLE_OPTIONAL_FEATURES = true;
}

/**
  Determines whether Ember should add to `Array`, `Function`, and `String`
  native object prototypes, a few extra methods in order to provide a more
  friendly API.

  We generally recommend leaving this option set to true however, if you need
  to turn it off, you can add the configuration property
  `EXTEND_PROTOTYPES` to `EmberENV` and set it to `false`.

  Note, when disabled (the default configuration for Ember Addons), you will
  instead have to access all methods and functions from the Ember
  namespace.

  @property EXTEND_PROTOTYPES
  @type Boolean
  @default true
  @for EmberENV
  @public
*/
ENV.EXTEND_PROTOTYPES = normalizeExtendPrototypes(ENV.EXTEND_PROTOTYPES);

/**
  The `LOG_STACKTRACE_ON_DEPRECATION` property, when true, tells Ember to log
  a full stack trace during deprecation warnings.

  @property LOG_STACKTRACE_ON_DEPRECATION
  @type Boolean
  @default true
  @for EmberENV
  @public
*/
ENV.LOG_STACKTRACE_ON_DEPRECATION = defaultTrue(ENV.LOG_STACKTRACE_ON_DEPRECATION);

/**
  The `LOG_VERSION` property, when true, tells Ember to log versions of all
  dependent libraries in use.

  @property LOG_VERSION
  @type Boolean
  @default true
  @for EmberENV
  @public
*/
ENV.LOG_VERSION = defaultTrue(ENV.LOG_VERSION);

// default false
ENV.MODEL_FACTORY_INJECTIONS = defaultFalse(ENV.MODEL_FACTORY_INJECTIONS);

/**
  Debug parameter you can turn on. This will log all bindings that fire to
  the console. This should be disabled in production code. Note that you
  can also enable this from the console or temporarily.

  @property LOG_BINDINGS
  @for EmberENV
  @type Boolean
  @default false
  @public
*/
ENV.LOG_BINDINGS = defaultFalse(ENV.LOG_BINDINGS);


ENV.RAISE_ON_DEPRECATION = defaultFalse(ENV.RAISE_ON_DEPRECATION);

// check if window exists and actually is the global
const hasDOM = typeof window !== 'undefined' && window === global &&
               window.document && window.document.createElement &&
               !ENV.disableBrowserEnvironment; // is this a public thing?

// legacy imports/exports/lookup stuff (should we keep this??)
const originalContext = global.Ember || {};

export const context = {
  // import jQuery
  imports: originalContext.imports || global,
  // export Ember
  exports: originalContext.exports || global,
  // search for Namespaces
  lookup: originalContext.lookup || global
};

// TODO: cleanup single source of truth issues with this stuff
export const environment = hasDOM ? {
  hasDOM: true,
  isChrome: !!window.chrome && !window.opera,
  isFirefox: typeof InstallTrigger !== 'undefined',
  isPhantom: !!window.callPhantom,
  location: window.location,
  history: window.history,
  userAgent: window.navigator.userAgent,
  window
} : {
  hasDOM: false,
  isChrome: false,
  isFirefox: false,
  isPhantom: false,
  location: null,
  history: null,
  userAgent: 'Lynx (textmode)',
  window: null
};
