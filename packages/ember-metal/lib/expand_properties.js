import { assert } from 'ember-metal/debug';

/**
@module ember
@submodule ember-metal
*/

var SPLIT_REGEX = /\{|\}/;
var END_WITH_EACH_REGEX = /\.@each$/;

/**
  Expands `pattern`, invoking `callback` for each expansion.

  The only pattern supported is brace-expansion, anything else will be passed
  once to `callback` directly.

  Example

  ```js
  function echo(arg){ console.log(arg); }

  Ember.expandProperties('foo.bar', echo);              //=> 'foo.bar'
  Ember.expandProperties('{foo,bar}', echo);            //=> 'foo', 'bar'
  Ember.expandProperties('foo.{bar,baz}', echo);        //=> 'foo.bar', 'foo.baz'
  Ember.expandProperties('{foo,bar}.baz', echo);        //=> 'foo.baz', 'bar.baz'
  Ember.expandProperties('foo.{bar,baz}.[]', echo)      //=> 'foo.bar.[]', 'foo.baz.[]'
  Ember.expandProperties('{foo,bar}.{spam,eggs}', echo) //=> 'foo.spam', 'foo.eggs', 'bar.spam', 'bar.eggs'
  Ember.expandProperties('{foo}.bar.{baz}')             //=> 'foo.bar.baz'
  ```

  @method expandProperties
  @for Ember
  @private
  @param {String} pattern The property pattern to expand.
  @param {Function} callback The callback to invoke.  It is invoked once per
  expansion, and is passed the expansion.
*/
export default function expandProperties(pattern, callback) {
  assert('A computed property key must be a string', typeof pattern === 'string');
  assert(
    'Dependent keys passed to Ember.computed.or() cannot contain spaces,' +
      ' e.g. Ember.computed.or("foo bar", "baz") should be Ember.computed.or("foobar", "baz")',
    pattern.indexOf(' ') === -1
  );

  var parts = pattern.split(SPLIT_REGEX);
  var properties = [parts];

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    if (part.indexOf(',') >= 0) {
      properties = duplicateAndReplace(properties, part.split(','), i);
    }
  }

  for (let i = 0; i < properties.length; i++) {
    callback(properties[i].join('').replace(END_WITH_EACH_REGEX, '.[]'));
  }
}

function duplicateAndReplace(properties, currentParts, index) {
  var all = [];

  properties.forEach((property) => {
    currentParts.forEach((part) => {
      var current = property.slice(0);
      current[index] = part;
      all.push(current);
    });
  });

  return all;
}
