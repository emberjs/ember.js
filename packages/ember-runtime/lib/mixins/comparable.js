require('ember-runtime/core');

/**
@module ember
@submodule ember-runtime
*/


/**
  Implements some standard methods for comparing objects. Add this mixin to
  any class you create that can compare its instances.

  You should implement the `compare()` method.

  @class Comparable
  @namespace Ember
  @extends Ember.Mixin
  @since Ember 0.9
*/
Ember.Comparable = Ember.Mixin.create( /** @scope Ember.Comparable.prototype */{

  /**
    walk like a duck. Indicates that the object can be compared.

    @property isComparable
    @type Boolean
    @default true
  */
  isComparable: true,

  /**
    Override to return the result of the comparison of the two parameters. The
    compare method should return:

    - `-1` if `a < b`
    - `0` if `a == b`
    - `1` if `a > b`

    Default implementation raises an exception.

    @method compare
    @param a {Object} the first object to compare
    @param b {Object} the second object to compare
    @return {Integer} the result of the comparison
  */
  compare: Ember.required(Function)

});

