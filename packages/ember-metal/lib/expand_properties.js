import EmberError from 'ember-metal/error';
import { forEach } from 'ember-metal/enumerable_utils';

/**
  @module ember-metal
  */

var BRACE_EXPANSION = /^((?:[^\.]*\.)*)\{(.*)\}$/;

/**
  Expands `pattern`, invoking `callback` for each expansion.

  The only pattern supported is brace-expansion, anything else will be passed
  once to `callback` directly. Brace expansion can only appear at the end of a
  pattern, for an example see the last call below.

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
export default function expandProperties(pattern, callback) {
  var match, prefix, list;

  if (pattern.indexOf(' ') > -1) {
    throw new EmberError('Brace expanded properties cannot contain spaces, ' + 
      'e.g. `user.{firstName, lastName}` should be `user.{firstName,lastName}`');
  }

  if (match = BRACE_EXPANSION.exec(pattern)) {
    prefix = match[1];
    list = match[2];

    forEach(list.split(','), function (suffix) {
        callback(prefix + suffix);
    });
  } else {
    callback(pattern);
  }
}
