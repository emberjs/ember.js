/**
@module ember
@submodule ember-routing
*/

var get = Ember.get, set = Ember.set, location = window.location;
var supportsHistory = !!(window.history && history.pushState);
var supportsHashChange = (function () {
  if ('onhashchange' in window === false) {
    return false;
  }

  // IE8 Compatibility Mode provides false positive
  return (document.documentMode === undefined || document.documentMode > 7);
});

/**
  Ember.AutoLocation will select the best location option based off browser
  support with the priority order: history, hash, none.

  If history URLs are accessed by hash-only browsers, the path is transformed.
  Vice versa for hash URLs accessed by modern browsers.

  @class AutoLocation
  @namespace Ember
  @static
*/
Ember.AutoLocation = {

  /**
    Base path that should always be pretty; i.e. before hash state. Helpful when
    your application is not served out of the index root path and you're using
    the HashLocation class.

    e.g. /app/#/about

    @property rootPath
    @default '/'
  */
  rootPath: '/',

  create: function () {
    var implementationClass, historyPath, hashPath,
        currentPath = this.getFullPath();

    if (supportsHistory) {
      historyPath = this.getHistoryPath();

      // Since we support history paths, let's switch over to it if we're not
      // already.
      if (currentPath !== historyPath) {
        location.replace(historyPath);
        return;
      }

      implementationClass = Ember.HistoryLocation;

    } else if (supportsHashChange) {
      hashPath = this.getHashPath();

      // If we're not yet using hash paths, let's switch over it to so we start
      // off clean and consistent.
      if (currentPath !== hashPath) {
        location.replace(hashPath);
        return;
      }

      implementationClass = Ember.HashLocation;
    } else {
      implementationClass = Ember.NoneLocation;
    }

    return implementationClass.create.apply(implementationClass, arguments);
  },

  /**
    @private

    Returns the current `location.pathname`, normalized for IE inconsistencies.

    @method getPath
  */
  getPath: function () {
    var pathname = location.pathname;
    // IE8 inconsistency check
    if (pathname.charAt(0) !== '/') {
      pathname = '/' + pathname;
    }

    return pathname;
  },

  /**
    @private

    Returns the full pathname including the hash string.

    @method getFullPath
  */
  getFullPath: function () {
    return this.getPath() + location.hash;
  },

  /**
    @private

    Returns the current path as it should appear for HistoryLocation supported
    browsers. This may very well differ from the real current path.

    @method getHistoryPath
  */
  getHistoryPath: function () {
    var path = this.getPath(),  
        hashPath = location.hash.substr(1),
        url = path + hashPath;

    // Remove any stacked double stashes
    url = url.replace(/\/\//, '/');

    return url;
  },

  /**
    @private

    Returns the current path as it should appear for HashLocation supported
    browsers. This may very well differ from the real current path.

    @method getHashPath
  */
  getHashPath: function () {
    var historyPath = this.getHistoryPath(),
        rootPath = get(this, 'rootPath'),
        exp = new RegExp('(' + rootPath + ')(.+)'),
        url = historyPath.replace(exp, '$1#/$2');

    // Remove any stacked double stashes
    url = url.replace(/\/\//, '/');

    return url;
  }
};

Ember.Location.registerImplementation('auto', Ember.AutoLocation);
