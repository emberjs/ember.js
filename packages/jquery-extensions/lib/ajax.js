require('ember-runtime');
require('ember-runtime/ext/ember');
require('ember-views/core');

if (Ember.FEATURES.isEnabled("ajax")) {

  var stringify = (function(){
    if (window.JSON && window.JSON.stringify) {
      return window.JSON.stringify;
    }

    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON?redirectlocale=en-US&redirectslug=JavaScript%2FReference%2FGlobal_Objects%2FJSON#Browser_compatibility
    function stringify (vContent) {
      if (vContent instanceof Object) {
        var sOutput = "";
        if (vContent.constructor === Array) {
          for (var nId = 0; nId < vContent.length; sOutput += stringify(vContent[nId]) + ",", nId++);
          return "[" + sOutput.substr(0, sOutput.length - 1) + "]";
        }
        if (vContent.toString !== Object.prototype.toString) { return "\"" + vContent.toString().replace(/"/g, "\\$&") + "\""; }
        for (var sProp in vContent) { sOutput += "\"" + sProp.replace(/"/g, "\\$&") + "\":" + stringify(vContent[sProp]) + ","; }
        return "{" + sOutput.substr(0, sOutput.length - 1) + "}";
      }
      return typeof vContent === "string" ? "\"" + vContent.replace(/"/g, "\\$&") + "\"" : String(vContent);
    }

    return stringify;
  })();


  var get = Ember.get,
  setProperties = Ember.setProperties,
  jQuery = Ember.$;

  /**
  @module ember
  @submodule jquery-extensions
  */

  /**
    Execute an ajax request, using the same parameters like `jQuery.ajax`
    but take advantage of using promises provided by `RSVP.Promise` with
    consistent fulfillment value and rejection reason, and running in the
    runloop.

    The use of `Ember.ajax` is encouraged against `jQuery.ajax`, since
    the jQuery implementation don't run in the runloop.

    When the request is done, a normalized event object is passed to
    callback handlers, holding the jQuery params:

    ```javascript
    Ember.ajax('/posts').then(function(evt) {
      var posts = evt.data;
      // do something with the posts
    }, function(evt) {
      // something is wrong, handle the error
      alert(evt.xhr.statustext);
    });
    ```

    By example the format of the object from a successful request:

    ```javascript
    {
      data: { people: [ ... ] },
      textStatus: 'success',
      xhr: { status: 200, ... }
    }
    ```

    And for failure:

    ```javascript
    {
      textStatus: 'error',
      xhr: { status: 400, ... },
      errorThrown: 'Ńot found'
    }
    ```

    @class ajax
    @namespace Ember
    @static
    @constructor
    @param {String|Object} urlOrOptions An url or options hash like jQuery.ajax
    @param {Object} [options]
      Options hash like jQuery.ajax
  */
  Ember.ajax = function(urlOrOptions, options) {
    options = optionsOrDefault(options);
    if (typeof urlOrOptions === 'string') {
      options.url = urlOrOptions;
    } else {
      options = urlOrOptions;
    }
    return Ember.ajax.AjaxRequest.create({ options: options }).send();
  };

  var optionsOrDefault = function(options) {
    return options || {};
  };

  var setupHandlers = function(ajaxRequest, options, resolve, reject) {
    options.success = function(data, textStatus, jqXHR) {
      var event = ajaxRequest._normalizeSuccessAjaxParams(data, textStatus, jqXHR);
      Ember.run(ajaxRequest, resolve, event);
    };

    options.error = function(jqXHR, textStatus, errorThrown) {
      var event = ajaxRequest._normalizeErrorAjaxParams(textStatus, jqXHR, errorThrown);
      // remove then from jQuery promise to prevent unneeded async-step
      if (jqXHR) {
        jqXHR.then = null;
      }
      Ember.run(ajaxRequest, reject, event);
    };
  };

  Ember.ajax.AjaxRequest = Ember.Object.extend({
    options: null,
    send: function() {
      var self = this,
      url = get(this, 'options.url'),
      options = get(this, 'options') || {};

      options = this._setupOptions(options);

      Ember.assert('The url must be present', url);
      Ember.assert('The success and error options are not allowed. Use Ember.ajax(..).then(/* success handler */, /* error handler */) instead', !(options.success || options.error));
      Ember.warn('Using context option, will not change the context of promise callbacks', !options.context);

      return new Ember.RSVP.Promise(function(resolve, reject) {
        setupHandlers(self, options, resolve, reject);
        Ember.$.ajax(options);
      });
    },
    _normalizeSuccessAjaxParams: function(data, textStatus, jqXHR) {
      return { data: data, textStatus: textStatus, xhr: jqXHR };
    },
    _normalizeErrorAjaxParams: function(textStatus, jqXHR, errorThrown) {
      return { textStatus: textStatus, xhr: jqXHR, errorThrown: errorThrown };
    },
    _setupOptions: function(options) {
      return options;
    }
  });

  Ember.ajax.JSONRequest = Ember.ajax.AjaxRequest.extend({
    _setupOptions: function(options) {
      var clonedOptions = jQuery.extend(true, {}, options);
      clonedOptions.type = clonedOptions.type || 'GET';
      clonedOptions.dataType = 'json';
      if (clonedOptions.data && clonedOptions.type !== 'GET') {
        clonedOptions.contentType = 'application/json; charset=utf-8';
        clonedOptions.data = stringify(clonedOptions.data);
      }
      return clonedOptions;
    },
    _normalizeSuccessAjaxParams: function(data, textStatus, jqXHR) {
      return data;
    }
  });

  /**
  @module ember
  @submodule jquery-extensions
  */

  /**
    Execute an ajax request using `jQuery.ajax`, but taking advantage of the
    promises offered by `RSVP.Promise` and running inside the runloop.

    The use of `Ember.getJSON` is encouraged over `jQuery.ajax`,
    as the jQuery implementation does not run in the runloop.

    The main diference between `Ember.getJSON` and `Ember.ajax`
    is that when the request is done, the success handler is
    resolved with the returned json payload:

    ```javascript
    Ember.getJSON('/posts').then(function(posts) {
      // do something with the posts
    }, function(evt) {
      // something is wrong, handle the error
      alert(evt.xhr.statustext);
    });
    ```

    So you can use the following in your routes:

    ```javascript
    App.PostsRoute = Ember.Route.extend({
      model: function() {
        return Ember.getJSON('/posts');
      }
    });
    ```

    The default http method is GET, but you can supply a different
    one using the second parameter:

    ```javascript
    App.EditPostRoute = Ember.Route.extend({
      actions: {
        save: function() {
          var post = // get the post
          Ember.getJSON('/post', 'PUT', { data: post });
        }
      }
    });
    ```

    @class getJSON
    @namespace Ember
    @static
    @constructor
    @param {String} url The target url to send the request
    @param {String|Object} [typeOrOptions]
      The http method type or options like jQuery.ajax
    @param {Object} [options]
      If you use the http method string in typeOrOptions param,
      this will be an options hash like jQuery.ajax
  */
  Ember.getJSON = function(url, typeOrOptions, options) {
    var opt = optionsOrDefault(options);

    if (typeof typeOrOptions === 'string') {
      opt.type = typeOrOptions;
    } else if (typeof typeOrOptions === 'object' && !options) {
      opt = typeOrOptions;
    }
    opt.url = url;
    return Ember.ajax.JSONRequest.create({ options: opt }).send();
  };

}