// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  SC.routes manages the browser location. You can change the hash part of the
  current location. The following code
  
      SC.routes.set('location', 'notes/edit/4');
  
  will change the location to http://domain.tld/my_app#notes/edit/4. Adding
  routes will register a handler that will be called whenever the location
  changes and matches the route:
  
      SC.routes.add(':controller/:action/:id', MyApp, MyApp.route);
  
  You can pass additional parameters in the location hash that will be relayed
  to the route handler:
  
      SC.routes.set('location', 'notes/show/4?format=xml&language=fr');
  
  The syntax for the location hash is described in the location property
  documentation, and the syntax for adding handlers is described in the
  add method documentation.
  
  Browsers keep track of the locations in their history, so when the user
  presses the 'back' or 'forward' button, the location is changed, SC.route
  catches it and calls your handler. Except for Internet Explorer versions 7
  and earlier, which do not modify the history stack when the location hash
  changes.
  
  SC.routes also supports HTML5 history, which uses a '/' instead of a '#'
  in the URLs, so that all your website's URLs are consistent.
*/
SC.routes = SC.Object.create(
  /** @scope SC.routes.prototype */{
  
  /**
    Set this property to YES if you want to use HTML5 history, if available on
    the browser, instead of the location hash.
    
    HTML 5 history uses the history.pushState method and the window's popstate
    event.
    
    By default it is NO, so your URLs will look like:

        http://domain.tld/my_app#notes/edit/4
    
    If set to YES and the browser supports pushState(), your URLs will look
    like:

        http://domain.tld/my_app/notes/edit/4
    
    You will also need to make sure that baseURI is properly configured, as
    well as your server so that your routes are properly pointing to your
    SproutCore application.
    
    @see http://dev.w3.org/html5/spec/history.html#the-history-interface
    @property
    @type {Boolean}
  */
  wantsHistory: NO,
  
  /**
    A read-only boolean indicating whether or not HTML5 history is used. Based
    on the value of wantsHistory and the browser's support for pushState.
    
    @see wantsHistory
    @property
    @type {Boolean}
  */
  usesHistory: null,
  
  /**
    The base URI used to resolve routes (which are relative URLs). Only used
    when usesHistory is equal to YES.
    
    The build tools automatically configure this value if you have the
    html5_history option activated in the Buildfile:

        config :my_app, :html5_history => true
    
    Alternatively, it uses by default the value of the href attribute of the
    <base> tag of the HTML document. For example:

        <base href="http://domain.tld/my_app">
    
    The value can also be customized before or during the exectution of the
    main() method.
    
    @see http://www.w3.org/TR/html5/semantics.html#the-base-element
    @property
    @type {String}
  */
  baseURI: document.baseURI,
  
  /** @private
    A boolean value indicating whether or not the ping method has been called
    to setup the SC.routes.
  
    @property
    @type {Boolean}
  */
  _didSetup: NO,
  
  /** @private
    Internal representation of the current location hash.
  
    @property
    @type {String}
  */
  _location: null,
  
  /** @private
    Routes are stored in a tree structure, this is the root node.
  
    @property
    @type {SC.routes._Route}
  */
  _firstRoute: null,
  
  /** @private
    Internal method used to extract and merge the parameters of a URL.
    
    @returns {Hash}
  */
  _extractParametersAndRoute: function(obj) {
    var params = {},
        route = obj.route || '',
        separator, parts, i, len, crumbs, key;
    
    separator = (route.indexOf('?') < 0 && route.indexOf('&') >= 0) ? '&' : '?';
    parts = route.split(separator);
    route = parts[0];
    if (parts.length === 1) {
      parts = [];
    } else if (parts.length === 2) {
      parts = parts[1].split('&');
    } else if (parts.length > 2) {
      parts.shift();
    }
    
    // extract the parameters from the route string
    len = parts.length;
    for (i = 0; i < len; ++i) {
      crumbs = parts[i].split('=');
      params[crumbs[0]] = crumbs[1];
    }
    
    // overlay any parameter passed in obj
    for (key in obj) {
      if (obj.hasOwnProperty(key) && key !== 'route') {
        params[key] = '' + obj[key];
      }
    }
    
    // build the route
    parts = [];
    for (key in params) {
      parts.push([key, params[key]].join('='));
    }
    params.params = separator + parts.join('&');
    params.route = route;
    
    return params;
  },
  
  /**
    The current location hash. It is the part in the browser's location after
    the '#' mark.
    
    The following code
    
        SC.routes.set('location', 'notes/edit/4');
    
    will change the location to http://domain.tld/my_app#notes/edit/4 and call
    the correct route handler if it has been registered with the add method.
    
    You can also pass additional parameters. They will be relayed to the route
    handler. For example, the following code
    
        SC.routes.add(':controller/:action/:id', MyApp, MyApp.route);
        SC.routes.set('location', 'notes/show/4?format=xml&language=fr');
    
    will change the location to 
    http://domain.tld/my_app#notes/show/4?format=xml&language=fr and call the
    MyApp.route method with the following argument:
    
        { route: 'notes/show/4',
          params: '?format=xml&language=fr',
          controller: 'notes',
          action: 'show',
          id: '4',
          format: 'xml',
          language: 'fr' }
    
    The location can also be set with a hash, the following code
    
        SC.routes.set('location',
          { route: 'notes/edit/4', format: 'xml', language: 'fr' });
    
    will change the location to
    http://domain.tld/my_app#notes/show/4?format=xml&language=fr.
    
    The 'notes/show/4&format=xml&language=fr' syntax for passing parameters,
    using a '&' instead of a '?', as used in SproutCore 1.0 is still supported.
    
    @property
    @type {String}
  */
  location: function(key, value) {
    this._skipRoute = NO;
    return this._extractLocation(key, value);
  }.property(),
  
  /*
    Works exactly like 'location' but you usee this property only when 
    you want to just change the location w/out triggering the routes
  */
  informLocation: function(key, value){
    this._skipRoute = YES;
    // This is a very special case where this property
    // has a very heavy influence on the 'location' property
    // this is a case where you might want to use idempotent
    // but you would take a performance hit because it is possible
    // call set() multiple time and we don't want to take the extra
    // cost, so we just invalidate the cached set() value ourselves
    // you shouldn't do this in your own code unless you REALLY
    // know what you are doing.
    var lsk = this.location.lastSetValueKey;
    if (lsk && this._kvo_cache) this._kvo_cache[lsk] = value;
    return this._extractLocation(key, value);
  }.property(),
  
  _extractLocation: function(key, value) {
    var crumbs, encodedValue;
    
    if (value !== undefined) {
      if (value === null) {
        value = '';
      }
      
      if (typeof(value) === 'object') {
        crumbs = this._extractParametersAndRoute(value);
        value = crumbs.route + crumbs.params;
      }
      
      if (!SC.empty(value) || (this._location && this._location !== value)) {
        encodedValue = encodeURI(value);
        
        if (this.usesHistory) {
          if (encodedValue.length > 0) {
            encodedValue = '/' + encodedValue;
          }
          window.history.pushState(null, null, this.get('baseURI') + encodedValue);
        } else {
          window.location.hash = encodedValue;
        }
      }
      
      this._location = value;
    }
    
    return this._location;
  },
  
  /**
    You usually don't need to call this method. It is done automatically after
    the application has been initialized.
    
    It registers for the hashchange event if available. If not, it creates a
    timer that looks for location changes every 150ms.
  */
  ping: function() {
    var that;
    
    if (!this._didSetup) {
      this._didSetup = YES;
      
      if (this.get('wantsHistory') && SC.platform.supportsHistory) {
        this.usesHistory = YES;
        
        this.popState();
        SC.Event.add(window, 'popstate', this, this.popState);
        
      } else {
        this.usesHistory = NO;
        
        if (SC.platform.supportsHashChange) {
          this.hashChange();
          SC.Event.add(window, 'hashchange', this, this.hashChange);
      
        } else {
          // we don't use a SC.Timer because we don't want
          // a run loop to be triggered at each ping
          that = this;
          this._invokeHashChange = function() {
            that.hashChange();
            setTimeout(that._invokeHashChange, 100);
          };
          this._invokeHashChange();
        }
      }
    }
  },
  
  /**
    Event handler for the hashchange event. Called automatically by the browser
    if it supports the hashchange event, or by our timer if not.
  */
  hashChange: function(event) {
    var loc = window.location.hash;
    
    // Remove the '#' prefix
    loc = (loc && loc.length > 0) ? loc.slice(1, loc.length) : '';
    
    if (!SC.browser.isMozilla) {
      // because of bug https://bugzilla.mozilla.org/show_bug.cgi?id=483304
      loc = decodeURI(loc);
    }
    
    if (this.get('location') !== loc && !this._skipRoute) {
      SC.run(function() {
        this.set('location', loc);
      }, this);
    }
    this._skipRoute = false;
  },
  
  popState: function(event) {
    var base = this.get('baseURI'),
        loc = document.location.href;
    
    if (loc.slice(0, base.length) === base) {
      
      // Remove the base prefix and the extra '/'
      loc = loc.slice(base.length + 1, loc.length);
      
      if (this.get('location') !== loc && !this._skipRoute) {
        SC.run(function() {
          this.set('location', loc);
        }, this);
      }
    }
    this._skipRoute = false;
  },
  
  /**
    Adds a route handler. Routes have the following format:

     - 'users/show/5' is a static route and only matches this exact string,
     - ':action/:controller/:id' is a dynamic route and the handler will be
        called with the 'action', 'controller' and 'id' parameters passed in a
        hash,
     - '*url' is a wildcard route, it matches the whole route and the handler
        will be called with the 'url' parameter passed in a hash.
    
    Route types can be combined, the following are valid routes:

     - 'users/:action/:id'
     - ':controller/show/:id'
     - ':controller/ *url' (ignore the space, because of jslint)
    
    @param {String} route the route to be registered
    @param {Object} target the object on which the method will be called, or
      directly the function to be called to handle the route
    @param {Function} method the method to be called on target to handle the
      route, can be a function or a string
  */
  add: function(route, target, method) {
    if (!this._didSetup) {
      this.invokeLast(this.ping);
    }
    
    if (method === undefined && SC.typeOf(target) === SC.T_FUNCTION) {
      method = target;
      target = null;
    } else if (SC.typeOf(method) === SC.T_STRING) {
      method = target[method];
    }
    
    if (!this._firstRoute) this._firstRoute = this._Route.create();
    this._firstRoute.add(route.split('/'), target, method);
    
    return this;
  },
  
  /**
    Observer of the 'location' property that calls the correct route handler
    when the location changes.
  */
  locationDidChange: function() {
    this.trigger();
  }.observes('location'),
  
  /**
    Triggers a route even if already in that route (does change the location, if it
    is not already changed, as well).
    
    If the location is not the same as the supplied location, this simply lets "location"
    handle it (which ends up coming back to here).
  */
  trigger: function() {
    var firstRoute = this._firstRoute,
        location = this.get('location'),
        params, route;
    
    if (firstRoute) {
      params = this._extractParametersAndRoute({ route: location });
      location = params.route;
      delete params.route;
      delete params.params;
      route = firstRoute.routeForParts(location.split('/'), params);
      if (route && route.method) {
        route.method.call(route.target || this, params);
      }
    }
  },
  
  /**
    @private
    @class

    SC.routes._Route is a class used internally by SC.routes. The routes defined by your
    application are stored in a tree structure, and this is the class for the
    nodes.
  */
  _Route: SC.Object.extend(
  /** @scope SC.routes._Route.prototype */ {

    target: null,

    method: null,

    staticRoutes: null,

    dynamicRoutes: null,

    wildcardRoutes: null,

    add: function(parts, target, method) {
      var part, nextRoute;

      // clone the parts array because we are going to alter it
      parts = SC.clone(parts);

      if (!parts || parts.length === 0) {
        this.target = target;
        this.method = method;

      } else {
        part = parts.shift();

        // there are 3 types of routes
        switch (part.slice(0, 1)) {

        // 1. dynamic routes
        case ':':
          part = part.slice(1, part.length);
          if (!this.dynamicRoutes) this.dynamicRoutes = {};
          if (!this.dynamicRoutes[part]) this.dynamicRoutes[part] = this.constructor.create();
          nextRoute = this.dynamicRoutes[part];
          break;

        // 2. wildcard routes
        case '*':
          part = part.slice(1, part.length);
          if (!this.wildcardRoutes) this.wildcardRoutes = {};
          nextRoute = this.wildcardRoutes[part] = this.constructor.create();
          break;

        // 3. static routes
        default:
          if (!this.staticRoutes) this.staticRoutes = {};
          if (!this.staticRoutes[part]) this.staticRoutes[part] = this.constructor.create();
          nextRoute = this.staticRoutes[part];
        }

        // recursively add the rest of the route
        if (nextRoute) nextRoute.add(parts, target, method);
      }
    },

    routeForParts: function(parts, params) {
      var part, key, route;

      // clone the parts array because we are going to alter it
      parts = SC.clone(parts);

      // if parts is empty, we are done
      if (!parts || parts.length === 0) {
        return this.method ? this : null;

      } else {
        part = parts.shift();

        // try to match a static route
        if (this.staticRoutes && this.staticRoutes[part]) {
          return this.staticRoutes[part].routeForParts(parts, params);

        } else {

          // else, try to match a dynamic route
          for (key in this.dynamicRoutes) {
            route = this.dynamicRoutes[key].routeForParts(parts, params);
            if (route) {
              params[key] = part;
              return route;
            }
          }

          // else, try to match a wilcard route
          for (key in this.wildcardRoutes) {
            parts.unshift(part);
            params[key] = parts.join('/');
            return this.wildcardRoutes[key].routeForParts(null, params);
          }

          // if nothing was found, it means that there is no match
          return null;
        }
      }
    }

  })
  
});
