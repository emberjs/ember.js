/**
@module ember
*/

import {
  get,
  Mixin
} from 'ember-metal';
import { deprecate, Error as EmberError } from 'ember-debug';

/**
  Implements some standard methods for copying an object. Add this mixin to
  any object you create that can create a copy of itself. This mixin is
  added automatically to the built-in array.

  You should generally implement the `copy()` method to return a copy of the
  receiver.

  @class Copyable
  @namespace Ember
  @since Ember 0.9
  @private
*/
export default Mixin.create({
  /**
    __Required.__ You must implement this method to apply this mixin.

    Override to return a copy of the receiver. Default implementation raises
    an exception.

    @method copy
    @param {Boolean} deep if `true`, a deep copy of the object should be made
    @return {Object} copy of receiver
    @private
  */
  copy: null
});
