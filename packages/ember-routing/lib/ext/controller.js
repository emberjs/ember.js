import Ember from "ember-metal/core"; // FEATURES, deprecate
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";
import { typeOf, meta } from "ember-metal/utils";
import merge from "ember-metal/merge";

import ControllerMixin from "ember-runtime/mixins/controller";

/**
@module ember
@submodule ember-routing
*/

ControllerMixin.reopen({
  concatenatedProperties: ['queryParams', '_pCacheMeta'],

  init() {
    this._super(...arguments);
    listenForQueryParamChanges(this);
  },

  /**
    Defines which query parameters the controller accepts.
    If you give the names ['category','page'] it will bind
    the values of these query parameters to the variables
    `this.category` and `this.page`

    @property queryParams
    @public
  */
  queryParams: null,

  /**
    @property _qpDelegate
    @private
  */
  _qpDelegate: null,

  /**
    @property _normalizedQueryParams
    @private
  */
  _normalizedQueryParams: computed(function() {
    var m = meta(this);
    if (m.proto !== this) {
      return get(m.proto, '_normalizedQueryParams');
    }

    var queryParams = get(this, 'queryParams');
    if (queryParams._qpMap) {
      return queryParams._qpMap;
    }

    var qpMap = queryParams._qpMap = {};

    for (var i = 0, len = queryParams.length; i < len; ++i) {
      accumulateQueryParamDescriptors(queryParams[i], qpMap);
    }

    return qpMap;
  }),

  /**
    @property _cacheMeta
    @private
  */
  _cacheMeta: computed(function() {
    var m = meta(this);
    if (m.proto !== this) {
      return get(m.proto, '_cacheMeta');
    }

    var cacheMeta = {};
    var qpMap = get(this, '_normalizedQueryParams');
    for (var prop in qpMap) {
      if (!qpMap.hasOwnProperty(prop)) { continue; }

      var qp = qpMap[prop];
      var scope = qp.scope;
      var parts;

      if (scope === 'controller') {
        parts = [];
      }

      cacheMeta[prop] = {
        parts: parts, // provided by route if 'model' scope
        values: null, // provided by route
        scope: scope,
        prefix: "",
        def: get(this, prop)
      };
    }

    return cacheMeta;
  }),

  /**
    @method _updateCacheParams
    @private
  */
  _updateCacheParams(params) {
    var cacheMeta = get(this, '_cacheMeta');
    for (var prop in cacheMeta) {
      if (!cacheMeta.hasOwnProperty(prop)) { continue; }
      var propMeta = cacheMeta[prop];
      propMeta.values = params;

      var cacheKey = this._calculateCacheKey(propMeta.prefix, propMeta.parts, propMeta.values);
      var cache = this._bucketCache;

      if (cache) {
        var value = cache.lookup(cacheKey, prop, propMeta.def);
        set(this, prop, value);
      }
    }
  },

  /**
    @method _qpChanged
    @private
  */
  _qpChanged(controller, _prop) {
    var prop = _prop.substr(0, _prop.length-3);
    var cacheMeta = get(controller, '_cacheMeta');
    var propCache = cacheMeta[prop];
    var cacheKey = controller._calculateCacheKey(propCache.prefix || "", propCache.parts, propCache.values);
    var value = get(controller, prop);

    // 1. Update model-dep cache
    var cache = this._bucketCache;
    if (cache) {
      controller._bucketCache.stash(cacheKey, prop, value);
    }

    // 2. Notify a delegate (e.g. to fire a qp transition)
    var delegate = controller._qpDelegate;
    if (delegate) {
      delegate(controller, prop);
    }
  },

  /**
    @method _calculateCacheKey
    @private
  */
  _calculateCacheKey(prefix, _parts, values) {
    var parts = _parts || [];
    var suffixes = "";
    for (var i = 0, len = parts.length; i < len; ++i) {
      var part = parts[i];
      var value = get(values, part);
      suffixes += "::" + part + ":" + value;
    }
    return prefix + suffixes.replace(ALL_PERIODS_REGEX, '-');
  },

  /**
    Transition the application into another route. The route may
    be either a single route or route path:

    ```javascript
    aController.transitionToRoute('blogPosts');
    aController.transitionToRoute('blogPosts.recentEntries');
    ```

    Optionally supply a model for the route in question. The model
    will be serialized into the URL using the `serialize` hook of
    the route:

    ```javascript
    aController.transitionToRoute('blogPost', aPost);
    ```

    If a literal is passed (such as a number or a string), it will
    be treated as an identifier instead. In this case, the `model`
    hook of the route will be triggered:

    ```javascript
    aController.transitionToRoute('blogPost', 1);
    ```

    Multiple models will be applied last to first recursively up the
    resource tree.

    ```javascript
    App.Router.map(function() {
      this.resource('blogPost', {path:':blogPostId'}, function() {
        this.resource('blogComment', {path: ':blogCommentId'});
      });
    });

    aController.transitionToRoute('blogComment', aPost, aComment);
    aController.transitionToRoute('blogComment', 1, 13);
    ```

    It is also possible to pass a URL (a string that starts with a
    `/`). This is intended for testing and debugging purposes and
    should rarely be used in production code.

    ```javascript
    aController.transitionToRoute('/');
    aController.transitionToRoute('/blog/post/1/comment/13');
    aController.transitionToRoute('/blog/posts?sort=title');
    ```

    An options hash with a `queryParams` property may be provided as
    the final argument to add query parameters to the destination URL.

    ```javascript
    aController.transitionToRoute('blogPost', 1, {
      queryParams: {showComments: 'true'}
    });

    // if you just want to transition the query parameters without changing the route
    aController.transitionToRoute({queryParams: {sort: 'date'}});
    ```

    See also [replaceRoute](/api/classes/Ember.ControllerMixin.html#method_replaceRoute).

    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
      while transitioning to the route.
    @param {Object} [options] optional hash with a queryParams property
      containing a mapping of query parameters
    @for Ember.ControllerMixin
    @method transitionToRoute
  */
  transitionToRoute() {
    // target may be either another controller or a router
    var target = get(this, 'target');
    var method = target.transitionToRoute || target.transitionTo;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method transitionTo
  */
  transitionTo() {
    Ember.deprecate("transitionTo is deprecated. Please use transitionToRoute.");
    return this.transitionToRoute(...arguments);
  },

  /**
    Transition into another route while replacing the current URL, if possible.
    This will replace the current history entry instead of adding a new one.
    Beside that, it is identical to `transitionToRoute` in all other respects.

    ```javascript
    aController.replaceRoute('blogPosts');
    aController.replaceRoute('blogPosts.recentEntries');
    ```

    Optionally supply a model for the route in question. The model
    will be serialized into the URL using the `serialize` hook of
    the route:

    ```javascript
    aController.replaceRoute('blogPost', aPost);
    ```

    If a literal is passed (such as a number or a string), it will
    be treated as an identifier instead. In this case, the `model`
    hook of the route will be triggered:

    ```javascript
    aController.replaceRoute('blogPost', 1);
    ```

    Multiple models will be applied last to first recursively up the
    resource tree.

    ```javascript
    App.Router.map(function() {
      this.resource('blogPost', {path:':blogPostId'}, function() {
        this.resource('blogComment', {path: ':blogCommentId'});
      });
    });

    aController.replaceRoute('blogComment', aPost, aComment);
    aController.replaceRoute('blogComment', 1, 13);
    ```

    It is also possible to pass a URL (a string that starts with a
    `/`). This is intended for testing and debugging purposes and
    should rarely be used in production code.

    ```javascript
    aController.replaceRoute('/');
    aController.replaceRoute('/blog/post/1/comment/13');
    ```

    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
    while transitioning to the route.
    @for Ember.ControllerMixin
    @method replaceRoute
  */
  replaceRoute() {
    // target may be either another controller or a router
    var target = get(this, 'target');
    var method = target.replaceRoute || target.replaceWith;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method replaceWith
  */
  replaceWith() {
    Ember.deprecate("replaceWith is deprecated. Please use replaceRoute.");
    return this.replaceRoute(...arguments);
  }
});

var ALL_PERIODS_REGEX = /\./g;

function accumulateQueryParamDescriptors(_desc, accum) {
  var desc = _desc;
  var tmp;
  if (typeOf(desc) === 'string') {
    tmp = {};
    tmp[desc] = { as: null };
    desc = tmp;
  }

  for (var key in desc) {
    if (!desc.hasOwnProperty(key)) { return; }

    var singleDesc = desc[key];
    if (typeOf(singleDesc) === 'string') {
      singleDesc = { as: singleDesc };
    }

    tmp = accum[key] || { as: null, scope: 'model' };
    merge(tmp, singleDesc);

    accum[key] = tmp;
  }
}

function listenForQueryParamChanges(controller) {
  var qpMap = get(controller, '_normalizedQueryParams');
  for (var prop in qpMap) {
    if (!qpMap.hasOwnProperty(prop)) { continue; }
    controller.addObserver(prop + '.[]', controller, controller._qpChanged);
  }
}


export default ControllerMixin;
