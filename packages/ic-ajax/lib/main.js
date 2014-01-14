/*!
 * ic-ajax
 *
 * - (c) 2013 Instructure, Inc
 * - please see license at https://github.com/instructure/ic-ajax/blob/master/LICENSE
 * - inspired by discourse ajax: https://github.com/discourse/discourse/blob/master/app/assets/javascripts/discourse/mixins/ajax.js#L19
 */

;(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['ember'], function(Ember) { return factory(Ember); });
  } else if (typeof exports === 'object') {
    module.exports = factory(require('ember'));
  } else {
    root.ic = root.ic || {};
    root.ic.ajax = factory(Ember);
  }
}(this, function(Ember) {

  /*
   * jQuery.ajax wrapper, supports the same signature except providing
   * `success` and `error` handlers will throw an error (use promises instead)
   * and it resolves only the response (no access to jqXHR or textStatus).
   */

  var ajax = function() {
    return ajax.raw.apply(null, arguments).then(function(result) {
      return result.response;
    });
  };

  /*
   * Same as `ajax` except it resolves an object with `{response, textStatus,
   * jqXHR}`, useful if you need access to the jqXHR object for headers, etc.
   */

  ajax.raw = function() {
    return makePromise(parseArgs.apply(null, arguments));
  };

  /*
   * Defines a fixture that will be used instead of an actual ajax
   * request to a given url. This is useful for testing, allowing you to
   * stub out responses your application will send without requiring
   * libraries like sinon or mockjax, etc.
   *
   * For example:
   *
   *    ajax.defineFixture('/self', {
   *      response: { firstName: 'Ryan', lastName: 'Florence' },
   *      textStatus: 'success'
   *      jqXHR: {}
   *    });
   *
   * @param {String} url
   * @param {Object} fixture
   */
  ajax.defineFixture = function(url, fixture) {
    ajax.FIXTURES = ajax.FIXTURES || {};
    ajax.FIXTURES[url] = fixture;
  };

  /*
   * Looks up a fixture by url.
   *
   * @param {String} url
   */

  ajax.lookupFixture = function(url) {
    return ajax.FIXTURES && ajax.FIXTURES[url];
  };

  function makePromise(settings) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      var fixture = ajax.lookupFixture(settings.url);
      if (fixture) {
        return Ember.run(null, resolve, fixture);
      }
      settings.success = makeSuccess(resolve, reject);
      settings.error = makeError(resolve, reject);
      Ember.$.ajax(settings);
    });
  };

  function parseArgs() {
    var settings = {};
    if (arguments.length === 1) {
      if (typeof arguments[0] === "string") {
        settings.url = arguments[0];
      } else {
        settings = arguments[0];
      }
    } else if (arguments.length === 2) {
      settings = arguments[1];
      settings.url = arguments[0];
    }
    if (settings.success || settings.error) {
      throw new Error("ajax should use promises, received 'success' or 'error' callback");
    }
    return settings;
  }

  function makeSuccess(resolve, reject) {
    return function(response, textStatus, jqXHR) {
      Ember.run(null, resolve, {
        response: response,
        textStatus: textStatus,
        jqXHR: jqXHR
      });
    }
  }

  function makeError(resolve, reject) {
    return function(jqXHR, textStatus, errorThrown) {
      Ember.run(null, reject, {
        jqXHR: jqXHR,
        textStatus: textStatus,
        errorThrown: errorThrown
      });
    };
  }

  return ajax;

}));

