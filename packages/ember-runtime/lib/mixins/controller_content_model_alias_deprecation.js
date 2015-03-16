import Ember from 'ember-metal/core'; // Ember.deprecate
import { Mixin } from 'ember-metal/mixin';

/**
  The ControllerContentModelAliasDeprecation mixin is used to provide a useful
  deprecation warning when specifying `content` directly on a `Ember.Controller`
  (without also specifying `model`).

  Ember versions prior to 1.7 used `model` as an alias of `content`, but due to
  much confusion this alias was reversed (so `content` is now an alias of `model).

  This change reduces many caveats with model/content, and also sets a
  simple ground rule: Never set a controllers content, rather always set
  its model and ember will do the right thing.


  `Ember.ControllerContentModelAliasDeprecation` is used internally by Ember in
  `Ember.Controller`.

  @class ControllerContentModelAliasDeprecation
  @namespace Ember
  @private
  @since 1.7.0
*/
export default Mixin.create({
  /**
    @private

    Moves `content` to `model`  at extend time if a `model` is not also specified.

    Note that this currently modifies the mixin themselves, which is technically
    dubious but is practically of little consequence. This may change in the
    future.

    @method willMergeMixin
    @since 1.4.0
  */
  willMergeMixin(props) {
    // Calling super is only OK here since we KNOW that
    // there is another Mixin loaded first.
    this._super(...arguments);

    var modelSpecified = !!props.model;

    if (props.content && !modelSpecified) {
      props.model = props.content;
      delete props['content'];

      Ember.deprecate('Do not specify `content` on a Controller, use `model` instead.', false);
    }
  }
});
