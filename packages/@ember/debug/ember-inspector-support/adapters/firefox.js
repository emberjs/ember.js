/* eslint no-empty:0 */
import WebExtension from './web-extension';

export default class extends WebExtension {
  debug() {
    // WORKAROUND: temporarily workaround issues with firebug console object:
    // - https://github.com/tildeio/ember-extension/issues/94
    // - https://github.com/firebug/firebug/pull/109
    // - https://code.google.com/p/fbug/issues/detail?id=7045
    try {
      super.debug(...arguments);
    } catch (e) {}
  }

  log() {
    // WORKAROUND: temporarily workaround issues with firebug console object:
    // - https://github.com/tildeio/ember-extension/issues/94
    // - https://github.com/firebug/firebug/pull/109
    // - https://code.google.com/p/fbug/issues/detail?id=7045
    try {
      super.log(...arguments);
    } catch (e) {}
  }
}
