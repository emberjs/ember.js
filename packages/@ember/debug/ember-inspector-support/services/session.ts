import BaseObject from '@ember/debug/ember-inspector-support/utils/base-object';

class Session extends BaseObject {
  setItem(/*key, val*/) {}
  removeItem(/*key*/) {}
  getItem(/*key*/) {}
}

let SESSION_STORAGE_SUPPORTED = false;

try {
  if (typeof sessionStorage !== 'undefined') {
    SESSION_STORAGE_SUPPORTED = true;
  }
} catch (e) {
  // This can be reached with the following succession of events:
  //
  //   1. On Google Chrome
  //   2. Disable 3rd-party cookies
  //   3. Open the browser inspector
  //   4. Open on the Ember inspector
  //   5. Visit a page showing an Ember app, on a frame
  //      loaded from a different domain
  //
  // It's important that the Ember inspector is already open when
  // you land on the page (hence step 4 before 5). Reloading the iframe
  // page with the Ember inspector open also reproduces the problem.
}

// Feature detection
if (SESSION_STORAGE_SUPPORTED) {
  Object.assign(Session.prototype, {
    sessionStorage,
    prefix: '__ember__inspector__',
    makeKey(key) {
      return this.prefix + key;
    },
    setItem(key, val) {
      return this.sessionStorage.setItem(this.makeKey(key), val);
    },
    removeItem(key) {
      return this.sessionStorage.removeItem(this.makeKey(key));
    },
    getItem(key) {
      return JSON.parse(this.sessionStorage.getItem(this.makeKey(key)));
    },
  });
}

export default Session;
