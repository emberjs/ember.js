require('ember-metal/core');
require('ember-metal/utils');


/**
  @module ember-metal
*/

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  var forEach = Ember.EnumerableUtils.forEach,
      IS_BRACE_EXPANSION = /^\{([^.]*)\}$/;

  /**
    Expands `pattern`, invoking `callback` for each expansion.

    The only pattern supported is brace-expansion, anything else will be passed
    once to `callback` directly.  Furthermore, brace-expansion is only applied to
    the entire pattern, not to substrings.

    Example
    ```js
    function echo(arg){ console.log(arg); }

    Ember.expandProperties('foo.bar', echo);        //=> 'foo.bar'
    Ember.expandProperties('{foo,bar}', echo);      //=> 'foo', 'bar'
    Ember.expandProperties('foo.{bar,baz}', echo);  //=> 'foo.{bar,baz}'
    ```

    @method
    @private
    @param {string} pattern The property pattern to expand.
    @param {function} callback The callback to invoke.  It is invoked once per
    expansion, and is passed the expansion.
  */
  Ember.expandProperties = function (pattern, callback) {
    if (IS_BRACE_EXPANSION.test(pattern)) {
      forEach(pattern.substring(1, pattern.length-1).split(','), callback);
      return;
    }

    callback(pattern);
  };
}
