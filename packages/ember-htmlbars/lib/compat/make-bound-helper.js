/**
@module ember
@submodule ember-htmlbars
*/

import Helper from "ember-htmlbars/system/helper";

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
  @param {Function} function
  @param {String} dependentKeys*
  @since 1.2.0
  @deprecated
*/
export default function makeBoundHelper(fn) {
  return new Helper(function(params, hash, templates) {
    var args = params.slice();
    args.push({ hash: hash, templates: templates });
    fn.apply(undefined, args);
  });
}
