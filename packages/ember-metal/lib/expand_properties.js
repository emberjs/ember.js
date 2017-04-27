import { assert } from 'ember-debug';

/**
@module ember
@submodule ember-metal
*/

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
  @public
  @param {String} pattern The property pattern to expand.
  @param {Function} callback The callback to invoke.  It is invoked once per
  expansion, and is passed the expansion.
*/
export default function expandProperties(pattern, callback) {
  assert(`A computed property key must be a string, you passed ${typeof pattern} ${pattern}`, typeof pattern === 'string');
  assert(
    'Brace expanded properties cannot contain spaces, e.g. "user.{firstName, lastName}" should be "user.{firstName,lastName}"',
    pattern.indexOf(' ') === -1
  );

  let unbalancedNestedError = `Brace expanded properties have to be balanced and cannot be nested, pattern: ${pattern}`;
  let properties = [pattern];

  // Iterating backward over the pattern makes dealing with indices easier.
  let bookmark;
  let inside = false;
  for (let i = pattern.length; i > 0; --i) {
    let current = pattern[i - 1];

    switch (current) {
      // Closing curly brace will be the first character of the brace expansion we encounter.
      // Bookmark its index so long as we're not already inside a brace expansion.
      case '}':
        if (!inside) {
          bookmark = i - 1;
          inside = true;
        } else {
          assert(unbalancedNestedError, false);
        }
        break;
      // Opening curly brace will be the last character of the brace expansion we encounter.
      // Apply the brace expansion so long as we've already seen a closing curly brace.
      case '{':
        if (inside) {
          let expansion = pattern.slice(i, bookmark).split(',');
          // Iterating backward allows us to push new properties w/out affecting our "cursor".
          for (let j = properties.length; j > 0; --j) {
            // Extract the unexpanded property from the array.
            let property = properties.splice(j - 1, 1)[0];
            // Iterate over the expansion, pushing the newly formed properties onto the array.
            for (let k = 0; k < expansion.length; ++k) {
              properties.push(property.slice(0, i - 1) +
                              expansion[k] +
                              property.slice(bookmark + 1));
            }
          }
          inside = false;
        } else {
          assert(unbalancedNestedError, false);
        }
        break;
    }
  }
  if (inside) {
    assert(unbalancedNestedError, false);
  }

  for (let i = 0; i < properties.length; i++) {
    callback(properties[i].replace(END_WITH_EACH_REGEX, '.[]'));
  }
}
