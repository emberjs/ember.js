if (Ember.FEATURES.isEnabled("ember-routing-auto-location")) {
  /**
  @module ember
  @submodule ember-routing
  */

  var get = Ember.get, set = Ember.set;

  /**
    Ember.AutoLocation will select the best location option based off browser
    support with the priority order: history, hash, none.

    Clean pushState paths accessed by hashchange-only browsers will be redirected
    to the hash-equivalent and vice versa so future transitions are consistent.

    Keep in mind that since some of your users will use `HistoryLocation`, your
    server must serve the Ember app at all the routes you define.

    @class AutoLocation
    @namespace Ember
    @static
  */
  var AutoLocation = Ember.AutoLocation = {

    /**
      @private

      Will be pre-pended to path upon state change.

      @property rootURL
      @default '/'
    */
    _rootURL: '/',

    /**
      @private

      Attached for mocking in tests

      @property _window
      @default window
    */
    _window: window,

    /**
      @private

      Attached for mocking in tests

      @property location
      @default window.location
    */
    _location: window.location,

    /**
      @private

      Attached for mocking in tests

      @property _history
      @default window.history
    */
    _history: window.history,

    /**
      @private

      Attached for mocking in tests

      @property _HistoryLocation
      @default Ember.HistoryLocation
    */
    _HistoryLocation: Ember.HistoryLocation,

    /**
      @private

      Attached for mocking in tests

      @property _HashLocation
      @default Ember.HashLocation
    */
    _HashLocation: Ember.HashLocation,

    /**
      @private

      Attached for mocking in tests

      @property _NoneLocation
      @default Ember.NoneLocation
    */
    _NoneLocation: Ember.NoneLocation,

    /**
      @private

      Returns location.origin or builds it if device doesn't support it.

      @method _getOrigin
    */
    _getOrigin: function () {
      var location = this._location,
          origin = location.origin;

      // Older browsers, especially IE, don't have origin
      if (!origin) {
        origin = location.protocol + '//' + location.hostname;
        
        if (location.port) {
          origin += ':' + location.port;
        }
      }

      return origin;
    },

    /**
      @private

      We assume that if the history object has a pushState method, the host should
      support HistoryLocation.

      @method _getSupportsHistory
    */
    _getSupportsHistory: function () {
      // Boosted from Modernizr: https://github.com/Modernizr/Modernizr/blob/master/feature-detects/history.js
      // The stock browser on Android 2.2 & 2.3 returns positive on history support
      // Unfortunately support is really buggy and there is no clean way to detect
      // these bugs, so we fall back to a user agent sniff :(
      var userAgent = this._window.navigator.userAgent;

      // We only want Android 2, stock browser, and not Chrome which identifies
      // itself as 'Mobile Safari' as well
      if (userAgent.indexOf('Android 2') !== -1 &&
          userAgent.indexOf('Mobile Safari') !== -1 &&
          userAgent.indexOf('Chrome') === -1) {
        return false;
      }

      return !!(this._history && 'pushState' in this._history);
    },

    /**
      @private

      IE8 running in IE7 compatibility mode gives false positive, so we must also
      check documentMode.

      @method _getSupportsHashChange
    */
    _getSupportsHashChange: function () {
      var window = this._window,
          documentMode = window.document.documentMode;

      return ('onhashchange' in window && (documentMode === undefined || documentMode > 7 ));
    },

    /**
      @private

      Redirects the browser using location.replace, prepending the locatin.origin
      to prevent phishing attempts

      @method _replacePath
    */
    _replacePath: function (path) {
      this._location.replace(this._getOrigin() + path);
    },

    /**
      @private
      @method _getRootURL
    */
    _getRootURL: function () {
      return this._rootURL;
    },

    /**
      @private

      Returns the current `location.pathname`, normalized for IE inconsistencies.

      @method _getPath
    */
    _getPath: function () {
      var pathname = this._location.pathname;
      // Various versions of IE/Opera don't always return a leading slash
      if (pathname.charAt(0) !== '/') {
        pathname = '/' + pathname;
      }

      return pathname;
    },

    /**
      @private

      Returns normalized location.hash as an alias to Ember.Location._getHash

      @method _getHash
    */
    _getHash: Ember.Location._getHash,

    /**
      @private

      Returns location.search

      @method _getQuery
    */
    _getQuery: function () {
      return this._location.search;
    },

    /**
      @private

      Returns the full pathname including query and hash

      @method _getFullPath
    */
    _getFullPath: function () {
      return this._getPath() + this._getQuery() + this._getHash();
    },

    /**
      @private

      Returns the current path as it should appear for HistoryLocation supported
      browsers. This may very well differ from the real current path (e.g. if it 
      starts off as a hashed URL)

      @method _getHistoryPath
    */
    _getHistoryPath: function () {
      var rootURL = this._getRootURL(),
          path = this._getPath(),
          hash = this._getHash(),
          query = this._getQuery(),
          rootURLIndex = path.indexOf(rootURL),
          routeHash, hashParts;

      Ember.assert('Path ' + path + ' does not start with the provided rootURL ' + rootURL, rootURLIndex === 0);

      // By convention, Ember.js routes using HashLocation are required to start
      // with `#/`. Anything else should NOT be considered a route and should
      // be passed straight through, without transformation.
      if (hash.substr(0, 2) === '#/') {
        // There could be extra hash segments after the route
        hashParts = hash.substr(1).split('#');
        // The first one is always the route url
        routeHash = hashParts.shift();

        // If the path already has a trailing slash, remove the one
        // from the hashed route so we don't double up.
        if (path.slice(-1) === '/') {
            routeHash = routeHash.substr(1);
        }

        // This is the "expected" final order
        path += routeHash;
        path += query;

        if (hashParts.length) {
          path += '#' + hashParts.join('#');
        }
      } else {
        path += query;
        path += hash;
      }

      return path;
    },

    /**
      @private

      Returns the current path as it should appear for HashLocation supported
      browsers. This may very well differ from the real current path.

      @method _getHashPath
    */
    _getHashPath: function () {
      var rootURL = this._getRootURL(),
          path = rootURL,
          historyPath = this._getHistoryPath(),
          routePath = historyPath.substr(rootURL.length);

      if (routePath !== '') {
        if (routePath.charAt(0) !== '/') {
          routePath = '/' + routePath;
        }

        path += '#' + routePath;
      }

      return path;
    },

    /**
      Selects the best location option based off browser support and returns an
      instance of that Location class.
    
      @see Ember.AutoLocation
      @method create
    */
    create: function (options) {
      if (options && options.rootURL) {
        this._rootURL = options.rootURL;
      }

      var historyPath, hashPath,
          cancelRouterSetup = false,
          implementationClass = this._NoneLocation,
          currentPath = this._getFullPath();

      if (this._getSupportsHistory()) {
        historyPath = this._getHistoryPath();

        // Since we support history paths, let's be sure we're using them else 
        // switch the location over to it.
        if (currentPath === historyPath) {
          implementationClass = this._HistoryLocation;
        } else {
          cancelRouterSetup = true;
          this._replacePath(historyPath);
        }

      } else if (this._getSupportsHashChange()) {
        hashPath = this._getHashPath();

        // Be sure we're using a hashed path, otherwise let's switch over it to so
        // we start off clean and consistent. We'll count an index path with no
        // hash as "good enough" as well.
        if (currentPath === hashPath || (currentPath === '/' && hashPath === '/#/')) {
          implementationClass = this._HashLocation;
        } else {
          // Our URL isn't in the expected hash-supported format, so we want to
          // cancel the router setup and replace the URL to start off clean
          cancelRouterSetup = true;
          this._replacePath(hashPath);
        }
      }

      var implementation = implementationClass.create.apply(implementationClass, arguments);

      if (cancelRouterSetup) {
        set(implementation, 'cancelRouterSetup', true);
      }
      
      return implementation;
    }
  };
}