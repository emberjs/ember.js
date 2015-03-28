import Ember from "ember-metal/core"; // FEATURES
import { set } from "ember-metal/property_set";

import EmberLocation from "ember-routing/location/api";
import HistoryLocation from "ember-routing/location/history_location";
import HashLocation from "ember-routing/location/hash_location";
import NoneLocation from "ember-routing/location/none_location";

import environment from "ember-metal/environment";
import { supportsHashChange, supportsHistory } from "ember-routing/location/feature_detect";

/**
@module ember
@submodule ember-routing
*/

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
export default {
  /**
    @private

    Attached for mocking in tests

    @property location
    @default environment.location
  */
  _location: environment.location,

  /**
    @private

    Attached for mocking in tests

    @since 1.5.1
    @property _history
    @default environment.history
  */
  _history: environment.history,

  /**
    @private

    This property is used by router:main to know whether to cancel the routing
    setup process, which is needed while we redirect the browser.

    @since 1.5.1
    @property cancelRouterSetup
    @default false
  */
  cancelRouterSetup: false,

  /**
    @private

    Will be pre-pended to path upon state change.

    @since 1.5.1
    @property rootURL
    @default '/'
  */
  rootURL: '/',

  /**
    @private

    Attached for mocking in tests

    @since 1.5.1
    @property _HistoryLocation
    @default Ember.HistoryLocation
  */
  _HistoryLocation: HistoryLocation,

  /**
    @private

    Attached for mocking in tests

    @since 1.5.1
    @property _HashLocation
    @default Ember.HashLocation
  */
  _HashLocation: HashLocation,

  /**
    @private

    Attached for mocking in tests

    @since 1.5.1
    @property _NoneLocation
    @default Ember.NoneLocation
  */
  _NoneLocation: NoneLocation,

  /**
    @private

    Returns location.origin or builds it if device doesn't support it.

    @method _getOrigin
  */
  _getOrigin: function () {
    var location = this._location;
    var origin = location.origin;

    // Older browsers, especially IE, don't have origin
    if (!origin) {
      origin = location.protocol + '//' + location.hostname;

      if (location.port) {
        origin += ':' + location.port;
      }
    }

    return origin;
  },

  _userAgent: environment.userAgent,

  /**
    @private

    @method _getSupportsHistory
  */
  _getSupportsHistory: function () {
    return supportsHistory(environment.userAgent, environment.history);
  },

  /**
    @private

    @method _getSupportsHashChange
  */
  _getSupportsHashChange: function () {
    return supportsHashChange(document.documentMode, window);
  },

  /**
    @private

    Redirects the browser using location.replace, prepending the location.origin
    to prevent phishing attempts

    @method _replacePath
  */
  _replacePath: function (path) {
    this._location.replace(this._getOrigin() + path);
  },

  /**
    @since 1.5.1
    @private
    @method _getRootURL
  */
  _getRootURL: function () {
    return this.rootURL;
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

    @since 1.5.1
    @method _getHash
  */
  _getHash: EmberLocation._getHash,

  /**
    @private

    Returns location.search

    @since 1.5.1
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
    var rootURL = this._getRootURL();
    var path = this._getPath();
    var hash = this._getHash();
    var query = this._getQuery();
    var rootURLIndex = path.indexOf(rootURL);
    var routeHash, hashParts;

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
    var rootURL = this._getRootURL();
    var path = rootURL;
    var historyPath = this._getHistoryPath();
    var routePath = historyPath.substr(rootURL.length);

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
      Ember.assert('rootURL must end with a trailing forward slash e.g. "/app/"',
                   options.rootURL.charAt(options.rootURL.length-1) === '/');
      this.rootURL = options.rootURL;
    }

    var historyPath, hashPath;
    var cancelRouterSetup = false;
    var implementationClass = this._NoneLocation;
    var currentPath = this._getFullPath();

    if (this._getSupportsHistory()) {
      historyPath = this._getHistoryPath();

      // Since we support history paths, let's be sure we're using them else
      // switch the location over to it.
      if (currentPath === historyPath) {
        implementationClass = this._HistoryLocation;
      } else {
        if (currentPath.substr(0, 2) === '/#') {
          this._history.replaceState({ path: historyPath }, null, historyPath);
          implementationClass = this._HistoryLocation;
        } else {
          cancelRouterSetup = true;
          this._replacePath(historyPath);
        }
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
