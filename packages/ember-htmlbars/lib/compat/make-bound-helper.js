import {
  readArray,
  readHash,
  isStream
} from 'ember-metal/streams/utils';

/**
@module ember
@submodule ember-htmlbars
*/

//import Helper from "ember-htmlbars/system/helper";

/**
  A helper function used by `registerBoundHelper`. Takes the
  provided Handlebars helper function fn and returns it in wrapped
  bound helper form.

  The main use case for using this outside of `registerBoundHelper`
  is for registering helpers on the container:

  ```js
  var boundHelperFn = Ember.Handlebars.makeBoundHelper(function(word) {
    return word.toUpperCase();
  });

  container.register('helper:my-bound-helper', boundHelperFn);
  ```

  In the above example, if the helper function hadn't been wrapped in
  `makeBoundHelper`, the registered helper would be unbound.

  @method makeBoundHelper
  @for Ember.Handlebars
  @param {Function} fn
  @param {String} dependentKeys*
  @since 1.2.0
  @deprecated
  @private
*/
export default function makeBoundHelper(fn, ...dependentKeys) {
  return {
    _dependentKeys: dependentKeys,

    isHandlebarsCompat: true,
    isHTMLBars: true,

    helperFunction(params, hash, templates) {
      Ember.assert('registerBoundHelper-generated helpers do not support use with Handlebars blocks.', !templates.template.yield);

      var args = readArray(params);
      var properties = new Array(params.length);

      for (var i = 0, l = params.length; i < l; i++) {
        var param = params[i];

        if (isStream(param)) {
          properties[i] = param.label;
        } else {
          properties[i] = param;
        }
      }

      args.push({ hash: readHash(hash) , templates, data: { properties } });
      return fn.apply(undefined, args);
    }
  };
}
