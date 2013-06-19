/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set, location = window.location;

/**
  Ember.AutoLocation will select the best location option based off browser
  support with the priority order: history, hash, none.

  If history URLs are accessed by hash-only browsers, the path is transformed.
  Vice versa for hash URLs accessed by modern browsers.

  @class AutoLocation
  @namespace Ember
  @static
*/
Ember.AutoLocation = Ember.Object.createWithMixins({

  /**
    Base path that should always be pretty; i.e. before hash state. Helpful when
    your application is not served out of the index root path and you're using
    the HashLocation class.

    e.g. /app/#/about

    @property rootPath
    @default '/'
  */
  rootPath: '/',

  window: window,
  document: document,
  userAgent: navigator.userAgent,

  history: Ember.computed(function () {
    return get(this, 'window').history;
  }).property('window'),

  supportsHistory: Ember.computed(function () {
    // The stock browser on Android 2.2 & 2.3 returns positive on history support
    // Unfortunately support is really buggy and there is no clean way to detect
    // these bugs, so we fall back to a user agent sniff :(
    var userAgent = get(this, 'userAgent'),
        history = get(this, 'history');

    // We only want Android 2, stock browser, not Chrome which identifies
    // itself as 'Mobile Safari' as well
    if (userAgent.indexOf('Android 2') !== -1 &&
        userAgent.indexOf('Mobile Safari') !== -1 &&
        userAgent.indexOf('Chrome') === -1) {
      return false;
    }

    return (history && 'pushState' in history);
  }).property('userAgent', 'history'),

  supportsHashChange: Ember.computed(function () {
    var window = get(this, 'window'),
        document = get(this, 'document');

    if ('onhashchange' in window === false) {
      return false;
    }

    // IE8 Compatibility Mode provides false positive
    return (document.documentMode === undefined || document.documentMode > 7);
  }).property('window', 'document'),

  create: function () {
    var implementationClass, historyPath, hashPath,
        currentPath = get(this, 'fullPath');

    if (get(this, 'supportsHistory')) {
      historyPath = get(this, 'historyPath');

      // Since we support history paths, let's be sure we're using them else 
      // switch the location over to it.
      if (currentPath === historyPath) {
        implementationClass = Ember.HistoryLocation;
      } else {
        location.replace(historyPath);
      }

    } else if (get(this, 'supportsHashChange')) {
      hashPath = get(this, 'hashPath');

      // Be sure we're using a hashed path, otherwise let's switch over it to so
      // we start off clean and consistent.
      if (currentPath === hashPath) {
        implementationClass = Ember.HashLocation;
      } else {
        location.replace(hashPath);
      }
    }

    // If none has been set
    if (!implementationClass) {
      implementationClass = Ember.NoneLocation;
    }

    return implementationClass.create.apply(implementationClass, arguments);
  },

  /**
    @private

    Returns the current `location.pathname`, normalized for IE inconsistencies.

    @method getPath
  */
  path: Ember.computed(function () {
    var pathname = location.pathname;
    // IE8 inconsistency check
    if (pathname.charAt(0) !== '/') {
      pathname = '/' + pathname;
    }

    return pathname;
  }).property(),

  /**
    @private

    Returns the full pathname including the hash string.

    @method getFullPath
  */
  fullPath: Ember.computed(function () {
    return get(this, 'path') + location.hash;
  }).property('path'),

  /**
    @private

    Returns the current path as it should appear for HistoryLocation supported
    browsers. This may very well differ from the real current path.

    @method getHistoryPath
  */
  historyPath: Ember.computed(function () {
    var path = get(this, 'path'),  
        hashPath = location.hash.substr(1),
        url = path + hashPath;

    // Remove any stacked double stashes
    url = url.replace(/\/\//, '/');

    return url;
  }).property('path'),

  /**
    @private

    Returns the current path as it should appear for HashLocation supported
    browsers. This may very well differ from the real current path.

    @method getHashPath
  */
  hashPath: Ember.computed(function () {
    var historyPath = get(this, 'historyPath'),
        rootPath = get(this, 'rootPath'),
        exp = new RegExp('(' + rootPath + ')(.+)'),
        url = historyPath.replace(exp, '$1#/$2');

    // Remove any stacked double stashes
    url = url.replace(/\/\//, '/');

    return url;
  }).property('historyPath', 'rootPath')
});

Ember.Location.registerImplementation('auto', Ember.AutoLocation);
