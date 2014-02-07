require('ember-metal/core');
require('ember-metal/utils');


/**
  @module ember-metal
  */

var forEach = Ember.EnumerableUtils.forEach,
BRACE_EXPANSION = /^((?:[^\.]*\.)*)\{(.*)\}$/;

/**
  Expands `pattern`, invoking `callback` for each expansion.

  The only pattern supported is brace-expansion, anything else will be passed
  once to `callback` directly. Brace expansion can only appear at the end of a
  pattern, for example as the last item in a chain.

  Example
  ```js
  function echo(arg){ console.log(arg); }

  Ember.expandProperties('foo.bar', echo);        //=> 'foo.bar'
  Ember.expandProperties('{foo,bar}', echo);      //=> 'foo', 'bar'
  Ember.expandProperties('foo.{bar,baz}', echo);  //=> 'foo.bar', 'foo.baz'
  Ember.expandProperties('{foo,bar}.baz', echo);  //=> '{foo,bar}.baz'
  ```

  @method
  @private
  @param {string} pattern The property pattern to expand.
  @param {function} callback The callback to invoke.  It is invoked once per
  expansion, and is passed the expansion.
  */
Ember.expandProperties = function (pattern, callback) {
  var match, prefix, list;

  if (match = BRACE_EXPANSION.exec(pattern)) {
    prefix = match[1];
    list = match[2];

    forEach(list.split(','), function (suffix) {
      callback(prefix + suffix);
    });
  } else {
    callback(pattern);
  }
};
