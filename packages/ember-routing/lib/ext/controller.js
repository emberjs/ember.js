import Ember from "ember-metal/core"; // FEATURES, deprecate
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";
import { typeOf } from "ember-metal/utils";
import { meta } from "ember-metal/utils";
import merge from "ember-metal/merge";
import { map } from "ember-metal/enumerable_utils";

import ControllerMixin from "ember-runtime/mixins/controller";

/**
@module ember
@submodule ember-routing
*/

ControllerMixin.reopen({
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
      this.resource('blogPost', {path:':blogPostId'}, function(){
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
    ```

    See also [replaceRoute](/api/classes/Ember.ControllerMixin.html#method_replaceRoute).

    @param {String} name the name of the route or a URL
    @param {...Object} models the model(s) or identifier(s) to be used
    while transitioning to the route.
    @for Ember.ControllerMixin
    @method transitionToRoute
  */
  transitionToRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.transitionToRoute || target.transitionTo;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method transitionTo
  */
  transitionTo: function() {
    Ember.deprecate("transitionTo is deprecated. Please use transitionToRoute.");
    return this.transitionToRoute.apply(this, arguments);
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
      this.resource('blogPost', {path:':blogPostId'}, function(){
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
  replaceRoute: function() {
    // target may be either another controller or a router
    var target = get(this, 'target'),
        method = target.replaceRoute || target.replaceWith;
    return method.apply(target, arguments);
  },

  /**
    @deprecated
    @for Ember.ControllerMixin
    @method replaceWith
  */
  replaceWith: function() {
    Ember.deprecate("replaceWith is deprecated. Please use replaceRoute.");
    return this.replaceRoute.apply(this, arguments);
  }
});

var ALL_PERIODS_REGEX = /\./g;

if (Ember.FEATURES.isEnabled("query-params-new")) {
  ControllerMixin.reopen({
    init: function() {
      this._super.apply(this, arguments);
      listenForQueryParamChanges(this);
    },

    concatenatedProperties: ['queryParams', '_pCacheMeta'],
    queryParams: null,

    _qpDelegate: null,
    _normalizedQueryParams: computed(function() {
      var m = meta(this);
      if (m.proto !== this) {
        return get(m.proto, '_normalizedQueryParams');
      }

      var queryParams = this.queryParams;
      if (queryParams._qpMap) {
        return queryParams._qpMap;
      }

      var qpMap = queryParams._qpMap = {};

      for (var i = 0, len = queryParams.length; i < len; ++i) {
        accumulateQueryParamDescriptors(queryParams[i], qpMap);
      }

      return qpMap;
    }),

    _cacheMeta: computed(function() {
      var m = meta(this);
      if (m.proto !== this) {
        return get(m.proto, '_cacheMeta');
      }

      var cacheMeta = {},
          qpMap = get(this, '_normalizedQueryParams');
      for (var prop in qpMap) {
        if (!qpMap.hasOwnProperty(prop)) { continue; }

        var qp = qpMap[prop],
            scope = qp.scope,
            parts;

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

    _updateCacheParams: function(params) {
      var cacheMeta = get(this, '_cacheMeta');
      for (var prop in cacheMeta) {
        if (!cacheMeta.hasOwnProperty(prop)) { continue; }
        var propMeta = cacheMeta[prop];
        propMeta.values = params;

        var cacheKey = this._calculateCacheKey(propMeta.prefix, propMeta.parts, propMeta.values);
        var cache = this._bucketCache;
        var value = cache.lookup(cacheKey, prop, propMeta.def);

        set(this, prop, value);
      }
    },

    _qpChanged: function(controller, _prop) {
      var prop = _prop.substr(0, _prop.length-3);
      var cacheMeta = get(controller, '_cacheMeta');
      var propCache = cacheMeta[prop];
      var cacheKey = controller._calculateCacheKey(propCache.prefix || "", propCache.parts, propCache.values);
      var value = get(controller, prop);

      // 1. Update model-dep cache
      controller._bucketCache.stash(cacheKey, prop, value);

      // 2. Notify a delegate (e.g. to fire a qp transition)
      var delegate = controller._qpDelegate;
      if (delegate) {
        delegate(controller, prop);
      }
    },

    _calculateCacheKey: function(prefix, _parts, values) {
      var parts = _parts || [], suffixes = "";
      for (var i = 0, len = parts.length; i < len; ++i) {
        var part = parts[i];
        var value = get(values, part);
        suffixes += "::" + part + ":" + value;
      }
      return prefix + suffixes.replace(ALL_PERIODS_REGEX, '-');
    }
  });
}

function accumulateQueryParamDescriptors(_desc, accum) {
  var desc = _desc, tmp;
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
